/**
 * Logic thuần cho Camera_Rig của cảnh 3D Hero.
 *
 * Tách khỏi component R3F để có thể kiểm thử dựa trên thuộc tính mà không cần
 * một WebGL context thực. Gồm: tính mục tiêu parallax đã kẹp trong biên,
 * kẹp một offset, và nội suy tuyến tính có hệ số mượt.
 *
 * _Requirements: 6.1, 6.2, 6.4_
 */

/** Vị trí con trỏ chuột hoặc điểm chạm, chuẩn hóa về `[-1, 1]`. */
export interface PointerInput {
  /** Toạ độ ngang chuẩn hóa (lý tưởng trong `[-1, 1]`, nhưng có thể ngoài biên). */
  x: number;
  /** Toạ độ dọc chuẩn hóa (lý tưởng trong `[-1, 1]`, nhưng có thể ngoài biên). */
  y: number;
}

/** Biên độ dịch chuyển tối đa của camera theo từng trục. */
export interface RigBounds {
  /** Biên độ dịch tối đa theo trục X (không âm). */
  maxOffsetX: number;
  /** Biên độ dịch tối đa theo trục Y (không âm). */
  maxOffsetY: number;
}

/**
 * Kẹp một offset vào khoảng `[-max, max]`.
 *
 * `max` được lấy giá trị tuyệt đối để biên luôn đối xứng quanh 0, an toàn với
 * cả đầu vào âm. Với `value` là `NaN`, kết quả là `0` để tránh lan truyền NaN
 * vào vị trí camera.
 *
 * _Requirements: 6.2_
 */
export function clampOffset(value: number, max: number): number {
  const bound = Math.abs(max);
  if (Number.isNaN(value)) {
    return 0;
  }
  if (value > bound) {
    return bound;
  }
  if (value < -bound) {
    return -bound;
  }
  return value;
}

/**
 * Tính mục tiêu camera từ vị trí con trỏ, đã kẹp trong biên.
 *
 * Toạ độ pointer chuẩn hóa được ánh xạ tuyến tính sang offset
 * (`x * maxOffsetX`, `y * maxOffsetY`) rồi kẹp lại để an toàn với các giá trị
 * pointer ngoài khoảng `[-1, 1]` (dù nguồn là chuột hay điểm chạm). Kết quả
 * luôn thỏa `|x| <= maxOffsetX` và `|y| <= maxOffsetY`.
 *
 * _Requirements: 6.1, 6.2, 6.4_
 */
export function computeParallaxTarget(
  pointer: PointerInput,
  bounds: RigBounds,
): { x: number; y: number } {
  return {
    x: clampOffset(pointer.x * bounds.maxOffsetX, bounds.maxOffsetX),
    y: clampOffset(pointer.y * bounds.maxOffsetY, bounds.maxOffsetY),
  };
}

/**
 * Nội suy tuyến tính có hệ số mượt `alpha`.
 *
 * Với `alpha` trong `(0, 1)`, kết quả luôn nằm giữa `current` và `target`; việc
 * áp dụng lặp lại với cùng `target` tạo ra dãy hội tụ đơn điệu về `target`
 * (khoảng cách tới `target` không tăng). Công thức `current + (target - current)
 * * alpha` đảm bảo tính này nhờ chỉ co khoảng cách theo hệ số `(1 - alpha)`.
 *
 * _Requirements: 6.1_
 */
export function lerp(current: number, target: number, alpha: number): number {
  return current + (target - current) * alpha;
}
