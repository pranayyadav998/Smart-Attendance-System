// Errors we throw on purpose, with a status code and a message that is safe to show to the user.
class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Lets async controllers throw errors without try/catch in every function (Express 4).
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const notFound = (req, res) => res.status(404).json({ message: "Route not found." });

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) return res.status(err.status).json({ message: err.message });

  if (err.name === "MulterError") {
    const tooBig = err.code === "LIMIT_FILE_SIZE";
    return res.status(tooBig ? 413 : 400).json({
      message: tooBig ? `Image is too large. Maximum size is ${process.env.MAX_IMAGE_MB || 10} MB.` : "Invalid file upload.",
    });
  }
  if (err.type === "entity.parse.failed") return res.status(400).json({ message: "Request body is not valid JSON." });
  if (err.name === "ValidationError") return res.status(400).json({ message: Object.values(err.errors)[0].message });
  if (err.name === "CastError") return res.status(400).json({ message: "Invalid value in request." });
  if (err.code === 11000) return res.status(409).json({ message: "A record with this value already exists." });

  // Unknown error: log only the message (no stack, no request data) and send a generic reply.
  console.error("Unexpected error:", err.message);
  res.status(500).json({ message: "Something went wrong on the server." });
}

module.exports = { ApiError, asyncHandler, notFound, errorHandler };
