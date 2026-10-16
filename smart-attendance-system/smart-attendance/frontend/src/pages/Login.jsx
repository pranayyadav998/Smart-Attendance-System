import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../services/api.js";
import Message from "../components/Message.jsx";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setError("Enter a valid email address.");
    if (form.password.length < 6) return setError("Password must be at least 6 characters.");
    setError("");
    setLoading(true);
    try {
      const data = await login(form.email, form.password);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user || { email: form.email }));
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login">
      <h1>AI-Based Smart Attendance System</h1>
      <h2>Login</h2>
      <form onSubmit={submit} noValidate>
        <label>Email
          <input type="email" name="email" value={form.email} onChange={change} />
        </label>
        <label>Password
          <input type="password" name="password" value={form.password} onChange={change} />
        </label>
        <Message type="error">{error}</Message>
        <button type="submit" disabled={loading}>{loading ? "Logging in..." : "Login"}</button>
      </form>
    </div>
  );
}
