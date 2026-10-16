const Student = require("../models/Student");
const Attendance = require("../models/Attendance");
const faceService = require("../services/faceService");
const { isObjectId } = require("../middleware/validate");
const { ApiError, asyncHandler } = require("../middleware/errorHandler");

const isDate = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
const text = (v) => (typeof v === "string" ? v.trim() : ""); // ignores arrays/objects (blocks query injection)
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const classSectionRegex = (value) => new RegExp(`^${escapeRegex(value)}$`, "i");
const todayString = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in server local time

// Step 1: classroom photo -> recognition result. Nothing is saved here.
exports.processImage = asyncHandler(async (req, res) => {
  const filter = { faceRegistered: true };
  const classSection = text(req.body && req.body.classSection);
  if (classSection) filter.classSection = classSectionRegex(classSection);

  const students = await Student.find(filter).select("+faceEncoding");
  if (students.length === 0) {
    throw new ApiError(400, "No students with registered face data were found. Register student faces first.");
  }

  const known = students.map((s) => ({ id: String(s._id), encoding: s.faceEncoding }));
  const result = await faceService.recognizeFaces(req.file.buffer, req.file.mimetype, known);

  const byId = new Map(students.map((s) => [String(s._id), s]));
  res.json({
    totalFaces: result.facesDetected,
    unknownFaces: result.unknownFaces,
    recognized: result.recognized.map((r) => ({
      student: r.id,
      studentId: byId.get(r.id).studentId,
      name: byId.get(r.id).name,
      distance: r.distance, // lower = closer match
    })),
    errors: result.errors,
  });
});

// Step 2: the user has reviewed the result; save it.
exports.confirmAttendance = asyncHandler(async (req, res) => {
  const { date, records } = req.body || {};
  if (!isDate(date)) throw new ApiError(400, "A valid date (YYYY-MM-DD) is required.");
  if (date > todayString()) throw new ApiError(400, "Attendance cannot be saved for a future date.");
  if (!Array.isArray(records) || records.length === 0 || records.length > 2000) {
    throw new ApiError(400, "records must be a list of 1 to 2000 entries.");
  }

  const seen = new Set();
  for (const r of records) {
    if (!r || !isObjectId(r.student)) throw new ApiError(400, "Each record needs a valid student id.");
    if (!["Present", "Absent"].includes(r.status)) throw new ApiError(400, "Status must be Present or Absent.");
    if (seen.has(r.student)) throw new ApiError(400, "A student appears more than once in the list.");
    seen.add(r.student);
  }

  const students = await Student.find({ _id: { $in: [...seen] } }).select("classSection");
  if (students.length !== seen.size) throw new ApiError(400, "One or more students do not exist.");
  const classOf = new Map(students.map((s) => [String(s._id), s.classSection]));

  const time = new Date().toTimeString().slice(0, 8);
  // $setOnInsert + upsert: a student who already has a record for this date is left unchanged.
  const result = await Attendance.bulkWrite(
    records.map((r) => ({
      updateOne: {
        filter: { student: r.student, date },
        update: {
          $setOnInsert: {
            student: r.student,
            date,
            time,
            status: r.status,
            classSection: classOf.get(r.student),
            source: r.source === "face-recognition" ? "face-recognition" : "manual",
          },
        },
        upsert: true,
      },
    })),
    { ordered: false }
  );

  const saved = result.upsertedCount;
  const skipped = records.length - saved;
  if (saved === 0) throw new ApiError(409, "Attendance for this date was already saved for all of these students.");
  res.status(201).json({
    message: skipped
      ? `Saved ${saved} record(s). ${skipped} student(s) already had attendance for this date and were not changed.`
      : `Attendance saved for ${saved} student(s).`,
    saved,
    skipped,
  });
});

function buildFilter(query) {
  const filter = {};
  const date = text(query.date), from = text(query.from), to = text(query.to), student = text(query.student);
  const classSection = text(query.classSection);

  if (date) {
    if (!isDate(date)) throw new ApiError(400, "Invalid date.");
    filter.date = date;
  } else if (from || to) {
    filter.date = {};
    if (from) { if (!isDate(from)) throw new ApiError(400, "Invalid 'from' date."); filter.date.$gte = from; }
    if (to) { if (!isDate(to)) throw new ApiError(400, "Invalid 'to' date."); filter.date.$lte = to; }
  }
  if (student) {
    if (!isObjectId(student)) throw new ApiError(400, "Invalid student id.");
    filter.student = new (require("mongoose").Types.ObjectId)(student);
  }
  if (classSection) filter.classSection = classSectionRegex(classSection);
  return filter;
}

exports.getAttendance = asyncHandler(async (req, res) => {
  const records = await Attendance.find(buildFilter(req.query))
    .sort({ date: -1, time: -1 })
    .limit(5000)
    .populate("student", "studentId name classSection");
  res.json(records);
});

exports.getAttendanceById = asyncHandler(async (req, res) => {
  const record = await Attendance.findById(req.params.id).populate("student", "studentId name classSection");
  if (!record) throw new ApiError(404, "Attendance record not found.");
  res.json(record);
});

// One row per student: total sessions, present, absent, percentage.
exports.getReport = asyncHandler(async (req, res) => {
  const rows = await Attendance.aggregate([
    { $match: buildFilter(req.query) },
    { $group: { _id: "$student", total: { $sum: 1 }, present: { $sum: { $cond: [{ $eq: ["$status", "Present"] }, 1, 0] } } } },
    { $lookup: { from: Student.collection.name, localField: "_id", foreignField: "_id", as: "s" } },
    { $unwind: "$s" },
    {
      $project: {
        studentId: "$s.studentId",
        name: "$s.name",
        classSection: "$s.classSection",
        total: 1,
        present: 1,
        absent: { $subtract: ["$total", "$present"] },
        percentage: { $round: [{ $multiply: [{ $divide: ["$present", "$total"] }, 100] }, 1] },
      },
    },
    { $sort: { studentId: 1 } },
  ]);
  res.json(rows);
});
