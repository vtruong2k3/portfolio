import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { cursorVisible } from "./terminal";

/**
 * Property-based test cho `cursorVisible`.
 *
 * _Requirements: 5.3, 5.5, 10.2_
 */
describe("cursorVisible", () => {
  // Feature: portfolio-3d-asset-suite, Property 7: Con trỏ nhấp nháy tất định và tĩnh khi giảm chuyển động
  // Validates: Requirements 5.3, 5.5, 10.2
  it("nhấp nháy tuần hoàn với phần hiện nửa đầu chu kỳ khi bật, và tĩnh (luôn hiện) khi giảm chuyển động", () => {
    fc.assert(
      fc.property(
        // periodSec: chu kỳ nhấp nháy hợp lệ theo Req 5.3 / 10.2, trong [0.5, 1.0] giây.
        fc.double({
          min: 0.5,
          max: 1.0,
          noNaN: true,
          noDefaultInfinity: true,
        }),
        // phaseFraction ∈ [0, 1): sinh pha trực tiếp trong [0, periodSec) bằng
        // cách nhân với chu kỳ, tránh giả tạo do làm tròn dấu phẩy động khi cộng
        // dồn cycles * periodSec rồi lấy phần dư.
        fc.double({
          min: 0,
          max: 1,
          maxExcluded: true,
          noNaN: true,
          noDefaultInfinity: true,
        }),
        // cycles: số chu kỳ nguyên để kiểm tra tính tuần hoàn cursorVisible(t) === cursorVisible(t + k*period).
        fc.integer({ min: -50, max: 50 }),
        (periodSec, phaseFraction, cycles) => {
          // Pha nằm chắc chắn trong [0, periodSec).
          const phase = phaseFraction * periodSec;
          const half = periodSec / 2;

          // Req 5.5: khi Reduced_Motion_Mode bật, con trỏ luôn tĩnh (luôn hiện)
          // với mọi thời điểm, kể cả tại các thời điểm dịch theo chu kỳ.
          expect(cursorVisible(phase, periodSec, true)).toBe(true);
          expect(
            cursorVisible(phase + cycles * periodSec, periodSec, true),
          ).toBe(true);

          // Dải biên epsilon quanh 0, period/2 và period. `phaseFraction *
          // periodSec` có thể làm tròn lên tới >= periodSec ở sát biên, khiến
          // pha chưa chuẩn hóa lệch khỏi pha đã chuẩn hóa bên trong hàm; bỏ qua
          // các điểm sát biên để kiểm thử ổn định với dấu phẩy động.
          const eps = periodSec * 1e-6;
          const nearBoundary =
            phase < eps ||
            phase > periodSec - eps ||
            Math.abs(phase - half) < eps;

          if (!nearBoundary) {
            // Req 5.3 / 10.2: khi không giảm chuyển động, con trỏ "hiện" đúng
            // nửa đầu của mỗi chu kỳ — pha nằm chắc chắn trong (0, periodSec)
            // nên so sánh với nửa chu kỳ là tất định.
            const visible = cursorVisible(phase, periodSec, false);
            expect(visible).toBe(phase < half);

            // Tất định + tuần hoàn: dịch thời gian một số nguyên lần chu kỳ
            // không đổi trạng thái.
            const shifted = cursorVisible(
              phase + cycles * periodSec,
              periodSec,
              false,
            );
            expect(shifted).toBe(visible);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
