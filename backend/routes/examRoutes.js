const express = require("express");
const router = express.Router();
const examController = require("../controllers/examController");

router.get("/exam", examController.getRandomExam); // Sẽ gọi qua /api/questions/exam
router.post("/add", examController.addQuestion);

module.exports = router;
