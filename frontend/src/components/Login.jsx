import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false); // Thêm trạng thái chờ
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password)
      return toast.error("Vui lòng nhập đầy đủ thông tin");

    setLoading(true);
    try {
      const res = await fetch("http://localhost:3001/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (data.success) {
        localStorage.setItem("USER_INFO", JSON.stringify(data.user));
        toast.success(`Chào mừng ${data.user.username} quay trở lại!`);

        if (data.user.role === "TEACHER" || data.user.role === "admin") {
          navigate("/admin");
        } else {
          navigate("/home");
        }
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error("Lỗi kết nối Server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={containerStyle}>
      <form onSubmit={handleLogin} style={formStyle}>
        <h2 style={headerStyle}>ĐĂNG NHẬP</h2>

        <div style={inputGroupStyle}>
          <label style={labelStyle}>Tài khoản</label>
          <input
            type="text"
            placeholder="Nhập username..."
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div style={inputGroupStyle}>
          <label style={labelStyle}>Mật khẩu</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            ...buttonStyle,
            opacity: loading ? 0.7 : 1,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "ĐANG XỬ LÝ..." : "ĐĂNG NHẬP"}
        </button>

        <div style={footerStyle}>
          <span>Chưa có tài khoản? </span>
          <Link to="/register" style={linkStyle}>
            Đăng ký ngay
          </Link>
        </div>
      </form>
    </div>
  );
};

// --- CSS Objects cho code mượt hơn ---
const containerStyle = {
  height: "100vh",
  background: "#0F172A",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  color: "white",
};
const formStyle = {
  background: "#1E293B",
  padding: "40px",
  borderRadius: "16px",
  width: "380px",
  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3)",
};
const headerStyle = {
  textAlign: "center",
  color: "#38BDF8",
  marginBottom: "30px",
  letterSpacing: "1px",
};
const inputGroupStyle = { marginBottom: "20px" };
const labelStyle = {
  display: "block",
  marginBottom: "8px",
  color: "#94A3B8",
  fontSize: "14px",
};
const inputStyle = {
  width: "100%",
  padding: "12px",
  borderRadius: "8px",
  border: "1px solid #334155",
  background: "#334155",
  color: "white",
  outline: "none",
  transition: "border 0.3s",
};
const buttonStyle = {
  width: "100%",
  padding: "14px",
  background: "#3B82F6",
  color: "white",
  border: "none",
  borderRadius: "8px",
  fontWeight: "bold",
  fontSize: "16px",
  marginTop: "10px",
};
const footerStyle = {
  marginTop: "25px",
  textAlign: "center",
  fontSize: "14px",
  color: "#94A3B8",
};
const linkStyle = {
  color: "#38BDF8",
  textDecoration: "none",
  fontWeight: "600",
};

export default Login;
