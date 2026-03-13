const mongoose = require("mongoose");
require("dotenv").config(); // Load biến môi trường

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB Atlas Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`❌ Lỗi kết nối: ${err.message}`);
    process.exit(1); // Dừng ứng dụng nếu không kết nối được
  }
};

module.exports = connectDB;
