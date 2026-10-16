import { useEffect, useState } from "react";
import { createStudent, deleteStudent, getStudents, updateStudent, uploadFace } from "../services/api.js";
import Message from "../components/Message.jsx";

const emptyForm = { studentId: "", name: "", classSection: "" };

export default function Students() {
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [faceFile, setFaceFile] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = () =>
    getStudents()
      .then(setStudents)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const reset = () => {
    setForm(emptyForm);
    setFaceFile(null);
    setEditingId(null);
    document.getElementById("face-input").value = "";
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!form.studentId.trim() || !form.name.trim() || !form.classSection.trim()) {
      return setError("Student ID, name and class/section are required.");
    }
    if (!editingId && !faceFile) return setError("Select a face image for the new student.");

    setSaving(true);
    try {
      const saved = editingId ? await updateStudent(editingId, form) : await createStudent(form);
      if (faceFile) {
        try {
          await uploadFace(saved._id || editingId, faceFile);
        } catch (err) {
          setError(`Student saved, but the face image was rejected: ${err.message} Edit the student to upload another image.`);
          reset();
          await load();
          return;
        }
      }
      setSuccess(editingId ? "Student updated." : "Student registered.");
      reset();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const edit = (student) => {
    setEditingId(student._id);
    setForm({ studentId: student.studentId, name: student.name, classSection: student.classSection });
    setSuccess(""); setError("");
    window.scrollTo(0, 0);
  };

  const remove = async (student) => {
    if (!window.confirm(`Delete ${student.name}?`)) return;
    setError(""); setSuccess("");
    try {
      await deleteStudent(student._id);
      setSuccess("Student deleted.");
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <h2>Student Management</h2>

      <form onSubmit={submit} className="box" noValidate>
        <h3>{editingId ? "Edit student" : "Register student"}</h3>
        <div className="fields">
          <label>Student ID<input name="studentId" value={form.studentId} onChange={change} /></label>
          <label>Name<input name="name" value={form.name} onChange={change} /></label>
          <label>Class / Section<input name="classSection" value={form.classSection} onChange={change} /></label>
          <label>Face image {editingId && "(optional, replaces the old one)"}
            <input id="face-input" type="file" accept="image/*" onChange={(e) => setFaceFile(e.target.files[0] || null)} />
          </label>
        </div>
        <p className="hint">Use a clear, front-facing photo showing only this student.</p>
        <Message type="error">{error}</Message>
        <Message type="success">{success}</Message>
        <button type="submit" disabled={saving}>{saving ? "Saving..." : editingId ? "Update" : "Register"}</button>
        {editingId && <button type="button" className="secondary" onClick={reset}>Cancel</button>}
      </form>

      <h3>Registered students</h3>
      {loading ? <p>Loading...</p> : students.length === 0 ? <p>No students registered yet.</p> : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Student ID</th><th>Name</th><th>Class / Section</th><th>Face</th><th>Registered on</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s._id}>
                  <td>{s.studentId}</td><td>{s.name}</td><td>{s.classSection}</td>
                  <td>{s.faceRegistered ? "Yes" : "No"}</td>
                  <td>{s.createdAt ? s.createdAt.slice(0, 10) : "-"}</td>
                  <td>
                    <button className="link" onClick={() => edit(s)}>Edit</button>{" "}
                    <button className="link" onClick={() => remove(s)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
