const multer = require("multer");
const { ApiError } = require("./errorHandler");

const maxMb = Number(process.env.MAX_IMAGE_MB) || 10;

// Images are kept in memory only, forwarded to the Python service, and never written to disk.
// Because nothing is saved as a file, the uploaded filename is never used.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxMb * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (["image/jpeg", "image/png"].includes(file.mimetype)) return cb(null, true);
    cb(new ApiError(400, "Only JPEG or PNG images are allowed."));
  },
});

// The browser-reported type can be faked, so also check the first bytes of the file.
function hasImageSignature(buffer) {
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPng = buffer.length > 4 && buffer.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  return isJpeg || isPng;
}

function requireImage(req, res, next) {
  if (!req.file) return next(new ApiError(400, "An image file is required (form field name: image)."));
  if (!hasImageSignature(req.file.buffer)) return next(new ApiError(400, "The file is not a valid JPEG or PNG image."));
  next();
}

module.exports = { uploadImage: upload.single("image"), requireImage };
