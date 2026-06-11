/**
 * Logic giám sát FPS thuần (không phụ thuộc React / WebGL).
 *
 * Tách khỏi render để có thể kiểm thử dựa trên thuộc tính: tính FPS trung bình
 * trong một cửa sổ thời gian trượt và quyết định khi nào nên hạ Graphics_Tier.
 *
 * Nguyên tắc:
 * - `pushSample` là hàm THUẦN, không side-effect, trả về state mới.
 * - Cửa sổ được giới hạn bởi `windowMs`; khi vượt quá, các mẫu cũ bị cắt theo
 *   tỉ lệ để giữ nguyên FPS trung bình tức thời (frames / duration).
 * - `shouldDowngrade` chỉ bật `true` ĐÚNG MỘT LẦN tại thời điểm `belowThresholdMs`
 *   lần đầu vượt `sustainedMs` (phát hiện cạnh lên), tránh phát tín hiệu lặp lại.
 *
 * _Requirements: 8.1, 8.2_
 */

/** Cấu hình giám sát FPS. */
export interface FpsMonitorConfig {
  /** Cửa sổ tính trung bình tính bằng mili-giây (ví dụ 1000ms). */
  windowMs: number;
  /** Ngưỡng FPS tối thiểu; dưới mức này coi là "thấp" (ví dụ 40). */
  minFps: number;
  /** Thời lượng liên tục dưới ngưỡng trước khi hạ tier (ví dụ 2000ms). */
  sustainedMs: number;
}

/** Một mẫu delta-time của một khung hình. */
export interface FpsSample {
  /** Thời gian trôi qua của một frame tính bằng mili-giây. */
  deltaMs: number;
}

/** Trạng thái bất biến của bộ giám sát FPS. */
export interface FpsMonitorState {
  /** Tổng thời lượng (ms) các mẫu hiện nằm trong cửa sổ. */
  windowDurationMs: number;
  /** Số frame (có thể là số thực sau khi cắt theo tỉ lệ) trong cửa sổ. */
  windowFrames: number;
  /** Thời lượng liên tục (ms) mà FPS trung bình nằm dưới ngưỡng. */
  belowThresholdMs: number;
  /** Tín hiệu hạ tier — `true` đúng một lần khi `belowThresholdMs` vượt `sustainedMs`. */
  shouldDowngrade: boolean;
}

/** Khởi tạo state rỗng cho bộ giám sát FPS. */
export function initFpsState(): FpsMonitorState {
  return {
    windowDurationMs: 0,
    windowFrames: 0,
    belowThresholdMs: 0,
    shouldDowngrade: false,
  };
}

/**
 * FPS trung bình hiện tại trong cửa sổ = windowFrames / (windowDurationMs / 1000).
 * Chống chia cho 0: trả về 0 khi chưa có thời lượng nào.
 */
export function averageFps(state: FpsMonitorState): number {
  if (state.windowDurationMs <= 0) {
    return 0;
  }
  return (state.windowFrames * 1000) / state.windowDurationMs;
}

/**
 * Nạp một mẫu delta-time, trả về state mới. Thuần, không side-effect.
 *
 * - Tích lũy mẫu vào cửa sổ trượt có thời lượng tối đa `windowMs`. Khi tổng thời
 *   lượng vượt `windowMs`, cắt theo tỉ lệ (giữ nguyên tỉ số frames/duration nên
 *   FPS trung bình tức thời không đổi do việc cắt).
 * - Nếu FPS trung bình < `minFps`, cộng dồn `deltaMs` vào `belowThresholdMs`;
 *   ngược lại đặt lại `belowThresholdMs = 0`.
 * - `shouldDowngrade` bật `true` đúng một lần ở thời điểm `belowThresholdMs` lần
 *   đầu đạt/vượt `sustainedMs` (cạnh lên); các frame sau đó giữ `false` cho tới
 *   khi FPS hồi phục rồi lại sụt đủ lâu.
 *
 * _Requirements: 8.1, 8.2_
 */
export function pushSample(
  state: FpsMonitorState,
  sample: FpsSample,
  config: FpsMonitorConfig,
): FpsMonitorState {
  const deltaMs = sample.deltaMs;

  // Cập nhật cửa sổ trượt.
  let windowDurationMs = state.windowDurationMs + deltaMs;
  let windowFrames = state.windowFrames + 1;

  // Cắt theo tỉ lệ khi vượt trần thời lượng cửa sổ, giữ nguyên FPS trung bình.
  if (config.windowMs > 0 && windowDurationMs > config.windowMs) {
    const scale = config.windowMs / windowDurationMs;
    windowDurationMs = config.windowMs;
    windowFrames = windowFrames * scale;
  }

  const avg =
    windowDurationMs > 0 ? (windowFrames * 1000) / windowDurationMs : 0;

  // Theo dõi thời lượng liên tục dưới ngưỡng.
  const isBelow = avg < config.minFps;
  const belowThresholdMs = isBelow ? state.belowThresholdMs + deltaMs : 0;

  // Phát hiện cạnh lên: chỉ bật shouldDowngrade khi lần đầu vượt sustainedMs.
  const wasFlagged = state.belowThresholdMs >= config.sustainedMs;
  const shouldDowngrade = !wasFlagged && belowThresholdMs >= config.sustainedMs;

  return {
    windowDurationMs,
    windowFrames,
    belowThresholdMs,
    shouldDowngrade,
  };
}
