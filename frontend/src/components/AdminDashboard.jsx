import React, { useEffect, useState } from "react";
import io from "socket.io-client";

// Đảm bảo URL này khớp với server của bạn
const socket = io.connect("http://localhost:3001");

const AdminDashboard = () => {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    // Đổi từ 'receive_alert' thành 'teacher_receive_warning' để khớp với server
    socket.on("teacher_receive_warning", (data) => {
      setLogs((prev) => [
        {
          id: Date.now(),
          time: new Date().toLocaleTimeString(),
          studentId: data.studentId,
          msg: data.msg,
          type: data.type || "WARNING",
        },
        ...prev,
      ]);
    });

    return () => socket.off("teacher_receive_warning");
  }, []);

  return (
    <div
      style={{
        padding: 30,
        background: "#0F172A",
        minHeight: "100vh",
        color: "white",
      }}
    >
      <h2
        style={{
          color: "#38BDF8",
          borderBottom: "2px solid #1E293B",
          paddingBottom: 10,
        }}
      >
        🛡️ HỆ THỐNG GIÁM SÁT QUẢN TRỊ
      </h2>

      <div
        style={{
          marginTop: 20,
          background: "#1E293B",
          borderRadius: 12,
          padding: 20,
          height: "70vh",
          overflowY: "auto",
        }}
      >
        {logs.length === 0 ? (
          <p style={{ color: "#64748B", textAlign: "center" }}>
            Đang đợi tín hiệu từ phòng thi...
          </p>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              style={{
                padding: "10px 0",
                borderBottom: "1px solid #334155",
                color: log.type === "CRITICAL" ? "#FB7185" : "#FBBF24",
              }}
            >
              <span style={{ color: "#94A3B8", marginRight: 10 }}>
                [{log.time}]
              </span>
              <strong>{log.studentId}</strong>: {log.msg}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
