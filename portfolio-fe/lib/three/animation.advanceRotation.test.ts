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

  // Feature: portfolio-3d-asset-suite, Property 2: Chuyển động theo delta-time độc lập với FPS
  // Validates: Requirements 1.6, 6.4
  it("góc tích lũy chia nhỏ delta ≈ một bước duy nhất speed*T (độc lập 30–120 FPS)", () => {
    fc.assert(
      fc.property(
        // startAngle: góc xoay khởi đầu (rad)
        fc.double({ min: -100, max: 100, noNaN: true, noDefaultInfinity: true }),
        // speed: tốc độ quay hữu hạn (rad/s), trong giới hạn Motion_Config thực tế
        fc.double({ min: -10, max: 10, noNaN: true, noDefaultInfinity: true }),
        // totalTime T >= 0: tổng thời gian mô phỏng (giây)
        fc.double({ min: 0, max: 60, noNaN: true, noDefaultInfinity: true }),
        // fps: số khung hình mỗi giây trong dải 30–120 để chia T thành các bước delta đều
        fc.integer({ min: 30, max: 120 }),
        (startAngle, speed, totalTime, fps) => {
          // Chia tổng thời gian T thành các bước delta = 1/fps (mô phỏng render theo FPS).
          const deltaSec = 1 / fps;
          const fullSteps = Math.floor(totalTime / deltaSec);

          let folded = startAngle;
          for (let i = 0; i < fullSteps; i += 1) {
            folded = advanceRotation(folded, deltaSec, speed);
          }
          // Bước cuối bù phần dư để tổng các delta đúng bằng T.
          const remainder = totalTime - fullSteps * deltaSec;
          folded = advanceRotation(folded, remainder, speed);

          // Một bước duy nhất với delta = T: kết quả lý thuyết startAngle + speed*T.
          const single = advanceRotation(startAngle, totalTime, speed);

          // Dung sai tuyệt đối + tương đối để bù tích lũy sai số dấu phẩy động qua nhiều bước.
          const tolerance = 1e-6 * (1 + Math.abs(single));
          expect(Math.abs(folded - single)).toBeLessThanOrEqual(tolerance);
        },
      ),
      { numRuns: 100 },
    );
  });
});
