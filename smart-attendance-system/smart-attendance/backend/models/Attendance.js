const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ }, // YYYY-MM-DD
    time: { type: String, required: true }, // HH:MM:SS, when the attendance was confirmed
    status: { type: String, enum: ["Present", "Absent"], required: true },
    classSection: { type: String, required: true, trim: true }, // copied from the student at save time
    source: { type: String, enum: ["face-recognition", "manual"], default: "manual" },
  },
  { timestamps: true }
);

// One record per student per day: this is what prevents duplicate attendance.
attendanceSchema.index({ student: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1, classSection: 1 });

module.exports = mongoose.model("Attendance", attendanceSchema);
