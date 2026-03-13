const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Tiêu đề không được để trống"],
      trim: true,
    },
    content: {
      type: String,
      required: [true, "Nội dung không được để trống"],
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Liên kết với Model User
      required: true,
    },
    category: {
      type: String,
      enum: ["PHP", "OOP", "Database", "General"],
      default: "General",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Post", postSchema);
