// The only file that talks to the Python face-recognition service.
const { ApiError } = require("../middleware/errorHandler");

const baseUrl = () => (process.env.FACE_SERVICE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
const timeoutMs = () => Number(process.env.FACE_SERVICE_TIMEOUT_MS) || 60000;

async function callService(path, form) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs());
  let response;
  let data = null;
  try {
    response = await fetch(baseUrl() + path, { method: "POST", body: form, signal: controller.signal });
    data = await response.json().catch(() => null);
  } catch (err) {
    throw new ApiError(
      503,
      err.name === "AbortError"
        ? "The face recognition service took too long to respond."
        : "The face recognition service is unavailable. Make sure it is running."
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    // 422 means the Python service rejected the image (unreadable, no face, ...). Its message is user-safe.
    if (response.status === 422) throw new ApiError(422, (data && data.message) || "The image could not be processed.");
    throw new ApiError(502, "The face recognition service returned an error.");
  }
  return data;
}

function imageForm(buffer, mimetype) {
  const form = new FormData();
  form.append("image", new Blob([buffer], { type: mimetype }), "upload");
  return form;
}

const badResponse = () => new ApiError(502, "The face recognition service returned an invalid response.");
const isNumberList = (v, length) => Array.isArray(v) && v.length === length && v.every((n) => typeof n === "number" && Number.isFinite(n));

// Student photo -> 128-number face encoding
async function encodeFace(buffer, mimetype) {
  const data = await callService("/encode", imageForm(buffer, mimetype));
  if (!data || !isNumberList(data.encoding, 128)) throw badResponse();
  return data.encoding;
}

// Classroom photo + known encodings [{ id, encoding }] -> detection / recognition result
async function recognizeFaces(buffer, mimetype, known) {
  const form = imageForm(buffer, mimetype);
  form.append("known", JSON.stringify(known));
  const data = await callService("/recognize", form);

  const knownIds = new Set(known.map((k) => k.id));
  const valid =
    data &&
    Number.isInteger(data.facesDetected) &&
    Number.isInteger(data.unknownFaces) &&
    Array.isArray(data.errors) &&
    data.errors.every((e) => typeof e === "string") &&
    Array.isArray(data.recognized) &&
    data.recognized.every((r) => knownIds.has(r.id) && typeof r.distance === "number");
  if (!valid) throw badResponse();
  return data;
}

async function isAvailable() {
  try {
    const response = await fetch(baseUrl() + "/health", { signal: AbortSignal.timeout(3000) });
    return response.ok;
  } catch {
    return false;
  }
}

module.exports = { encodeFace, recognizeFaces, isAvailable };
