const express = require("express");
const router = express.Router();
const forumController = require("../controllers/forumController");

// Lấy danh sách bài viết: GET /api/forum/
router.get("/", forumController.getAllPosts);

// Đăng bài viết mới: POST /api/forum/
router.post("/", forumController.createPost);

module.exports = router;
