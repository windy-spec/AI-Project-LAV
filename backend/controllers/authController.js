const User = require("../models/User");
exports.register = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    // Kiểm tra trùng lặp và lưu
    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists)
      return res
        .status(400)
        .json({ success: false, message: "User đã tồn tại" });

    const user = await User.create({ username, email, password, role });
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
exports.login = async (req, res) => {
  const { username, password } = req.body;

  try {
    // 1. Tìm user theo username và lấy kèm trường password (vì model đang để select: false)
    const user = await User.findOne({ username }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Tài khoản không tồn tại",
      });
    }

    // 2. Sử dụng method matchPassword của OOP User Model để kiểm tra
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Mật khẩu không chính xác",
      });
    }

    // 3. Đăng nhập thành công (Loại bỏ password trước khi gửi về client)
    user.password = undefined;
    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("Lỗi đăng nhập:", err);
    res.status(500).json({ success: false, message: "Lỗi hệ thống" });
  }
};
