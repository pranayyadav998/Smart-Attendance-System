const router = require("express").Router();
router.get("/stats", require("../controllers/dashboardController").getStats);
module.exports = router;
