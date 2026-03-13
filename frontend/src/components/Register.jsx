import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";

const Register = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    role: "user",
  });
  const navigate = useNavigate();

  // Register.jsx - Sửa đoạn handleSubmit
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost:3001/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      // Kiểm tra nếu Server không trả về JSON (lỗi 404 hoặc 500)
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        return toast.error(
          "Lỗi hệ thống: Server không phản hồi đúng định dạng.",
        );
      }

      const data = await res.json();
      if (data.success) {
        toast.success("Đăng ký thành công!");
        navigate("/login");
      } else {
        toast.error(data.message || "Đăng ký thất bại");
      }
    } catch (err) {
      toast.error("Không thể kết nối tới Server. Hãy kiểm tra lại cổng 3001.");
    }
  };

  return (
    <div
      style={{
        height: "100vh",
        background: "#0F172A",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: "#1E293B",
          padding: 40,
          borderRadius: 12,
          width: 350,
          color: "white",
        }}
      >
        <h2 style={{ textAlign: "center", color: "#38BDF8" }}>ĐĂNG KÝ</h2>
        <input
          type="text"
          placeholder="Username"
          onChange={(e) =>
            setFormData({ ...formData, username: e.target.value })
          }
          style={inputStyle}
        />
        <input
          type="email"
          placeholder="Email"
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          style={inputStyle}
        />
        <input
          type="password"
          placeholder="Mật khẩu (6+ ký tự)"
          onChange={(e) =>
            setFormData({ ...formData, password: e.target.value })
          }
          style={inputStyle}
        />
        <select
          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          style={inputStyle}
        >
          <option value="user">Học sinh</option>
          <option value="TEACHER">Giảng viên</option>
        </select>
        <button
          type="submit"
          style={{
            width: "100%",
            padding: 12,
            background: "#3B82F6",
            border: "none",
            borderRadius: 6,
            color: "white",
            fontWeight: "bold",
          }}
        >
          ĐĂNG KÝ
        </button>
        <p style={{ textAlign: "center", marginTop: 15 }}>
          Đã có tài khoản?{" "}
          <Link to="/login" style={{ color: "#38BDF8" }}>
            Đăng nhập
          </Link>
        </p>
      </form>
    </div>
  );
};

const inputStyle = {
  width: "100%",
  padding: 10,
  marginBottom: 15,
  borderRadius: 6,
  border: "none",
  background: "#334155",
  color: "white",
};

export default Register;
