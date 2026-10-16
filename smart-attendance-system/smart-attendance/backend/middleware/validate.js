const { ApiError } = require("./errorHandler");

const isObjectId = (value) => typeof value === "string" && /^[a-f\d]{24}$/i.test(value);

function validateId(req, res, next) {
  next(isObjectId(req.params.id) ? undefined : new ApiError(400, "Invalid id."));
}

function validateStudent(req, res, next) {
  const clean = (v) => (typeof v === "string" ? v.trim() : "");
  const studentId = clean(req.body && req.body.studentId);
  const name = clean(req.body && req.body.name);
  const classSection = clean(req.body && req.body.classSection);

  if (!/^[A-Za-z0-9_\-/]{1,30}$/.test(studentId))
    return next(new ApiError(400, "Student ID must be 1-30 characters: letters, numbers, - _ or /."));
  if (name.length < 2 || name.length > 100) return next(new ApiError(400, "Name must be 2-100 characters."));
  if (classSection.length < 1 || classSection.length > 30)
    return next(new ApiError(400, "Class / Section must be 1-30 characters."));

  req.body = { studentId, name, classSection }; // only these fields are passed on
  next();
}

module.exports = { isObjectId, validateId, validateStudent };
