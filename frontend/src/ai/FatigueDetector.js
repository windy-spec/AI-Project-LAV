// frontend/src/ai/FatigueDetector.js

export class FatigueDetector {
  constructor() {
    this.THRESHOLDS = {
      HEAD_DOWN_RATIO: 0.5, // Ngưỡng gục đầu
      SIDE_TILT: 0.25, // Nghiêng đầu
      TURN_RATIO_MIN: 0.3, // Quay phải
      TURN_RATIO_MAX: 3.0, // Quay trái
    };

    this.violationStreak = 0;
    this.hasSentAlert = false;

    // Ngưỡng báo động: 40 frame ~ 4 giây
    this.ALERT_TRIGGER_COUNT = 40;
  }

  analyze(landmarks) {
    let detectedAction = "NORMAL";
    let warningMsg = "";
    let debugValue = 0;

    // --- TRƯỜNG HỢP 1: VẮNG MẶT (MISSING) ---
    if (!landmarks) {
      detectedAction = "MISSING";
      warningMsg = "⚠️ VẮNG MẶT / MẤT TÍN HIỆU";

      // Phạt nặng: Tăng streak gấp đôi khi vắng mặt
      this.violationStreak += 2;
    } else {
      // --- TRƯỜNG HỢP 2: CÓ MẶT -> PHÂN TÍCH HÀNH VI ---
      const nose = landmarks[1];
      const chin = landmarks[152];
      const leftEye = landmarks[33];
      const rightEye = landmarks[263];
      const leftCheek = landmarks[234];
      const rightCheek = landmarks[454];

      const midEyeY = (leftEye.y + rightEye.y) / 2;
      const distEyeToNose = Math.abs(nose.y - midEyeY);
      const distNoseToChin = Math.abs(chin.y - nose.y);

      // Tỷ lệ dọc (Gục đầu)
      const headDownRatio = distNoseToChin / (distEyeToNose + 0.0001);
      debugValue = headDownRatio;

      // Các chỉ số khác
      const eyeLevelDiff = Math.abs(leftEye.y - rightEye.y);
      const distToLeft = Math.abs(nose.x - leftCheek.x);
      const distToRight = Math.abs(nose.x - rightCheek.x);
      const turnRatio = distToLeft / (distToRight + 0.0001);

      // Logic phán đoán
      if (headDownRatio < this.THRESHOLDS.HEAD_DOWN_RATIO) {
        detectedAction = "SLEEPING";
        warningMsg = "Đang gục đầu xuống thấp";
      } else if (eyeLevelDiff > this.THRESHOLDS.SIDE_TILT) {
        detectedAction = "SLEEPING_SIDEWAY";
        warningMsg = "Đang nằm gục ra bàn";
      } else if (turnRatio < this.THRESHOLDS.TURN_RATIO_MIN) {
        detectedAction = "LOOKING_RIGHT";
        warningMsg = "Quay sang Phải";
      } else if (turnRatio > this.THRESHOLDS.TURN_RATIO_MAX) {
        detectedAction = "LOOKING_LEFT";
        warningMsg = "Quay sang Trái";
      }

      // Xử lý bộ đếm vi phạm
      if (detectedAction !== "NORMAL") {
        this.violationStreak++;
      } else {
        // Nếu ngồi nghiêm túc, giảm dần bộ đếm (tha thứ dần dần)
        if (this.violationStreak > 0) this.violationStreak--;
        this.hasSentAlert = false;
      }
    }

    // --- GỬI CẢNH BÁO ---
    let shouldAlertAdmin = false;

    // Giới hạn max streak để không bị tràn số
    if (this.violationStreak > 100) this.violationStreak = 100;

    // Chỉ báo giáo viên khi đầy thanh (>= 40)
    if (
      this.violationStreak >= this.ALERT_TRIGGER_COUNT &&
      !this.hasSentAlert
    ) {
      shouldAlertAdmin = true;
      this.hasSentAlert = true;
    }

    return {
      status: detectedAction,
      message: warningMsg,
      streak: this.violationStreak,
      shouldAlertAdmin: shouldAlertAdmin,
      debugValue: debugValue,
    };
  }
}
