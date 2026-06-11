/**
 * Các hàm thuần cho pipeline hậu kỳ (Post_Processing_Pipeline) của cảnh 3D Hero.
 *
 * Logic quyết định hiệu ứng nào được bật và tính các tham số hậu kỳ (ví dụ cường
 * độ bloom) được tách thành hàm thuần để kiểm thử dựa trên thuộc tính
 * (property-based testing) mà không cần WebGL context. Component
 * `hero/PostProcessing.tsx` chỉ là lớp mỏng tiêu thụ các hàm này để dựng
 * `<EffectComposer>` cùng `<Bloom>`/`<Vignette>`.
 *
 * _Requirements: 2.3, 2.5_
 */

/** Tên định danh của một hiệu ứng hậu kỳ khả dụng. */
export type EffectName = "bloom" | "vignette";

/** Cờ bật/tắt từng hiệu ứng hậu kỳ, độc lập với nhau. */
export interface EffectFlags {
  /** Bật hiệu ứng bloom (quầng sáng vùng phát sáng). */
  enableBloom: boolean;
  /** Bật hiệu ứng vignette (tối nhẹ các góc khung hình). */
  enableVignette: boolean;
}

/**
 * Cường độ bloom mặc định/tĩnh.
 *
 * Đây cũng là giá trị được trả về khi Reduced_Motion_Mode bật, đảm bảo tham số
 * hậu kỳ không dao động theo thời gian.
 */
export const BLOOM_BASE_INTENSITY = 1.0;

/**
 * Biên độ dao động cường độ bloom khi KHÔNG ở Reduced_Motion_Mode.
 *
 * Cường độ sẽ dao động quanh `BLOOM_BASE_INTENSITY` trong khoảng
 * `±BLOOM_PULSE_AMPLITUDE` theo thời gian để tạo hiệu ứng "thở" tinh tế.
 */
export const BLOOM_PULSE_AMPLITUDE = 0.25;

/** Tần số dao động cường độ bloom (rad/s) khi không giảm chuyển động. */
export const BLOOM_PULSE_FREQUENCY = 1.5;

/**
 * Dựng tập hiệu ứng hậu kỳ được bật từ các cờ độc lập.
 *
 * Mảng kết quả chứa `"bloom"` khi và chỉ khi `enableBloom` là true, và chứa
 * `"vignette"` khi và chỉ khi `enableVignette` là true. Trạng thái của một cờ
 * không ảnh hưởng tới sự hiện diện của hiệu ứng còn lại (hoàn toàn độc lập).
 *
 * Trả về mảng `EffectName[]` để component có thể kiểm tra membership thuận tiện.
 *
 * _Requirements: 2.3_
 */
export function buildEnabledEffects({
  enableBloom,
  enableVignette,
}: EffectFlags): EffectName[] {
  const effects: EffectName[] = [];
  if (enableBloom) {
    effects.push("bloom");
  }
  if (enableVignette) {
    effects.push("vignette");
  }
  return effects;
}

/**
 * Tính cường độ bloom tại một thời điểm.
 *
 * - Khi `reducedMotion === true`: bỏ qua `elapsedSec` và trả về hằng số tĩnh
 *   `BLOOM_BASE_INTENSITY`, nên giá trị không dao động theo thời gian.
 * - Khi `reducedMotion === false`: cường độ dao động hình sin quanh
 *   `BLOOM_BASE_INTENSITY` với biên độ `BLOOM_PULSE_AMPLITUDE`.
 *
 * _Requirements: 2.5_
 */
export function computeBloomIntensity(
  elapsedSec: number,
  reducedMotion: boolean,
): number {
  if (reducedMotion) {
    return BLOOM_BASE_INTENSITY;
  }
  return (
    BLOOM_BASE_INTENSITY +
    BLOOM_PULSE_AMPLITUDE * Math.sin(BLOOM_PULSE_FREQUENCY * elapsedSec)
  );
}
