const router = require("express").Router();
const c = require("../controllers/attendanceController");
const { validateId } = require("../middleware/validate");
const { uploadImage, requireImage } = require("../middleware/upload");

router.post("/process", uploadImage, requireImage, c.processImage);
router.post("/confirm", c.confirmAttendance);
router.get("/reports", c.getReport); // must stay above "/:id"
router.get("/", c.getAttendance);
router.get("/:id", validateId, c.getAttendanceById);

module.exports = router;
