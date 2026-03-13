// frontend/src/App.jsx
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster } from "react-hot-toast"; // Import Toast
import Login from "./components/Login";
import StudentView from "./components/StudentView";
import DeviceCheck from "./components/DeviceCheck";
import TeacherDashboard from "./components/TeacherDashboard";
import Home from "./components/Home";
import Register from "./components/Register";
// Hàm bảo vệ Route (Phải đăng nhập mới được vào)
const ProtectedRoute = ({ children, role }) => {
  const user = JSON.parse(localStorage.getItem("USER_INFO"));
  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role) return <Navigate to="/login" />; // Sai role thì kick ra
  return children;
};

function App() {
  return (
    <Router>
      {/* Component hiển thị thông báo toàn hệ thống */}
      <Toaster position="top-right" />

      <Routes>
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/" element={<Navigate to="/login" />} />

        {/* Route cho Sinh viên */}
        <Route
          path="/check"
          element={
            <ProtectedRoute role="user">
              <DeviceCheck />
            </ProtectedRoute>
          }
        />
        <Route
          path="/exam"
          element={
            <ProtectedRoute role="user">
              <StudentView />
            </ProtectedRoute>
          }
        />

        {/* Route cho Giáo viên */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute role="TEACHER">
              <TeacherDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
