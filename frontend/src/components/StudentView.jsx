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
  const missingTimer = useRef(null);
  const lastAlertTime = useRef(0);

  const COOLDOWN_TIME = 5000;
  const MISSING_LIMIT = 10000;
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
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });
    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6,
    });
    faceMesh.onResults(onResults);
    faceMeshRef.current = faceMesh;
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (isPaused || isSubmitted) return;
      if (webcamRef.current?.video?.readyState === 4) {
        const video = webcamRef.current.video;
        if (faceMeshRef.current) faceMeshRef.current.send({ image: video });
        const imageSrc = webcamRef.current.getScreenshot({
          width: 320,
          height: 240,
        });
        if (imageSrc)
          socket.emit("stream_video", {
            studentId: user.name,
            image: imageSrc,
          });
      }
    }, 200);
    return () => clearInterval(intervalId);
  }, [isPaused, isSubmitted, user]);

  const onResults = (results) => {
    if (isPaused || isSubmitted) return;
    const isMissing =
      !results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0;
    if (isMissing) {
      setStatus("MISSING");
      if (!missingTimer.current)
        missingTimer.current = setTimeout(
          () => handleSubmitExam(true, "Vắng mặt quá 10s"),
          MISSING_LIMIT,
        );
    } else {
      if (missingTimer.current) {
        clearTimeout(missingTimer.current);
        missingTimer.current = null;
      }
      const landmarks = results.multiFaceLandmarks[0];
      const analysis = aiBrain.analyze(landmarks);
      setViolationStreak(analysis.streak);
      setStatus(analysis.status !== "NORMAL" ? "WARNING" : "NORMAL");
      setWarningMsg(analysis.message);
      if (
        analysis.shouldAlertAdmin &&
        Date.now() - lastAlertTime.current > COOLDOWN_TIME
      ) {
        setWarningCount((prev) => {
          const newC = prev + 1;
          socket.emit("send_warning", {
            studentId: user.name,
            msg: `Cảnh báo ${newC}/3: ${analysis.message}`,
            type: newC >= MAX_WARNINGS ? "CRITICAL" : "WARNING",
          });
          toast.error(`Cảnh báo ${newC}/3: ${analysis.message}`);
          if (newC >= MAX_WARNINGS) handleSubmitExam(true, "Vi phạm quá 3 lần");
          return newC;
        });
        lastAlertTime.current = Date.now();
      }
      drawUI(landmarks, analysis);
    }
  };

  const drawUI = (landmarks, analysis) => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    canvasRef.current.width = webcamRef.current.video.videoWidth;
    canvasRef.current.height = webcamRef.current.video.videoHeight;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    drawConnectors(ctx, landmarks, FACEMESH_FACE_OVAL, {
      color: analysis.status !== "NORMAL" ? "#FF0000" : "#FFFFFF30",
      lineWidth: 3,
    });
  };

  const handleSubmitExam = (isForced = false, reason = "") => {
    if (!isForced && !window.confirm("Nộp bài?")) return;
    let correct = 0;
    examQuestions.forEach((q) => {
      if (answers[q._id] === q.answer) correct++;
    });
    const finalScore = (correct / (examQuestions.length || 1)) * 10;
    setScore(finalScore);
    setIsSubmitted(true);
    socket.emit("send_warning", {
      studentId: user.name,
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

  return (
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
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "40px",
          backgroundColor: "#F1F5F9",
          position: "relative",
        }}
      >
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          {isPaused && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(15, 23, 42, 0.9)",
                zIndex: 100,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                color: "white",
              }}
            >
              <h1>⏸️ {pauseReason}</h1>
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
            border: "2px solid #334155",
          }}
        >
          <Webcam
            ref={webcamRef}
            audio={false}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
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
        </div>
        <div
          style={{
            marginTop: "auto",
            padding: "15px",
            background: "rgba(56, 189, 248, 0.1)",
            borderRadius: "12px",
            color: "#38BDF8",
            textAlign: "center",
          }}
        >
          {status === "NORMAL" ? "✅ Hệ thống ổn định" : `⚠️ ${warningMsg}`}
        </div>
      </div>
    </div>
  );
};
export default StudentView;
