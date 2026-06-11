/**
 * Các hàm thuần cho chuyển động của cảnh 3D Hero.
 *
 * Toàn bộ logic chuyển động (dao động trôi, xoay theo delta-time, giảm biên độ
 * khi reduced motion) được tách thành hàm thuần để kiểm thử dựa trên thuộc tính
 * (property-based testing) mà không cần WebGL context. Các component R3F chỉ là
 * lớp mỏng tiêu thụ các hàm này trong `useFrame`.
 *
 * _Requirements: 5.1, 5.2, 5.3_
 */

/** Cấu hình dao động trôi (floating) của một vật thể. */
export interface FloatConfig {
  /** Biên độ dao động vị trí tối đa (đơn vị thế giới). */
  amplitude: number;
  /** Tần số dao động (rad/s). */
  frequency: number;
  /** Lệch pha để các vật thể trôi lệch nhau (rad). */
  phase: number;
}

/** Cấu hình tốc độ xoay liên tục của một vật thể. */
export interface RotationConfig {
  /** Tốc độ xoay quanh trục X (rad/s). */
  speedX: number;
  /** Tốc độ xoay quanh trục Y (rad/s). */
  speedY: number;
}

/**
 * Biên độ tối đa cho phép khi Reduced_Motion_Mode bật.
 *
 * Khi giảm chuyển động, biên độ dao động bị kẹp xuống không vượt quá ngưỡng nhỏ
 * này để chuyển động trở nên rất tinh tế (gần như tĩnh).
 */
export const REDUCED_AMPLITUDE_MAX = 0.05;

/**
 * Độ lệch vị trí trôi theo thời gian tuyệt đối.
 *
 * Dùng dao động hình sin nên `|kết quả| <= config.amplitude` luôn đúng với mọi
 * thời điểm. Hàm thuần, tất định theo `elapsedSec`.
 *
 * _Requirements: 5.1, 5.2_
 */
export function floatOffset(elapsedSec: number, config: FloatConfig): number {
  return config.amplitude * Math.sin(config.frequency * elapsedSec + config.phase);
}

/**
 * Góc xoay tích lũy dựa trên delta-time: `prevAngle + speed * deltaSec`.
 *
 * Vì là tuyến tính nên việc chia tổng thời gian `T` thành nhiều bước delta nhỏ
 * tạo ra cùng một góc tích lũy (trong dung sai dấu phẩy động) với một bước duy
 * nhất có delta bằng `T`. Điều này khiến tốc độ xoay độc lập với số khung hình
 * (FPS-independent).
 *
 * _Requirements: 5.2_
 */
export function advanceRotation(
  prevAngle: number,
  deltaSec: number,
  speed: number,
): number {
  return prevAngle + speed * deltaSec;
}

/**
 * Trả về cấu hình dao động đã điều chỉnh theo Reduced_Motion_Mode.
 *
 * - Khi `reduced === true`: biên độ bị kẹp xuống `min(amplitude gốc, REDUCED_AMPLITUDE_MAX)`,
 *   nên kết quả không vượt quá cả biên độ gốc lẫn ngưỡng giảm.
 * - Khi `reduced === false`: trả về cấu hình gốc không thay đổi.
 *
 * _Requirements: 5.3_
 */
export function reducedAmplitude(
  config: FloatConfig,
  reduced: boolean,
): FloatConfig {
  if (!reduced) {
    return config;
  }
  return {
    ...config,
    amplitude: Math.min(config.amplitude, REDUCED_AMPLITUDE_MAX),
  };
}
