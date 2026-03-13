const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
require("dotenv").config(); // Load config ngay đầu tiên

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const examRoutes = require("./routes/examRoutes");
const forumRoutes = require("./routes/forumRoutes");
const app = express();

// 1. Kết nối Database Cloud
connectDB();

// 2. Middlewares
app.use(cors());
app.use(express.json());

// 3. Sử dụng Routes đã tách
app.use("/api/auth", authRoutes); // Các link sẽ là /api/auth/login
app.use("/api/questions", examRoutes); // Các link sẽ là /api/questions/exam
app.use("/api/forum", forumRoutes); // Các link sẽ là /api/forum/
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:5173" },
});

// 4. Socket.io logic (Giữ nguyên phần giám sát video/cảnh báo)
io.on("connection", (socket) => {
  socket.on("stream_video", (data) => io.emit("teacher_watch_stream", data));
  socket.on("send_warning", (data) => io.emit("teacher_receive_warning", data));
  socket.on("teacher_action", (data) => {
    if (data.action === "PAUSE") {
      io.emit("teacher_force_pause", {
        studentId: data.studentId,
        reason: data.reason,
      });
    } else {
      io.emit("teacher_force_resume", { studentId: data.studentId });
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại cổng ${PORT}`);
});
