const Post = require("../models/Post");

// Lấy tất cả bài viết trên diễn đàn
exports.getAllPosts = async (req, res) => {
  try {
    // Sắp xếp theo thời gian mới nhất (createdAt: -1)
    const posts = await Post.find().sort({ createdAt: -1 });
    res.status(200).json(posts);
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi lấy bài viết từ Cloud" });
  }
};

// Đăng bài viết mới
exports.createPost = async (req, res) => {
  try {
    const { author, content } = req.body;

    // Kiểm tra dữ liệu đầu vào
    if (!author || !content) {
      return res
        .status(400)
        .json({ message: "Thiếu tên tác giả hoặc nội dung" });
    }

    const newPost = new Post({
      author,
      content,
    });

    const savedPost = await newPost.save();
    res.status(201).json(savedPost);
  } catch (err) {
    res.status(500).json({ message: "Không thể đăng bài lên Atlas" });
  }
};
