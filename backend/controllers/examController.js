const Question = require("../models/Question");

// Lấy 20 câu ngẫu nhiên từ ngân hàng 100 câu
exports.getRandomExam = async (req, res) => {
  try {
    const questions = await Question.aggregate([{ $sample: { size: 20 } }]);
    res.json(questions);
  } catch (err) {
    res.status(500).json({ message: "Lỗi lấy đề thi" });
  }
};

// Giáo viên thêm câu hỏi bổ sung
exports.addQuestion = async (req, res) => {
  try {
    const newQ = new Question(req.body);
    await newQ.save();
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false });
  }
};
