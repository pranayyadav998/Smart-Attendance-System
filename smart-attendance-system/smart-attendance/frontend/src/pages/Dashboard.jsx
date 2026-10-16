import { useEffect, useState } from "react";
import { getDashboardStats } from "../services/api.js";
import Message from "../components/Message.jsx";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getDashboardStats().then(setStats).catch((err) => setError(err.message));
  }, []);

  return (
    <>
      <h2>Dashboard</h2>
      <Message type="error">{error}</Message>
      {!stats && !error && <p>Loading...</p>}
      {stats && (
        <>
          <table className="summary">
            <tbody>
              <tr><td>Total registered students</td><td>{stats.totalStudents}</td></tr>
              <tr><td>Total attendance sessions</td><td>{stats.totalSessions}</td></tr>
              <tr><td>Students present today</td><td>{stats.presentToday}</td></tr>
            </tbody>
          </table>

          <h3>Recent attendance activity</h3>
          {stats.recent.length === 0 ? <p>No attendance has been recorded yet.</p> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Date</th><th>Time</th><th>Student ID</th><th>Name</th><th>Status</th></tr></thead>
                <tbody>
                  {stats.recent.map((r) => (
                    <tr key={r._id}>
                      <td>{r.date}</td><td>{r.time}</td>
                      <td>{r.student.studentId}</td><td>{r.student.name}</td><td>{r.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}
