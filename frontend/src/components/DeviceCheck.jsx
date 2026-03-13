// frontend/src/components/DeviceCheck.jsx
import React, { useEffect, useState, useRef } from "react";
import Webcam from "react-webcam";
import { useNavigate } from "react-router-dom";
import {
  Camera,
  Mic,
  Volume2,
  CheckCircle,
  AlertCircle,
  Play,
} from "lucide-react";

const DeviceCheck = () => {
  const navigate = useNavigate();
  const webcamRef = useRef(null);

  const [hasPermission, setHasPermission] = useState(false); // Trạng thái xin quyền
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);

  const [isCameraOk, setIsCameraOk] = useState(false);
  const [micVolume, setMicVolume] = useState(0);

  // 1. Hàm xin quyền truy cập (Chạy khi bấm nút)
  const requestPermissions = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setHasPermission(true);

      // Sau khi có quyền mới liệt kê thiết bị
      const devs = await navigator.mediaDevices.enumerateDevices();
      const videoDevs = devs.filter((d) => d.kind === "videoinput");
      setDevices(videoDevs);

      if (videoDevs.length > 0) {
        const target =
          videoDevs.find((d) => d.label.includes("HD User Facing")) ||
          videoDevs[0];
        setSelectedDeviceId(target.deviceId);
      }
    } catch (err) {
      alert("Bạn cần cho phép truy cập Camera & Micro để tiếp tục!");
      console.error(err);
    }
  };

  // 2. Logic Visualizer Micro
  useEffect(() => {
    if (!hasPermission) return;

    let audioContext, analyser, microphone, javascriptNode;
    const setupMic = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        microphone = audioContext.createMediaStreamSource(stream);
        javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);

        analyser.smoothingTimeConstant = 0.8;
        analyser.fftSize = 1024;

        microphone.connect(analyser);
        analyser.connect(javascriptNode);
        javascriptNode.connect(audioContext.destination);

        javascriptNode.onaudioprocess = () => {
          const array = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(array);
          let values = 0;
          const length = array.length;
          for (let i = 0; i < length; i++) values += array[i];
          setMicVolume(values / length);
        };
      } catch (e) {}
    };
    setupMic();
    return () => {
      if (audioContext) audioContext.close();
    };
  }, [hasPermission]);

  const handleEnterExam = () => {
    if (selectedDeviceId)
      localStorage.setItem("PREFERRED_CAMERA", selectedDeviceId);
    navigate("/exam");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0F172A",
        color: "white",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          width: "900px",
          background: "#1E293B",
          borderRadius: "16px",
          padding: "30px",
          boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
          display: "flex",
          gap: "30px",
        }}
      >
        {/* CỘT TRÁI: CAMERA */}
        <div style={{ flex: 1 }}>
          <h2
            style={{
              color: "#38BDF8",
              marginBottom: 15,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Camera /> Kiểm tra Thiết bị
          </h2>

          <div
            style={{
              position: "relative",
              borderRadius: "12px",
              overflow: "hidden",
              border: isCameraOk ? "3px solid #10B981" : "3px solid #334155",
              height: "300px",
              background: "black",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {!hasPermission ? (
              <button
                onClick={requestPermissions}
                style={{
                  background: "#3B82F6",
                  color: "white",
                  border: "none",
                  padding: "10px 20px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <Play size={16} /> Bật Camera
              </button>
            ) : selectedDeviceId ? (
              <Webcam
                audio={false}
                ref={webcamRef}
                videoConstraints={{ deviceId: { exact: selectedDeviceId } }}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onUserMedia={() => setIsCameraOk(true)}
                onUserMediaError={() => setIsCameraOk(false)}
              />
            ) : (
              <p style={{ color: "#94A3B8" }}>Đang tải thiết bị...</p>
            )}
          </div>

          {hasPermission && (
            <div style={{ marginTop: 15 }}>
              <label
                style={{ display: "block", marginBottom: 5, color: "#94A3B8" }}
              >
                Chọn Camera:
              </label>
              <select
                style={{
                  width: "100%",
                  padding: 10,
                  background: "#334155",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                }}
                onChange={(e) => {
                  setIsCameraOk(false);
                  setSelectedDeviceId(e.target.value);
                }}
                value={selectedDeviceId || ""}
              >
                {devices.map((d, i) => (
                  <option key={i} value={d.deviceId}>
                    {d.label || `Camera ${i + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* CỘT PHẢI: TRẠNG THÁI */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h2 style={{ color: "white", marginBottom: 20 }}>Checklist</h2>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 15,
                marginBottom: 20,
                padding: 15,
                background: isCameraOk
                  ? "rgba(16, 185, 129, 0.1)"
                  : "rgba(51, 65, 85, 0.5)",
                borderRadius: 10,
              }}
            >
              {isCameraOk ? (
                <CheckCircle color="#10B981" />
              ) : (
                <AlertCircle color="#64748B" />
              )}
              <div>
                <div
                  style={{
                    fontWeight: "bold",
                    color: isCameraOk ? "#10B981" : "#94A3B8",
                  }}
                >
                  Camera
                </div>
                <div style={{ fontSize: 13, color: "#94A3B8" }}>
                  {isCameraOk ? "Sẵn sàng" : "Chưa sẵn sàng"}
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 15,
                marginBottom: 20,
                padding: 15,
                background: hasPermission
                  ? "rgba(16, 185, 129, 0.1)"
                  : "rgba(51, 65, 85, 0.5)",
                borderRadius: 10,
              }}
            >
              {micVolume > 5 ? (
                <Volume2 color="#10B981" />
              ) : (
                <Mic color="#64748B" />
              )}
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontWeight: "bold",
                    color: hasPermission ? "#10B981" : "#94A3B8",
                  }}
                >
                  Microphone
                </div>
                <div
                  style={{
                    width: "100%",
                    height: 6,
                    background: "#334155",
                    marginTop: 8,
                    borderRadius: 3,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min(micVolume * 3, 100)}%`,
                      height: "100%",
                      background: "#10B981",
                      transition: "width 0.05s",
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleEnterExam}
            disabled={!isCameraOk}
            style={{
              width: "100%",
              padding: "15px",
              borderRadius: "10px",
              border: "none",
              background: isCameraOk ? "#2563EB" : "#475569",
              color: isCameraOk ? "white" : "#94A3B8",
              fontWeight: "bold",
              cursor: isCameraOk ? "pointer" : "not-allowed",
            }}
          >
            VÀO PHÒNG THI
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeviceCheck;
