// frontend/src/ai/FatigueDetector.js

export class FatigueDetector {
  constructor() {
    this.THRESHOLDS = {
      HEAD_DOWN_RATIO: 0.5,
      SIDE_TILT: 0.25,
      TURN_RATIO_MIN: 0.3,
      TURN_RATIO_MAX: 3.0,

      MIN_FACE_WIDTH: 0.12, // Khoảng cách 2m

      // --- ĐÃ CHỈNH NHẸ LẠI: NỚI LỎNG NGƯỠNG ÁNH MẮT ---
      // Giá trị chuẩn khi nhìn thẳng là ~0.5
      GAZE_X_LEFT: 0.3, // Cũ: 0.40 -> Mới: 0.30 (Phải liếc sâu sang trái mới phạt)
      GAZE_X_RIGHT: 0.7, // Cũ: 0.60 -> Mới: 0.70 (Phải liếc sâu sang phải mới phạt)
      GAZE_Y_DOWN: 0.75, // Cũ: 0.65 -> Mới: 0.75 (Phải nhìn hẳn xuống dưới đùi/bàn mới phạt)
    };

    this.violationStreak = 0;
    this.hasSentAlert = false;
    this.ALERT_TRIGGER_COUNT = 40;
    this.lastViolationTime = Date.now();
    this.FORGIVE_TIME_MS = 5 * 60 * 1000;
  }

  // Hàm phụ trợ tính tỷ lệ % vị trí của điểm trong một khoảng
  _getRatio(val, min, max) {
    if (max === min) return 0.5;
    const ratio = (val - min) / (max - min);
    return Math.max(0, Math.min(1, ratio));
  }

  analyze(landmarks) {
    let detectedAction = "NORMAL";
    let warningMsg = "";
    let debugValue = 0;

    if (!landmarks) {
      detectedAction = "MISSING";
      warningMsg = "⚠️ VẮNG MẶT / MẤT TÍN HIỆU";
      this.violationStreak += 2;
      this.lastViolationTime = Date.now();
    } else {
      const nose = landmarks[1];
      const chin = landmarks[152];
      const leftEye = landmarks[33];
      const rightEye = landmarks[263];
      const leftCheek = landmarks[234];
      const rightCheek = landmarks[454];

      const faceWidth = Math.abs(leftCheek.x - rightCheek.x);

      // ==========================================
      // LOGIC ĐẢO MẮT (ĐÃ NỚI LỎNG)
      // ==========================================
      let isLookingAway = false;
      let gazeMsg = "";

      if (landmarks[468] && landmarks[473]) {
        const leftIris = landmarks[468];
        const leftOuter = landmarks[33],
          leftInner = landmarks[133];
        const leftTop = landmarks[159],
          leftBot = landmarks[145];

        const rightIris = landmarks[473];
        const rightInner = landmarks[362],
          rightOuter = landmarks[263];
        const rightTop = landmarks[386],
          rightBot = landmarks[374];

        // 1. TÍNH LIẾC NGANG
        const leftMinX = Math.min(leftOuter.x, leftInner.x);
        const leftMaxX = Math.max(leftOuter.x, leftInner.x);
        const rightMinX = Math.min(rightOuter.x, rightInner.x);
        const rightMaxX = Math.max(rightOuter.x, rightInner.x);

        const leftGazeX = this._getRatio(leftIris.x, leftMinX, leftMaxX);
        const rightGazeX = this._getRatio(rightIris.x, rightMinX, rightMaxX);
        const avgGazeX = (leftGazeX + rightGazeX) / 2;

        // 2. TÍNH NHÌN XUỐNG
        const leftMinY = Math.min(leftTop.y, leftBot.y);
        const leftMaxY = Math.max(leftTop.y, leftBot.y);
        const rightMinY = Math.min(rightTop.y, rightBot.y);
        const rightMaxY = Math.max(rightTop.y, rightBot.y);

        const leftGazeY = this._getRatio(leftIris.y, leftMinY, leftMaxY);
        const rightGazeY = this._getRatio(rightIris.y, rightMinY, rightMaxY);
        const avgGazeY = (leftGazeY + rightGazeY) / 2;

        debugValue = avgGazeX;

        // 3. SO SÁNH VỚI NGƯỠNG MỚI
        if (avgGazeX < this.THRESHOLDS.GAZE_X_LEFT) {
          isLookingAway = true;
          gazeMsg = "Đang liếc mắt nhìn tài liệu (Trái)";
        } else if (avgGazeX > this.THRESHOLDS.GAZE_X_RIGHT) {
          isLookingAway = true;
          gazeMsg = "Đang liếc mắt nhìn tài liệu (Phải)";
        } else if (avgGazeY > this.THRESHOLDS.GAZE_Y_DOWN) {
          isLookingAway = true;
          gazeMsg = "Đang liếc mắt xuống dưới";
        }
      }
      // ==========================================

      const midEyeY = (leftEye.y + rightEye.y) / 2;
      const distEyeToNose = Math.abs(nose.y - midEyeY);
      const distNoseToChin = Math.abs(chin.y - nose.y);
      const headDownRatio = distNoseToChin / (distEyeToNose + 0.0001);
      const eyeLevelDiff = Math.abs(leftEye.y - rightEye.y);
      const distToLeft = Math.abs(nose.x - leftCheek.x);
      const distToRight = Math.abs(nose.x - rightCheek.x);
      const turnRatio = distToLeft / (distToRight + 0.0001);

      // KIỂM TRA VI PHẠM TỪ NẶNG ĐẾN NHẸ
      if (faceWidth < this.THRESHOLDS.MIN_FACE_WIDTH) {
        detectedAction = "TOO_FAR";
        warningMsg = "Ngồi quá xa (Yêu cầu cách Camera < 2m)";
      } else if (headDownRatio < this.THRESHOLDS.HEAD_DOWN_RATIO) {
        detectedAction = "SLEEPING";
        warningMsg = "Đang gục đầu xuống thấp";
      } else if (eyeLevelDiff > this.THRESHOLDS.SIDE_TILT) {
        detectedAction = "SLEEPING_SIDEWAY";
        warningMsg = "Đang nằm gục ra bàn";
      } else if (turnRatio < this.THRESHOLDS.TURN_RATIO_MIN) {
        detectedAction = "LOOKING_RIGHT";
        warningMsg = "Quay mặt sang Phải";
      } else if (turnRatio > this.THRESHOLDS.TURN_RATIO_MAX) {
        detectedAction = "LOOKING_LEFT";
        warningMsg = "Quay mặt sang Trái";
      } else if (isLookingAway) {
        detectedAction = "EYES_AWAY";
        warningMsg = gazeMsg;
      }

      // XỬ LÝ THANH TÍCH ĐIỂM
      if (detectedAction !== "NORMAL") {
        this.violationStreak++;
        this.lastViolationTime = Date.now();
      } else {
        const timeSinceLastViolation = Date.now() - this.lastViolationTime;
        if (timeSinceLastViolation > this.FORGIVE_TIME_MS) {
          this.violationStreak = 0;
          this.hasSentAlert = false;
        }
      }
    }

    if (this.violationStreak > 100) this.violationStreak = 100;

    let shouldAlertAdmin = false;
    if (
      this.violationStreak >= this.ALERT_TRIGGER_COUNT &&
      !this.hasSentAlert
    ) {
      shouldAlertAdmin = true;
      this.hasSentAlert = true;
    }

    if (this.violationStreak < this.ALERT_TRIGGER_COUNT) {
      this.hasSentAlert = false;
    }

    return {
      status: detectedAction,
      message: warningMsg,
      streak: this.violationStreak,
      shouldAlertAdmin: shouldAlertAdmin,
      debugValue: debugValue,
      alertTriggerCount: this.ALERT_TRIGGER_COUNT,
    };
  }
}
  