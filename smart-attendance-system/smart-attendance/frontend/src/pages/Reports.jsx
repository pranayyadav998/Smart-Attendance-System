import { useEffect, useState } from "react";
import { getReport, getStudents } from "../services/api.js";
import Message from "../components/Message.jsx";

function downloadCsv(rows) {
  const header = ["Student ID", "Name", "Class/Section", "Total Sessions", "Present", "Absent", "Percentage"];
  const lines = rows.map((r) =>
    [r.studentId, r.name, r.classSection, r.total, r.present, r.absent, r.percentage]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
  );
  const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "attendance-report.csv";
  link.click();
  URL.revokeObjectURL(link.href);
}

export default function Reports() {
  const [students, setStudents] = useState([]);
  const [filters, setFilters] = useState({ from: "", to: "", student: "" });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = (activeFilters) => {
    setLoading(true); setError("");
    getReport(activeFilters)
      .then(setRows)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    getStudents().then(setStudents).catch((err) => setError(err.message));
    load({});
  }, []);

  const change = (e) => setFilters({ ...filters, [e.target.name]: e.target.value });

  const generate = () => {
    if (filters.from && filters.to && filters.from > filters.to) return setError("'From' date must be before 'To' date.");
    load(filters);
  };

  return (
    <>
      <h2>Attendance Reports</h2>
      <div className="box">
        <div className="fields">
          <label>From<input type="date" name="from" value={filters.from} onChange={change} /></label>
          <label>To<input type="date" name="to" value={filters.to} onChange={change} /></label>
          <label>Student
            <select name="student" value={filters.student} onChange={change}>
              <option value="">All students</option>
              {students.map((s) => <option key={s._id} value={s._id}>{s.studentId} - {s.name}</option>)}
            </select>
          </label>
        </div>
        <button onClick={generate}>Generate report</button>
        <button className="secondary" onClick={() => downloadCsv(rows)} disabled={rows.length === 0}>Export CSV</button>
      </div>

      <Message type="error">{error}</Message>
      {loading ? <p>Loading...</p> : rows.length === 0 ? <p>No data for the selected filters.</p> : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Student ID</th><th>Name</th><th>Class / Section</th><th>Total sessions</th><th>Present</th><th>Absent</th><th>Attendance %</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id}>
                  <td>{r.studentId}</td><td>{r.name}</td><td>{r.classSection}</td>
                  <td>{r.total}</td><td>{r.present}</td><td>{r.absent}</td><td>{r.percentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
