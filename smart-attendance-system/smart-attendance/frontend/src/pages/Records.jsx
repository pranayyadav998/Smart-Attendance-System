import { useEffect, useState } from "react";
import { getAttendance, getStudents } from "../services/api.js";
import Message from "../components/Message.jsx";

const emptyFilters = { date: "", student: "", classSection: "" };

export default function Records() {
  const [students, setStudents] = useState([]);
  const [filters, setFilters] = useState(emptyFilters);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = (activeFilters) => {
    setLoading(true); setError("");
    getAttendance(activeFilters)
      .then(setRecords)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    getStudents().then(setStudents).catch((err) => setError(err.message));
    load(emptyFilters);
  }, []);

  const change = (e) => setFilters({ ...filters, [e.target.name]: e.target.value });
  const clear = () => { setFilters(emptyFilters); load(emptyFilters); };

  return (
    <>
      <h2>Attendance Records</h2>
      <div className="box">
        <div className="fields">
          <label>Date<input type="date" name="date" value={filters.date} onChange={change} /></label>
          <label>Student
            <select name="student" value={filters.student} onChange={change}>
              <option value="">All students</option>
              {students.map((s) => <option key={s._id} value={s._id}>{s.studentId} - {s.name}</option>)}
            </select>
          </label>
          <label>Class / Section<input name="classSection" value={filters.classSection} onChange={change} /></label>
        </div>
        <button onClick={() => load(filters)}>Apply filters</button>
        <button className="secondary" onClick={clear}>Clear</button>
        <p className="hint">To view one student's attendance history, select the student and leave the date empty.</p>
      </div>

      <Message type="error">{error}</Message>
      {loading ? <p>Loading...</p> : records.length === 0 ? <p>No attendance records found.</p> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Student ID</th><th>Name</th><th>Class / Section</th><th>Date</th><th>Time</th><th>Status</th></tr></thead>
            <tbody>
              {records.map((r) => (
                <tr key={r._id}>
                  <td>{r.student.studentId}</td><td>{r.student.name}</td><td>{r.student.classSection}</td>
                  <td>{r.date.slice(0, 10)}</td><td>{r.time}</td><td>{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
