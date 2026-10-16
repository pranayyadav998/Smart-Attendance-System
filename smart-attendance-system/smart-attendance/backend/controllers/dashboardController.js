const Student = require("../models/Student");
const Attendance = require("../models/Attendance");
const { asyncHandler } = require("../middleware/errorHandler");

// Every number here is calculated from the database.
exports.getStats = asyncHandler(async (req, res) => {
  const today = new Date().toLocaleDateString("en-CA");

  const [totalStudents, sessions, presentToday, recent] = await Promise.all([
    Student.countDocuments(),
    // A session = one date + one class/section
    Attendance.aggregate([{ $group: { _id: { date: "$date", classSection: "$classSection" } } }, { $count: "total" }]),
    Attendance.countDocuments({ date: today, status: "Present" }),
    Attendance.find().sort({ createdAt: -1 }).limit(5).populate("student", "studentId name classSection"),
  ]);

  res.json({ totalStudents, totalSessions: sessions.length ? sessions[0].total : 0, presentToday, recent });
});
