import React, { useEffect, useState } from "react";
import io from "socket.io-client";
import {
  PauseCircle,
  PlayCircle,
  LogOut,
  PlusCircle,
  Image as ImageIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const socket = io.connect("http://localhost:3001");

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [studentStreams, setStudentStreams] = useState({});
  const [studentStatus, setStudentStatus] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [actionType, setActionType] = useState(null);
  const [pauseReason, setPauseReason] = useState("Kiểm tra môi trường thi");
  const [newQuestion, setNewQuestion] = useState({
    question: "",
    options: ["", "", "", ""],
    answer: "",
  });

  // THÊM: State quản lý việc hiển thị Modal Bằng chứng
  const [viewingSnapshot, setViewingSnapshot] = useState(null);

  useEffect(() => {
    socket.on("teacher_receive_warning", (data) => {
      setLogs((prev) => [
        { id: Date.now(), time: new Date().toLocaleTimeString(), ...data },
        ...prev,
      ]);
      if (data.type === "CRITICAL") {
        setStudentStatus((prev) => ({ ...prev, [data.studentId]: "WARNING" }));
        toast.error(`${data.studentId}: ${data.msg}`, { duration: 5000 });
      }
    });
    socket.on("teacher_watch_stream", (data) => {
      setStudentStreams((prev) => ({ ...prev, [data.studentId]: data.image }));
    });
    return () => {
      socket.off("teacher_receive_warning");
      socket.off("teacher_watch_stream");
    };
  }, []);

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost:3001/api/questions/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newQuestion),
      });
      if (res.ok) {
        toast.success("Đã thêm câu hỏi!");
        setNewQuestion({ question: "", options: ["", "", "", ""], answer: "" });
      }
    } catch (err) {
      toast.error("Lỗi!");
    }
  };

  const confirmAction = () => {
    socket.emit("teacher_action", {
      action: actionType,
      studentId: selectedStudent,
      reason: actionType === "PAUSE" ? pauseReason : "",
    });
    setModalOpen(false);
    toast.success(`Đã gửi lệnh tới ${selectedStudent}`);
  };

  return (
    <div style={{ padding: 30, background: "#F1F5F9", minHeight: "100vh" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 30,
        }}
      >
        <h1 style={{ color: "#0F172A" }}>🎛️ MONITORING CENTER</h1>
        <button
          onClick={() => {
            localStorage.removeItem("USER_INFO");
            navigate("/login");
          }}
          style={{
            background: "white",
            padding: "10px 20px",
            borderRadius: 8,
            cursor: "pointer",
            border: "1px solid #DDD",
          }}
        >
          <LogOut size={16} /> Đăng xuất
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr", gap: 20 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 20,
            alignContent: "start",
          }}
        >
          {Object.keys(studentStreams).map((svId) => (
            <div
              key={svId}
              style={{
                background: "white",
                borderRadius: 12,
                overflow: "hidden",
                border:
                  studentStatus[svId] === "WARNING"
                    ? "3px solid #EF4444"
                    : "none",
              }}
            >
              <div style={{ padding: 10, fontWeight: "bold" }}>
                {svId} <span style={{ color: "#10B981" }}>● Live</span>
              </div>
              <img
                src={studentStreams[svId]}
                style={{
                  width: "100%",
                  height: 200,
                  objectFit: "cover",
                  background: "#000",
                }}
              />
              <div style={{ padding: 10, display: "flex", gap: 5 }}>
                <button
                  onClick={() => {
                    setSelectedStudent(svId);
                    setActionType("PAUSE");
                    setModalOpen(true);
                  }}
                  style={{
                    flex: 1,
                    padding: 8,
                    background: "#EFF6FF",
                    color: "#3B82F6",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  <PauseCircle size={14} /> Dừng
                </button>
                <button
                  onClick={() => {
                    setSelectedStudent(svId);
                    setActionType("RESUME");
                    setModalOpen(true);
                  }}
                  style={{
                    flex: 1,
                    padding: 8,
                    background: "#ECFDF5",
                    color: "#10B981",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  <PlayCircle size={14} /> Tiếp
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* CỘT LOGS VI PHẠM */}
        <div
          style={{
            background: "white",
            padding: 20,
            borderRadius: 12,
            height: "80vh",
            overflowY: "auto",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
          }}
        >
          <h3 style={{ borderBottom: "1px solid #EEE", paddingBottom: 10 }}>
            NHẬT KÝ VI PHẠM
          </h3>
          {logs.map((log) => (
            <div
              key={log.id}
              style={{
                fontSize: 13,
                marginBottom: 12,
                padding: "10px",
                background: log.type === "CRITICAL" ? "#FEF2F2" : "#FFFBEB",
                borderLeft: `4px solid ${log.type === "CRITICAL" ? "#EF4444" : "#F59E0B"}`,
                borderRadius: "0 8px 8px 0",
                color: log.type === "CRITICAL" ? "#B91C1C" : "#B45309",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <small style={{ color: "#94A3B8" }}>{log.time}</small>
                  <div style={{ marginTop: 4 }}>
                    <strong>{log.studentId}</strong>: {log.msg}
                  </div>
                </div>

                {/* THÊM NÚT XEM BẰNG CHỨNG NẾU CÓ SNAPSHOT */}
                {log.snapshot && (
                  <button
                    onClick={() =>
                      setViewingSnapshot({
                        src: log.snapshot,
                        info: `${log.studentId} - ${log.time}`,
                      })
                    }
                    style={{
                      background: "white",
                      border: "1px solid #CBD5E1",
                      padding: "4px 8px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "11px",
                      color: "#334155",
                    }}
                  >
                    <ImageIcon size={12} /> Ảnh
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          background: "white",
          padding: 25,
          borderRadius: 12,
          marginTop: 20,
        }}
      >
        <h3>
          <PlusCircle size={18} /> Thêm câu hỏi ngân hàng
        </h3>
        <form onSubmit={handleAddQuestion} style={{ display: "grid", gap: 10 }}>
          <input
            placeholder="Câu hỏi"
            value={newQuestion.question}
            onChange={(e) =>
              setNewQuestion({ ...newQuestion, question: e.target.value })
            }
            style={{ padding: 12, borderRadius: 8, border: "1px solid #DDD" }}
          />
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
          >
            {newQuestion.options.map((opt, i) => (
              <input
                key={i}
                placeholder={`Lựa chọn ${i + 1}`}
                value={opt}
                onChange={(e) => {
                  const n = [...newQuestion.options];
                  n[i] = e.target.value;
                  setNewQuestion({ ...newQuestion, options: n });
                }}
                style={{
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid #DDD",
                }}
              />
            ))}
          </div>
          <input
            placeholder="Đáp án đúng"
            value={newQuestion.answer}
            onChange={(e) =>
              setNewQuestion({ ...newQuestion, answer: e.target.value })
            }
            style={{
              padding: 10,
              borderRadius: 8,
              border: "2px solid #3B82F6",
            }}
          />
          <button
            type="submit"
            style={{
              padding: 12,
              background: "#3B82F6",
              color: "white",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Lưu câu hỏi
          </button>
        </form>
      </div>

      {/* MODAL CẢNH BÁO / DỪNG THI */}
      {modalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "white",
              padding: 25,
              borderRadius: 12,
              width: 400,
            }}
          >
            <h2>Xác nhận hành động</h2>
            <p>
              Thực hiện <strong>{actionType}</strong> cho{" "}
              <strong>{selectedStudent}</strong>?
            </p>
            {actionType === "PAUSE" && (
              <select
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                style={{ width: "100%", padding: 8, marginTop: 10 }}
              >
                <option>Kiểm tra môi trường</option>
                <option>Nghi vấn gian lận</option>
              </select>
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 20,
              }}
            >
              <button
                onClick={() => setModalOpen(false)}
                style={{
                  padding: "8px 15px",
                  borderRadius: 6,
                  border: "1px solid #DDD",
                }}
              >
                Hủy
              </button>
              <button
                onClick={confirmAction}
                style={{
                  padding: "8px 15px",
                  borderRadius: 6,
                  border: "none",
                  background: "#3B82F6",
                  color: "white",
                }}
              >
                Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PHÓNG TO ẢNH BẰNG CHỨNG GIAN LẬN */}
      {viewingSnapshot && (
        <div
          onClick={() => setViewingSnapshot(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.9)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
            cursor: "zoom-out",
          }}
        >
          <div
            style={{
              color: "white",
              marginBottom: "15px",
              fontSize: "18px",
              fontWeight: "bold",
              background: "#EF4444",
              padding: "8px 20px",
              borderRadius: "20px",
            }}
          >
            📸 Bằng chứng: {viewingSnapshot.info}
          </div>
          <img
            src={viewingSnapshot.src}
            alt="Gian lận"
            style={{
              maxWidth: "80%",
              maxHeight: "80%",
              border: "4px solid white",
              borderRadius: "12px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            }}
          />
          <div style={{ color: "#94A3B8", marginTop: "15px" }}>
            (Click ra ngoài để đóng)
          </div>
        </div>
      )}
    </div>
  );
};
export default TeacherDashboard;
