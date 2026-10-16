// Minimal login for a single admin account (credentials come from .env).
// Tokens are "payload.signature" where the signature is an HMAC of the payload.
const crypto = require("crypto");

const sign = (data) => crypto.createHmac("sha256", process.env.AUTH_SECRET).update(data).digest("base64url");

function createToken(email) {
  const payload = Buffer.from(JSON.stringify({ email, exp: Date.now() + 8 * 60 * 60 * 1000 })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function requireAuth(req, res, next) {
  const fail = () => res.status(401).json({ message: "Please log in to continue." });
  const header = req.headers.authorization || "";
  const [payload, signature] = (header.startsWith("Bearer ") ? header.slice(7) : "").split(".");
  if (!payload || !signature) return fail();

  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return fail();

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (data.exp < Date.now()) return fail();
    req.user = { email: data.email };
    next();
  } catch {
    fail();
  }
}

module.exports = { createToken, requireAuth };
