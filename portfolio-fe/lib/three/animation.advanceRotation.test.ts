import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { advanceRotation } from "./animation";

/**
 * Property-based test cho `advanceRotation`.
 *
 * _Requirements: 5.2_
 */
describe("advanceRotation", () => {
  // Feature: hero-3d-visual-enhancement, Property 10: Chuyển động dựa trên delta-time độc lập với số khung hình
  // Validates: Requirements 5.2
  it("tích lũy nhiều bước delta nhỏ ≈ một bước duy nhất với delta = tổng thời gian", () => {
    fc.assert(
      fc.property(
        // startAngle: góc xoay khởi đầu (rad)
        fc.double({ min: -100, max: 100, noNaN: true, noDefaultInfinity: true }),
        // speed: tốc độ xoay hữu hạn (rad/s)
        fc.double({ min: -50, max: 50, noNaN: true, noDefaultInfinity: true }),
        // steps: phân hoạch tổng thời gian T thành nhiều bước delta dương nhỏ
        fc.array(
          fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),
          { minLength: 1, maxLength: 200 },
        ),
        (startAngle, speed, steps) => {
          // Tích lũy advanceRotation qua từng bước delta nhỏ.
          const folded = steps.reduce(
            (angle, deltaSec) => advanceRotation(angle, deltaSec, speed),
            startAngle,
          );

          // Một bước duy nhất với delta = T (tổng các bước).
          const total = steps.reduce((sum, deltaSec) => sum + deltaSec, 0);
          const single = advanceRotation(startAngle, total, speed);

          // Dung sai tuyệt đối + tương đối để bù tích lũy sai số dấu phẩy động.
          const tolerance = 1e-6 * (1 + Math.abs(single));
          expect(Math.abs(folded - single)).toBeLessThanOrEqual(tolerance);
        },
      ),
      { numRuns: 100 },
    );
  });
});
