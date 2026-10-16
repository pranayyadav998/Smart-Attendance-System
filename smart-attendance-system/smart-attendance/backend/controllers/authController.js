const crypto = require("crypto");
const { ApiError, asyncHandler } = require("../middleware/errorHandler");
const { createToken } = require("../middleware/auth");

// Compare through a hash so both values have the same length and timing does not leak the length.
const same = (a, b) =>
  crypto.timingSafeEqual(crypto.createHash("sha256").update(String(a)).digest(), crypto.createHash("sha256").update(String(b)).digest());

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== "string" || typeof password !== "string") throw new ApiError(400, "Email and password are required.");

  const emailOk = same(email.trim().toLowerCase(), process.env.ADMIN_EMAIL.toLowerCase());
  const passwordOk = same(password, process.env.ADMIN_PASSWORD);
  if (!emailOk || !passwordOk) throw new ApiError(401, "Incorrect email or password.");

  res.json({ token: createToken(process.env.ADMIN_EMAIL), user: { email: process.env.ADMIN_EMAIL } });
});
