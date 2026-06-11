/**
 * Cấu hình chuyển động dùng chung (Motion_Config) cho toàn bộ Asset_Suite.
 *
 * Module này là **nguồn chân lý** cho mọi biên độ dịch chuyển, tốc độ quay và
 * chu kỳ lặp của các tài sản 3D. Toàn bộ logic ở đây là **hàm thuần, tất định**
 * (không truy cập browser API, không side-effect) nên có thể kiểm thử bằng
 * property-based testing mà không cần WebGL context. Các component R3F chỉ là
 * lớp mỏng tiêu thụ các giá trị/hàm này.
 *
 * Theo Art_Direction, mọi chuyển động bị giới hạn cứng theo `MOTION_LIMITS`:
 * - biên độ dịch chuyển ≤ 0.5 đơn vị thế giới (Req 1.4),
 * - tốc độ quay ≤ 0.1 vòng/giây (Req 1.4),
 * - mỗi chu kỳ lặp kéo dài tối thiểu 4 giây (Req 1.5).
 *
 * Khi một giá trị vượt ngưỡng, nó được **kẹp (clamp)** về ngưỡng gần nhất
 * (Req 1.7). Phép kẹp là idempotent: `clamp(clamp(x)) === clamp(x)`.
 *
 * _Requirements: 1.4, 1.5, 1.7, 6.7, 11.4_
 */

/** Cấu hình giới hạn chuyển động dùng chung của Asset_Suite. */
export interface MotionConfig {
  /** Biên độ dịch chuyển tối đa (đơn vị thế giới). Trần: 0.5 (Req 1.4). */
  maxTranslation: number;
  /** Tốc độ quay tối đa (vòng/giây). Trần: 0.1 rev/s (Req 1.4). */
  maxRotationRevPerSec: number;
  /** Chu kỳ lặp tối thiểu (giây). Sàn: 4s (Req 1.5). */
  minCyclePeriodSec: number;
}

/**
 * Ngưỡng cứng theo Art_Direction (Req 1.4, 1.5).
 *
 * Đây là biên không thể vượt qua cho mọi chuyển động của Asset_Suite.
 */
export const MOTION_LIMITS = {
  maxTranslation: 0.5,
  maxRotationRevPerSec: 0.1,
  minCyclePeriodSec: 4,
} as const;

/**
 * Kẹp biên độ dịch chuyển về khoảng `[0, MOTION_LIMITS.maxTranslation]`. Thuần.
 *
 * Giá trị âm hoặc `NaN` được đưa về `0`; giá trị vượt trần được đưa về trần.
 * Idempotent: kẹp lần hai cho cùng kết quả.
 *
 * _Requirements: 1.4, 1.7_
 */
export function clampTranslation(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  return Math.min(value, MOTION_LIMITS.maxTranslation);
}

/**
 * Kẹp tốc độ quay (vòng/giây) về `[0, MOTION_LIMITS.maxRotationRevPerSec]`. Thuần.
 *
 * Giá trị âm hoặc `NaN` được đưa về `0`; giá trị vượt trần được đưa về trần.
 * Idempotent.
 *
 * _Requirements: 1.4, 1.7_
 */
export function clampRotationSpeed(revPerSec: number): number {
  if (!Number.isFinite(revPerSec) || revPerSec < 0) {
    return 0;
  }
  return Math.min(revPerSec, MOTION_LIMITS.maxRotationRevPerSec);
}

/**
 * Ép chu kỳ lặp không nhỏ hơn `MOTION_LIMITS.minCyclePeriodSec`. Thuần.
 *
 * Giá trị nhỏ hơn sàn (kể cả `NaN`/âm) được đưa về sàn; giá trị lớn hơn giữ
 * nguyên (chu kỳ dài hơn = chuyển động chậm hơn, luôn hợp lệ). Idempotent.
 *
 * _Requirements: 1.5, 1.7_
 */
export function clampCyclePeriod(periodSec: number): number {
  if (!Number.isFinite(periodSec) || periodSec < MOTION_LIMITS.minCyclePeriodSec) {
    return MOTION_LIMITS.minCyclePeriodSec;
  }
  return periodSec;
}

/**
 * Kẹp một `MotionConfig` về trong các ngưỡng cho phép (Req 1.7). Thuần.
 *
 * Áp dụng `clampTranslation`, `clampRotationSpeed`, `clampCyclePeriod` cho từng
 * trường tương ứng. Vì mỗi hàm thành phần là idempotent nên `clampMotionConfig`
 * cũng idempotent: `clampMotionConfig(clampMotionConfig(x))` bằng
 * `clampMotionConfig(x)`.
 *
 * _Requirements: 1.4, 1.5, 1.7_
 */
export function clampMotionConfig(input: MotionConfig): MotionConfig {
  return {
    maxTranslation: clampTranslation(input.maxTranslation),
    maxRotationRevPerSec: clampRotationSpeed(input.maxRotationRevPerSec),
    minCyclePeriodSec: clampCyclePeriod(input.minCyclePeriodSec),
  };
}

/**
 * Tốc độ quay hiệu dụng (vòng/giây) sau khi xét Reduced_Motion_Mode. Thuần.
 *
 * - Khi `reduced === true`: trả về `0` (dừng quay hoàn toàn).
 * - Khi `reduced === false`: trả về `baseSpeed` đã kẹp về
 *   `[0, MOTION_LIMITS.maxRotationRevPerSec]`.
 *
 * Dùng cho Cube_Logo (Req 6.7) và Earth_Globe (Req 11.4).
 *
 * _Requirements: 6.7, 11.4_
 */
export function effectiveRotationSpeed(baseSpeed: number, reduced: boolean): number {
  if (reduced) {
    return 0;
  }
  return clampRotationSpeed(baseSpeed);
}
