const Student = require("../models/Student");
const Attendance = require("../models/Attendance");
const faceService = require("../services/faceService");
const { ApiError, asyncHandler } = require("../middleware/errorHandler");

const duplicateMessage = "A student with this Student ID already exists.";
const withDuplicateCheck = (err) => (err.code === 11000 ? new ApiError(409, duplicateMessage) : err);

exports.getStudents = asyncHandler(async (req, res) => {
  const filter = {};
  if (typeof req.query.classSection === "string" && req.query.classSection.trim()) {
    filter.classSection = req.query.classSection.trim();
  }
  res.json(await Student.find(filter).sort({ studentId: 1 }));
});

exports.getStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) throw new ApiError(404, "Student not found.");
  res.json(student);
});

exports.createStudent = asyncHandler(async (req, res) => {
  try {
    res.status(201).json(await Student.create(req.body));
  } catch (err) {
    throw withDuplicateCheck(err);
  }
});

exports.updateStudent = asyncHandler(async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!student) throw new ApiError(404, "Student not found.");
    res.json(student);
  } catch (err) {
    throw withDuplicateCheck(err);
  }
});

exports.deleteStudent = asyncHandler(async (req, res) => {
  const student = await Student.findByIdAndDelete(req.params.id);
  if (!student) throw new ApiError(404, "Student not found.");
  await Attendance.deleteMany({ student: student._id }); // no orphan attendance records
  res.json({ message: "Student deleted." });
});

// Register or replace the student's face: the Python service returns an encoding, which is stored.
// The photo itself is not saved.
exports.uploadFace = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) throw new ApiError(404, "Student not found.");

  const encoding = await faceService.encodeFace(req.file.buffer, req.file.mimetype);
  await Student.updateOne({ _id: student._id }, { faceEncoding: encoding, faceRegistered: true });
  res.json({ message: "Face registered." });
});
