import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Send,
  User as UserIcon,
  LogOut,
  MessageSquare,
  Play,
  Layout,
  Bell,
} from "lucide-react";
import toast from "react-hot-toast";

const Home = () => {
  const [posts, setPosts] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem("USER_INFO")) || {
    name: "Người dùng",
    role: "STUDENT",
  };
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const res = await fetch("http://localhost:3001/api/forum/");
        const data = await res.json();
        setPosts(data);
      } catch (err) {
        toast.error("Không thể kết nối dữ liệu diễn đàn");
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  const handlePost = async () => {
    if (!newMsg.trim()) return;
    try {
      const res = await fetch("http://localhost:3001/api/forum/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author: user.name, content: newMsg }),
      });
      const post = await res.json();
      setPosts([post, ...posts]);
      setNewMsg("");
      toast.success("Đã đăng thảo luận!");
    } catch (err) {
      toast.error("Lỗi khi đăng bài");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
        color: "white",
        padding: "20px",
      }}
    >
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto 30px",
          padding: "20px",
          background: "rgba(255, 255, 255, 0.03)",
          backdropFilter: "blur(10px)",
          borderRadius: "20px",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h1
            style={{
              background: "linear-gradient(to right, #38BDF8, #818CF8)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              margin: 0,
              fontSize: "32px",
              fontWeight: "800",
            }}
          >
            STU Pro-Exam
          </h1>
          <p
            style={{
              color: "#94A3B8",
              margin: "5px 0 0 0",
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            <UserIcon size={14} /> {user.name} •{" "}
            <span style={{ color: "#38BDF8" }}>{user.role}</span>
          </p>
        </div>
        <button
          onClick={() => {
            localStorage.removeItem("USER_INFO");
            navigate("/login");
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(239, 68, 68, 0.1)",
            color: "#F87171",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            padding: "10px 20px",
            borderRadius: "12px",
            cursor: "pointer",
          }}
        >
          <LogOut size={18} /> Thoát
        </button>
      </div>

      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "300px 1fr",
          gap: "25px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div
            style={{
              background: "rgba(30, 41, 59, 0.7)",
              padding: "25px",
              borderRadius: "24px",
              border: "1px solid rgba(255, 255, 255, 0.05)",
            }}
          >
            <h3 style={{ marginTop: 0, fontSize: "18px", color: "#38BDF8" }}>
              Bảng điều khiển
            </h3>
            <button
              onClick={() =>
                navigate(user.role === "TEACHER" ? "/admin" : "/check")
              }
              style={{
                width: "100%",
                padding: "16px",
                background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
                color: "white",
                border: "none",
                borderRadius: "15px",
                fontWeight: "700",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
              }}
            >
              {user.role === "TEACHER" ? (
                <Layout size={20} />
              ) : (
                <Play size={20} />
              )}
              {user.role === "TEACHER" ? "QUẢN TRỊ VIÊN" : "BẮT ĐẦU THI"}
            </button>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div
            style={{
              background: "rgba(30, 41, 59, 0.5)",
              padding: "20px",
              borderRadius: "24px",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <div style={{ display: "flex", gap: "12px" }}>
              <textarea
                value={newMsg}
                onChange={(e) => setNewMsg(e.target.value)}
                placeholder="Viết thông báo hoặc thảo luận..."
                style={{
                  flex: 1,
                  padding: "15px",
                  borderRadius: "15px",
                  background: "#0F172A",
                  color: "white",
                  border: "1px solid #334155",
                  resize: "none",
                }}
              />
              <button
                onClick={handlePost}
                style={{
                  width: "50px",
                  height: "50px",
                  borderRadius: "15px",
                  background: "#38BDF8",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Send size={20} color="#0F172A" />
              </button>
            </div>
          </div>

          <div
            style={{ display: "flex", flexDirection: "column", gap: "15px" }}
          >
            {posts.map((post) => (
              <div
                key={post._id}
                style={{
                  background: post.author.includes("Thầy")
                    ? "rgba(56, 189, 248, 0.05)"
                    : "rgba(255,255,255,0.02)",
                  padding: "20px",
                  borderRadius: "20px",
                  border: post.author.includes("Thầy")
                    ? "1px solid rgba(56, 189, 248, 0.3)"
                    : "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "12px",
                  }}
                >
                  <div
                    style={{
                      fontWeight: "bold",
                      color: post.author.includes("Thầy")
                        ? "#38BDF8"
                        : "#E2E8F0",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    {post.author.includes("Thầy") && <Bell size={14} />}{" "}
                    {post.author}
                  </div>
                  <span style={{ fontSize: "12px", color: "#64748B" }}>
                    {new Date(post.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <p style={{ margin: 0, lineHeight: "1.6", color: "#CBD5E1" }}>
                  {post.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
export default Home;
