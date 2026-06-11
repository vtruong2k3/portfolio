/**
 * Hàm thuần cho con trỏ nhấp nháy kiểu terminal.
 *
 * Logic nhấp nháy của con trỏ (Terminal_Screen và Contact_Terminal) được tách
 * thành hàm thuần, tất định để kiểm thử dựa trên thuộc tính (property-based
 * testing) mà không cần WebGL context hay timer thật. Các component R3F/DOM chỉ
 * là lớp mỏng tiêu thụ hàm này trong `useFrame`/`requestAnimationFrame`.
 *
 * _Requirements: 5.3, 5.5, 10.2_
 */

/**
 * Trạng thái hiện/ẩn của con trỏ nhấp nháy tại một thời điểm.
 *
 * - Khi `reduced === false`: con trỏ nhấp nháy tuần hoàn với chu kỳ `periodSec`,
 *   phần "hiện" (visible) chiếm đúng nửa đầu của mỗi chu kỳ và phần "ẩn" chiếm
 *   nửa sau. Cụ thể, với pha `p = elapsedSec mod periodSec` (đã chuẩn hóa về
 *   `[0, periodSec)` kể cả khi `elapsedSec` âm), con trỏ hiện khi `p < periodSec / 2`.
 *   Hàm tuần hoàn: `cursorVisible(t) === cursorVisible(t + periodSec)`.
 * - Khi `reduced === true`: con trỏ giữ trạng thái tĩnh (luôn hiện) với mọi
 *   `elapsedSec`, không nhấp nháy (Req 5.5).
 *
 * Theo Req 5.3, chu kỳ hợp lệ nằm trong khoảng `[0.5, 1.0]` giây; theo Req 10.2,
 * Contact_Terminal dùng chu kỳ 1 giây (hiện 0,5s, ẩn 0,5s). Hàm này không tự kẹp
 * `periodSec` — phía gọi truyền chu kỳ hợp lệ; nếu `periodSec <= 0` thì coi như
 * tĩnh (luôn hiện) để tránh chia cho 0.
 *
 * Hàm thuần, tất định theo `(elapsedSec, periodSec, reduced)`.
 *
 * _Requirements: 5.3, 5.5, 10.2_
 */
export function cursorVisible(
  elapsedSec: number,
  periodSec: number,
  reduced: boolean,
): boolean {
  // Reduced_Motion_Mode: con trỏ tĩnh, luôn hiện, không phụ thuộc thời gian.
  if (reduced) {
    return true;
  }

  // Chu kỳ không hợp lệ → coi như tĩnh để tránh chia cho 0 / NaN.
  if (!(periodSec > 0)) {
    return true;
  }

  // Chuẩn hóa pha về [0, periodSec) kể cả khi elapsedSec âm.
  const phase = ((elapsedSec % periodSec) + periodSec) % periodSec;

  // Phần "hiện" chiếm đúng nửa đầu của chu kỳ.
  return phase < periodSec / 2;
}
