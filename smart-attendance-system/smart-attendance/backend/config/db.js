const mongoose = require("mongoose");

async function connectDB() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set in .env");
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  console.log("MongoDB connected");
}

module.exports = connectDB;
