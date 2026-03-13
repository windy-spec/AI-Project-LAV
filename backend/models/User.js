const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Vui lòng nhập tên đăng nhập"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    email: {
      type: String,
      required: [true, "Vui lòng nhập email"],
      unique: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Email không hợp lệ"],
    },
    password: {
      type: String,
      required: [true, "Vui lòng nhập mật khẩu"],
      minlength: 6,
      select: false, // Không tự động trả về password khi query
    },
    // models/User.js
    role: {
      type: String,
      enum: ["user", "admin", "TEACHER"], // Thêm TEACHER vào danh sách cho phép
      default: "user",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // Tự động tạo updatedAt và createdAt
  },
);

// Middleware: Mã hóa mật khẩu trước khi lưu vào DB
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method: Kiểm tra mật khẩu (Sử dụng khi Đăng nhập)
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// CÁCH EXPORT CHUẨN: Để tránh lỗi "deleteMany is not a function"
const User = mongoose.model("User", userSchema);
module.exports = User;
