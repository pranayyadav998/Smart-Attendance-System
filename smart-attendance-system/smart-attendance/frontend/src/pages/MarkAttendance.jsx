import { useEffect, useState } from "react";
import { getStudents, recognizeFaces, saveAttendance } from "../services/api.js";
import Message from "../components/Message.jsx";

export default function MarkAttendance() {
  const [students, setStudents] = useState([]);
  const [classSection, setClassSection] = useState("");
  const [date, setDate] = useState(new Date().toLocaleDateString("en-CA"));
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [status, setStatus] = useState("idle"); // idle | processing | done | saving | saved
  const [result, setResult] = useState(null); // { totalFaces, unknownFaces, errors }
  const [marks, setMarks] = useState({}); // { studentMongoId: "Present" | "Absent" }
  const [error, setError] = useState("");
  const [recognizedIds, setRecognizedIds] = useState(new Set()); // what the system suggested
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    getStudents().then(setStudents).catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!file) return setPreview("");
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const classStudents = students.filter(
    (s) => !classSection.trim() || s.classSection.toLowerCase() === classSection.trim().toLowerCase()
  );

  const chooseFile = (e) => {
    setFile(e.target.files[0] || null);
    setResult(null); setMarks({}); setStatus("idle"); setError("");
  };

  const process = async () => {
    setError(""); setStatus("processing");
    try {
      // Response: { totalFaces, unknownFaces, recognized: [{ student, studentId, name, distance }], errors: [] }
      const data = await recognizeFaces(file, classSection.trim());
      const ids = new Set((data.recognized || []).map((r) => r.student));
      const nextMarks = {};
      classStudents.forEach((s) => { nextMarks[s._id] = ids.has(s._id) ? "Present" : "Absent"; });
      setRecognizedIds(ids);
      setMarks(nextMarks);
      setResult({ totalFaces: data.totalFaces, unknownFaces: data.unknownFaces || 0, errors: data.errors || [] });
      setStatus("done");
    } catch (err) {
      setError(err.message);
      setStatus("idle");
    }
  };

  const save = async () => {
    setError(""); setStatus("saving");
    try {
      const data = await saveAttendance({
        date,
        // "face-recognition" if the reviewer kept the system's suggestion, "manual" if they changed it
        records: classStudents.map((s) => {
          const suggested = recognizedIds.has(s._id) ? "Present" : "Absent";
          const finalStatus = marks[s._id] || "Absent";
          return { student: s._id, status: finalStatus, source: finalStatus === suggested ? "face-recognition" : "manual" };
        }),
      });
      setSavedMessage(data.message);
      setStatus("saved");
    } catch (err) {
      setError(err.message);
      setStatus("done");
    }
  };

  const presentCount = Object.values(marks).filter((m) => m === "Present").length;

  return (
    <>
      <h2>Mark Attendance</h2>

      <div className="box">
        <div className="fields">
          <label>Class / Section (leave empty for all students)
            <input value={classSection} onChange={(e) => setClassSection(e.target.value)} />
          </label>
          <label>Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
          <label>Group / classroom photo<input type="file" accept="image/*" onChange={chooseFile} /></label>
        </div>
        {preview && <img className="preview" src={preview} alt="Uploaded classroom" />}
        <button onClick={process} disabled={!file || status === "processing" || status === "saving"}>
          {status === "processing" ? "Processing..." : "Recognize Students"}
        </button>
        {status === "processing" && <p>Detecting and recognizing faces. This may take a few moments.</p>}
        <Message type="error">{error}</Message>
      </div>

      {result && (
        <>
          <h3>Recognition result</h3>
          <p>
            Faces detected: {result.totalFaces ?? "-"} | Recognized students: {presentCount} of {classStudents.length} |
            Unknown faces: {result.unknownFaces}
          </p>
          {result.errors.length > 0 && (
            <Message type="error">Recognition errors: {result.errors.join("; ")}</Message>
          )}
          {classStudents.length === 0 ? <p>No students found for this class/section.</p> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Student ID</th><th>Name</th><th>Class / Section</th><th>Status</th></tr></thead>
                <tbody>
                  {classStudents.map((s) => (
                    <tr key={s._id}>
                      <td>{s.studentId}</td><td>{s.name}</td><td>{s.classSection}</td>
                      <td>
                        <select value={marks[s._id]} disabled={status === "saved"}
                          onChange={(e) => setMarks({ ...marks, [s._id]: e.target.value })}>
                          <option>Present</option>
                          <option>Absent</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {classStudents.some((s) => !s.faceRegistered) && (
            <p className="hint">
              {classStudents.filter((s) => !s.faceRegistered).length} student(s) have no face data and cannot be
              recognized. Set their status manually.
            </p>
          )}
          <p className="hint">Review the result and correct any status before saving. Nothing is saved until you confirm.</p>
          {status === "saved"
            ? <Message type="success">{savedMessage}</Message>
            : <button onClick={save} disabled={status === "saving" || classStudents.length === 0}>
                {status === "saving" ? "Saving..." : "Save Attendance"}
              </button>}
        </>
      )}
    </>
  );
}
