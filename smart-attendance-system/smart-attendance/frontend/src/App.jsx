import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Students from "./pages/Students.jsx";
import MarkAttendance from "./pages/MarkAttendance.jsx";
import Records from "./pages/Records.jsx";
import Reports from "./pages/Reports.jsx";

function RequireLogin({ children }) {
  return localStorage.getItem("token") ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireLogin><Layout /></RequireLogin>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/students" element={<Students />} />
        <Route path="/mark-attendance" element={<MarkAttendance />} />
        <Route path="/records" element={<Records />} />
        <Route path="/reports" element={<Reports />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
