// frontend/src/components/StudentView.jsx
import React, { useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import {
  FaceMesh,
  FACEMESH_TESSELATION,
  FACEMESH_FACE_OVAL,
} from "@mediapipe/face_mesh";
import { drawConnectors } from "@mediapipe/drawing_utils";
import io from "socket.io-client";
import { FatigueDetector } from "../ai/FatigueDetector";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const socket = io.connect("http://localhost:3001");
const aiBrain = new FatigueDetector();

const StudentView = () => {
  const navigate = useNavigate();
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const faceMeshRef = useRef(null);
  const lastAlertTime = useRef(0);

  const isProcessing = useRef(false);

  const COOLDOWN_TIME = 5000;
  const MAX_WARNINGS = 3;

  const [user] = useState(
    JSON.parse(localStorage.getItem("USER_INFO")) || { name: "Khách" },
  );
  const [deviceId] = useState(localStorage.getItem("PREFERRED_CAMERA") || null);
  const [examQuestions, setExamQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState("ĐANG KHỞI TẠO...");
  const [warningMsg, setWarningMsg] = useState("");
  const [violationStreak, setViolationStreak] = useState(0);
  const [warningCount, setWarningCount] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [pauseReason, setPauseReason] = useState("");

  const stateRef = useRef({
    isPaused,
    isSubmitted,
    examQuestions,
    answers,
    user,
  });

  useEffect(() => {
    stateRef.current = { isPaused, isSubmitted, examQuestions, answers, user };
  }, [isPaused, isSubmitted, examQuestions, answers, user]);

  // ==========================================
  // LOGIC 1: CHỐNG CHUYỂN TAB / MỞ TÀI LIỆU KHÁC
  // ==========================================
  useEffect(() => {
    const handleVisibilityChange = () => {
      const { isPaused, isSubmitted, user: currentUser } = stateRef.current;
      if (document.hidden && !isSubmitted && !isPaused) {
        setViolationStreak(100);
        setStatus("TAB_SWITCH");
        setWarningMsg("⚠️ PHÁT HIỆN CHUYỂN TAB / MỞ TRANG KHÁC!");

        // THÊM: Chụp ảnh bằng chứng khi nhảy tab (nếu camera còn hoạt động)
        const snapshotSrc = webcamRef.current
          ? webcamRef.current.getScreenshot({ width: 320, height: 240 })
          : null;

        socket.emit("send_warning", {
          studentId: currentUser.name,
          msg: "🚨 VI PHẠM NẶNG: Chuyển Tab / Rời khỏi màn hình thi!",
          type: "CRITICAL",
          snapshot: snapshotSrc, // Đính kèm bằng chứng
        });
        toast.error("KHÔNG ĐƯỢC RỜI KHỎI MÀN HÌNH THI!");
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  useEffect(() => {
    const fetchExam = async () => {
      try {
        const res = await fetch("http://localhost:3001/api/questions/exam");
        const data = await res.json();
        setExamQuestions(data);
      } catch (err) {
        toast.error("Lỗi tải đề thi!");
      }
    };
    fetchExam();
  }, []);

  useEffect(() => {
    socket.on("teacher_force_pause", (data) => {
      setIsPaused(true);
      setPauseReason(data.reason);
    });
    socket.on("teacher_force_resume", () => {
      setIsPaused(false);
    });
    return () => {
      socket.off("teacher_force_pause");
      socket.off("teacher_force_resume");
    };
  }, []);

  useEffect(() => {
    if (faceMeshRef.current) return;
    const faceMesh = new FaceMesh({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${file}`,
    });
    faceMesh.setOptions({
      maxNumFaces: 2,
      refineLandmarks: true,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6,
    });
    faceMesh.onResults(onResults);
    faceMeshRef.current = faceMesh;
  }, []);

  // ==========================================
  // LOGIC 2: TÁCH LUỒNG (FIX LAG CAMERA GIÁO VIÊN)
  // ==========================================
  useEffect(() => {
    const aiIntervalId = setInterval(async () => {
      if (isPaused || isSubmitted) return;
      if (webcamRef.current?.video?.readyState === 4 && !isProcessing.current) {
        const video = webcamRef.current.video;
        isProcessing.current = true;
        try {
          if (faceMeshRef.current)
            await faceMeshRef.current.send({ image: video });
        } catch (error) {
          console.error("Lỗi AI:", error);
        } finally {
          isProcessing.current = false;
        }
      }
    }, 200);

    const streamIntervalId = setInterval(() => {
      if (isPaused || isSubmitted) return;
      if (webcamRef.current?.video?.readyState === 4) {
        const imageSrc = webcamRef.current.getScreenshot({
          width: 320,
          height: 240,
        });
        if (imageSrc) {
          socket.emit("stream_video", {
            studentId: user.name,
            image: imageSrc,
          });
        }
      }
    }, 200);

    return () => {
      clearInterval(aiIntervalId);
      clearInterval(streamIntervalId);
    };
  }, [isPaused, isSubmitted, user]);

  const onResults = (results) => {
    const { isPaused, isSubmitted, user: currentUser } = stateRef.current;
    if (isPaused || isSubmitted) return;

    const hasMultipleFaces =
      results.multiFaceLandmarks && results.multiFaceLandmarks.length > 1;
    const isMissing =
      !results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0;

    let analysis;

    if (isMissing || hasMultipleFaces) {
      analysis = aiBrain.analyze(null);
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    } else {
      const landmarks = results.multiFaceLandmarks[0];
      analysis = aiBrain.analyze(landmarks);
      drawUI(landmarks, analysis);
    }

    setViolationStreak(analysis.streak);

    if (document.hidden) {
      setStatus("TAB_SWITCH");
    } else if (hasMultipleFaces) {
      setStatus("MULTI_FACE");
      setWarningMsg("⚠️ PHÁT HIỆN CÓ 2 NGƯỜI TRONG KHUNG HÌNH!");
    } else if (isMissing) {
      setStatus("MISSING");
      setWarningMsg("⚠️ KHÔNG TÌM THẤY KHUÔN MẶT!");
    } else {
      setStatus(analysis.status !== "NORMAL" ? "WARNING" : "NORMAL");
      setWarningMsg(analysis.message);
    }

    // ==========================================
    // LOGIC 3: GỬI CẢNH BÁO + ẢNH BẰNG CHỨNG
    // ==========================================
    if (
      (analysis.shouldAlertAdmin || document.hidden || hasMultipleFaces) &&
      Date.now() - lastAlertTime.current > COOLDOWN_TIME
    ) {
      setWarningCount((prev) => {
        const newC = prev + 1;

        // THÊM: Chụp lại màn hình khoảnh khắc vi phạm
        const snapshotSrc = webcamRef.current
          ? webcamRef.current.getScreenshot({ width: 320, height: 240 })
          : null;

        socket.emit("send_warning", {
          studentId: currentUser.name,
          msg: `Cảnh báo ${newC}/3: ${hasMultipleFaces ? "Có 2 người thi" : analysis.message}`,
          type: newC >= MAX_WARNINGS ? "CRITICAL" : "WARNING",
          snapshot: snapshotSrc, // Đính kèm ảnh bằng chứng gửi lên cho giáo viên
        });

        toast.error(
          `Cảnh báo ${newC}/3: ${hasMultipleFaces ? "Nhiều người trong camera" : analysis.message}`,
        );

        if (newC >= MAX_WARNINGS) {
          handleSubmitExam(true, "Vi phạm nội quy quá 3 lần");
        }
        return newC;
      });
      lastAlertTime.current = Date.now();
    }
  };

  const drawUI = (landmarks, analysis) => {
    if (!canvasRef.current || !webcamRef.current?.video) return;
    const ctx = canvasRef.current.getContext("2d");
    canvasRef.current.width = webcamRef.current.video.videoWidth;
    canvasRef.current.height = webcamRef.current.video.videoHeight;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    drawConnectors(ctx, landmarks, FACEMESH_TESSELATION, {
      color:
        analysis.status !== "NORMAL"
          ? "rgba(255, 0, 0, 0.4)"
          : "rgba(255, 255, 255, 0.2)",
      lineWidth: 1,
    });

    drawConnectors(ctx, landmarks, FACEMESH_FACE_OVAL, {
      color:
        analysis.status !== "NORMAL" ? "#FF0000" : "rgba(255, 255, 255, 0.6)",
      lineWidth: 2,
    });
  };

  const handleSubmitExam = (isForced = false, reason = "") => {
    const {
      answers: currentAnswers,
      examQuestions: currentQuestions,
      user: currentUser,
    } = stateRef.current;
    if (!isForced && !window.confirm("Nộp bài?")) return;

    let correct = 0;
    currentQuestions.forEach((q) => {
      if (currentAnswers[q._id] === q.answer) correct++;
    });
    const finalScore = (correct / (currentQuestions.length || 1)) * 10;

    setScore(finalScore);
    setIsSubmitted(true);
    socket.emit("send_warning", {
      studentId: currentUser.name,
      msg: isForced
        ? `🚨 THU BÀI: ${reason}`
        : `✅ Hoàn thành: ${finalScore.toFixed(1)}đ`,
      type: isForced ? "CRITICAL" : "INFO",
    });
  };

  if (examQuestions.length === 0)
    return (
      <div style={{ color: "white", textAlign: "center", marginTop: "50px" }}>
        Đang tải đề thi...
      </div>
    );

  const isDangerState =
    status === "MISSING" || status === "MULTI_FACE" || status === "TAB_SWITCH";

  return (
    <>
      <style>
        {`
          @keyframes flashDanger {
            0% { box-shadow: inset 0 0 0px rgba(239, 68, 68, 0); background-color: #F1F5F9; }
            50% { box-shadow: inset 0 0 120px rgba(239, 68, 68, 0.4); background-color: #fee2e2; }
            100% { box-shadow: inset 0 0 0px rgba(239, 68, 68, 0); background-color: #F1F5F9; }
          }
          .danger-blink {
            animation: flashDanger 1s infinite;
            transition: all 0.3s ease;
          }
        `}
      </style>

      <div
        style={{
          display: "flex",
          height: "100vh",
          backgroundColor: "#0B0F1A",
          color: "white",
          overflow: "hidden",
        }}
      >
        <div
          className={isDangerState ? "danger-blink" : ""}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "40px",
            backgroundColor: "#F1F5F9",
            position: "relative",
            transition: "background-color 0.5s ease",
          }}
        >
          <div style={{ maxWidth: "800px", margin: "0 auto" }}>
            {isDangerState && !isSubmitted && !isPaused && (
              <div
                style={{
                  background: "#EF4444",
                  color: "white",
                  padding: "15px",
                  borderRadius: "12px",
                  textAlign: "center",
                  fontWeight: "bold",
                  fontSize: "1.2rem",
                  marginBottom: "20px",
                  boxShadow: "0 4px 15px rgba(239, 68, 68, 0.4)",
                }}
              >
                {warningMsg}
              </div>
            )}
            {isPaused && (
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  background: "rgba(15, 23, 42, 0.9)",
                  zIndex: 1000,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  color: "white",
                }}
              >
                <h1 style={{ fontSize: "3rem", marginBottom: "1rem" }}>
                  ⏸️ {pauseReason}
                </h1>
                <p style={{ fontSize: "1.2rem" }}>
                  Trang web đã tạm dừng để kiểm tra. Vui lòng đợi giáo viên tiếp
                  tục.
                </p>
              </div>
            )}
            {isSubmitted ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "60px",
                  background: "white",
                  borderRadius: "24px",
                  color: "#1E293B",
                }}
              >
                <h1>Kết quả: {score.toFixed(1)}/10</h1>
                <button
                  onClick={() => navigate("/home")}
                  style={{
                    padding: "12px 30px",
                    background: "#3B82F6",
                    color: "white",
                    border: "none",
                    borderRadius: "12px",
                    cursor: "pointer",
                  }}
                >
                  Về trang chủ
                </button>
              </div>
            ) : (
              examQuestions.map((q, i) => (
                <div
                  key={q._id}
                  style={{
                    background: "white",
                    padding: "30px",
                    borderRadius: "20px",
                    marginBottom: "20px",
                    color: "#1E293B",
                    opacity: isDangerState ? 0.6 : 1,
                  }}
                >
                  <h3>
                    Câu {i + 1}: {q.question}
                  </h3>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "12px",
                    }}
                  >
                    {q.options.map((opt) => (
                      <label
                        key={opt}
                        style={{
                          padding: "16px",
                          borderRadius: "12px",
                          border: "2px solid #F1F5F9",
                          background:
                            answers[q._id] === opt ? "#EFF6FF" : "white",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="radio"
                          name={q._id}
                          checked={answers[q._id] === opt}
                          onChange={() =>
                            setAnswers({ ...answers, [q._id]: opt })
                          }
                        />{" "}
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>
              ))
            )}
            {!isSubmitted && (
              <button
                onClick={() => handleSubmitExam()}
                style={{
                  width: "100%",
                  padding: "20px",
                  background: "#3B82F6",
                  color: "white",
                  borderRadius: "16px",
                  border: "none",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                NỘP BÀI
              </button>
            )}
          </div>
        </div>

        <div
          style={{
            width: "350px",
            background: "#0F172A",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              background: warningCount >= 2 ? "#EF4444" : "#1E293B",
              padding: "15px",
              borderRadius: "16px",
              textAlign: "center",
            }}
          >
            <small>Vi phạm</small>
            <div style={{ fontSize: "24px", fontWeight: "bold" }}>
              {warningCount} / 3
            </div>
          </div>
          <div
            style={{
              marginTop: "20px",
              position: "relative",
              borderRadius: "16px",
              overflow: "hidden",
              border: isDangerState ? "2px solid #EF4444" : "2px solid #334155",
            }}
          >
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              screenshotQuality={0.5}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                opacity: isDangerState ? 0.3 : 1,
              }}
            />
            <canvas
              ref={canvasRef}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
              }}
            />
            {isDangerState && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "40px",
                }}
              >
                ❌
              </div>
            )}
          </div>
          <div
            style={{
              marginTop: "20px",
              background: "#1E293B",
              padding: "15px",
              borderRadius: "12px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "8px",
                fontSize: "14px",
              }}
            >
              <span style={{ color: "#94A3B8" }}>Nguy cơ bị cảnh báo</span>
              <span
                style={{
                  color: violationStreak >= 40 ? "#EF4444" : "white",
                  fontWeight: "bold",
                }}
              >
                {Math.min(100, Math.round((violationStreak / 40) * 100))}%
              </span>
            </div>
            <div
              style={{
                width: "100%",
                height: "8px",
                background: "#334155",
                borderRadius: "4px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${Math.min(100, (violationStreak / 40) * 100)}%`,
                  background:
                    violationStreak >= 35
                      ? "#EF4444"
                      : violationStreak >= 20
                        ? "#F59E0B"
                        : "#38BDF8",
                  transition: "width 0.3s ease, background 0.3s ease",
                }}
              />
            </div>
          </div>
          <div
            style={{
              marginTop: "auto",
              padding: "15px",
              background:
                status === "NORMAL"
                  ? "rgba(56, 189, 248, 0.1)"
                  : "rgba(239, 68, 68, 0.1)",
              borderRadius: "12px",
              color: status === "NORMAL" ? "#38BDF8" : "#EF4444",
              textAlign: "center",
              fontWeight: "bold",
            }}
          >
            {status === "NORMAL" ? "✅ Hệ thống ổn định" : `⚠️ ${warningMsg}`}
          </div>
        </div>
      </div>
    </>
  );
};
export default StudentView;
