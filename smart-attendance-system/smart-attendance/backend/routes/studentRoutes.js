const router = require("express").Router();
const c = require("../controllers/studentController");
const { validateId, validateStudent } = require("../middleware/validate");
const { uploadImage, requireImage } = require("../middleware/upload");

router.get("/", c.getStudents);
router.post("/", validateStudent, c.createStudent);
router.get("/:id", validateId, c.getStudent);
router.put("/:id", validateId, validateStudent, c.updateStudent);
router.delete("/:id", validateId, c.deleteStudent);
router.post("/:id/face", validateId, uploadImage, requireImage, c.uploadFace);

module.exports = router;
