require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const faceService = require("./services/faceService");
const { requireAuth } = require("./middleware/auth");
const { notFound, errorHandler } = require("./middleware/errorHandler");

for (const name of ["MONGODB_URI", "ADMIN_EMAIL", "ADMIN_PASSWORD", "AUTH_SECRET"]) {
  if (!process.env[name]) {
    console.error(`Missing ${name}. Copy .env.example to .env and fill it in.`);
    process.exit(1);
  }
}

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit: "200kb" }));

// Public routes
app.use("/api/auth", require("./routes/authRoutes"));
app.get("/api/health", async (req, res) => {
  res.json({
    backend: "ok",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    faceService: (await faceService.isAvailable()) ? "available" : "unavailable",
  });
});

// Everything below requires login
app.use("/api/students", requireAuth, require("./routes/studentRoutes"));
app.use("/api/attendance", requireAuth, require("./routes/attendanceRoutes"));
app.use("/api/dashboard", requireAuth, require("./routes/dashboardRoutes"));

app.use(notFound);
app.use(errorHandler);

connectDB()
  .then(() => {
    const port = process.env.PORT || 5000;
    app.listen(port, () => console.log(`Backend running on http://localhost:${port}`));
  })
  .catch((err) => {
    console.error("Could not connect to MongoDB:", err.message);
    process.exit(1);
  });
