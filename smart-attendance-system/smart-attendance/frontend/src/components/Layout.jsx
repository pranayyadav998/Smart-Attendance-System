import { NavLink, Outlet, useNavigate } from "react-router-dom";

const links = [
  ["/", "Dashboard"],
  ["/students", "Students"],
  ["/mark-attendance", "Mark Attendance"],
  ["/records", "Records"],
  ["/reports", "Reports"],
];

export default function Layout() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const logout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <div className="container">
      <header className="top">
        <h1>AI-Based Smart Attendance System</h1>
        <span>
          {user && user.email} <button className="link" onClick={logout}>Logout</button>
        </span>
      </header>
      <nav>
        {links.map(([to, label]) => (
          <NavLink key={to} to={to} end={to === "/"}>{label}</NavLink>
        ))}
      </nav>
      <main><Outlet /></main>
    </div>
  );
}
