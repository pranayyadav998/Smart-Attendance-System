// All backend calls live here. Pages never call fetch directly.
// See README.md for the request/response format each endpoint is expected to use.

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function request(path, { method = "GET", body, params } = {}) {
  const headers = {};
  const token = localStorage.getItem("token");
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload = body;
  if (body && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  let url = BASE_URL + path;
  if (params) {
    const query = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    if (query) url += "?" + query;
  }

  let response;
  try {
    response = await fetch(url, { method, headers, body: payload });
  } catch {
    throw new Error(`Cannot reach the server at ${BASE_URL}. Check that the backend is running.`);
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && token) {
      localStorage.clear();
      window.location.href = "/login";
    }
    throw new Error((data && data.message) || `Request failed (status ${response.status}).`);
  }
  return data;
}

const imageForm = (file) => {
  const form = new FormData();
  form.append("image", file);
  return form;
};

// Auth
export const login = (email, password) => request("/auth/login", { method: "POST", body: { email, password } });

// Students
export const getStudents = () => request("/students");
export const createStudent = (student) => request("/students", { method: "POST", body: student });
export const updateStudent = (id, student) => request(`/students/${id}`, { method: "PUT", body: student });
export const deleteStudent = (id) => request(`/students/${id}`, { method: "DELETE" });
export const uploadFace = (id, file) => request(`/students/${id}/face`, { method: "POST", body: imageForm(file) });

// Attendance
export const recognizeFaces = (file, classSection) => {
  const form = imageForm(file);
  if (classSection) form.append("classSection", classSection);
  return request("/attendance/process", { method: "POST", body: form });
};
export const saveAttendance = (data) => request("/attendance/confirm", { method: "POST", body: data });
export const getAttendance = (filters = {}) => request("/attendance", { params: filters });
export const getReport = (filters = {}) => request("/attendance/reports", { params: filters });
export const getDashboardStats = () => request("/dashboard/stats");
