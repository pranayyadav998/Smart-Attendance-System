const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true, unique: true, trim: true, uppercase: true, maxlength: 30 },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    classSection: { type: String, required: true, trim: true, maxlength: 30 },
    faceRegistered: { type: Boolean, default: false },
    // 128-number face encoding from the Python service. Not the photo itself.
    // select:false means it is never returned unless a query asks for it with "+faceEncoding".
    faceEncoding: { type: [Number], select: false, default: undefined },
  },
  { timestamps: true } // createdAt is the registration date
);

// Extra safety: never include the encoding in JSON sent to the frontend.
studentSchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.faceEncoding;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("Student", studentSchema);
