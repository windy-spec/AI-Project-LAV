const mongoose = require("mongoose");
require("dotenv").config();
const User = require("./models/User");
const Post = require("./models/Post"); // Nhớ import Post thay vì Forum

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("🌱 Đang kết nối Cloud để nạp User và Post...");

    // 1. Xóa dữ liệu cũ
    await User.deleteMany({});
    await Post.deleteMany({});

    // 2. Tạo User mẫu (Sử dụng .create để chạy Middleware mã hóa mật khẩu)
    const users = await User.create([
      {
        username: "teacher_dung",
        email: "dung_php@example.com",
        password: "password123",
        role: "TEACHER",
      },
      {
        username: "student_phong",
        email: "phong_dev@example.com",
        password: "password123",
        role: "user",
      },
    ]);
    console.log("✅ Đã nạp 2 User thành công!");

    // 3. Tạo Post mẫu (Gắn ID của User vào trường author)
    await Post.create([
      {
        title: "Hướng dẫn PHP cơ bản cho người mới",
        content:
          "Trong bài viết này, chúng ta sẽ tìm hiểu về Array và Function trong PHP...",
        author: users[0]._id, // Lấy ID của teacher_dung
        category: "PHP",
      },
      {
        title: "Tại sao nên học OOP?",
        content:
          "OOP giúp mã nguồn dễ quản lý và mở rộng hơn thông qua tính kế thừa...",
        author: users[0]._id,
        category: "OOP",
      },
      {
        title: "Hỏi về cách dùng PDO kết nối MySQL",
        content:
          "Mình đang gặp lỗi ENOTFOUND khi kết nối MongoDB Atlas, ai giúp mình với!",
        author: users[1]._id, // Lấy ID của student_phong
        category: "Database",
      },
    ]);
    console.log("✅ Đã nạp 3 bài viết mẫu gắn với User!");

    console.log("🚀 Hoàn tất! Dữ liệu đã xuất hiện trên MongoDB Atlas.");
    process.exit();
  } catch (err) {
    console.error("❌ Lỗi nạp dữ liệu:", err);
    process.exit(1);
  }
};

seedData();
