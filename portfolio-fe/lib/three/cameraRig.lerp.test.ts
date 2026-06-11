import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { lerp } from "./cameraRig";

/**
 * Property-based test cho `lerp`.
 *
 * _Requirements: 6.1_
 */
describe("lerp — Property 7", () => {
  // Feature: hero-3d-visual-enhancement, Property 7: Nội suy lerp nằm trong khoảng và hội tụ về mục tiêu
  // Validates: Requirements 6.1
  it("kết quả nằm trong [current, target] và lặp lại hội tụ đơn điệu về target", () => {
    fc.assert(
      fc.property(
        // current: số hữu hạn bị chặn
        fc.double({ min: -1000, max: 1000, noNaN: true, noDefaultInfinity: true }),
        // target: số hữu hạn bị chặn
        fc.double({ min: -1000, max: 1000, noNaN: true, noDefaultInfinity: true }),
        // alpha: trong khoảng mở (0, 1) — dùng cận trên/dưới sát biên
        fc.double({ min: 0.001, max: 0.999, noNaN: true, noDefaultInfinity: true }),
        (current, target, alpha) => {
          const result = lerp(current, target, alpha);

          const lo = Math.min(current, target);
          const hi = Math.max(current, target);

          // Dung sai dấu phẩy động tương đối theo độ lớn của khoảng.
          const epsilon = 1e-9 * (1 + Math.abs(current) + Math.abs(target));

          // 1) Kết quả luôn nằm giữa current và target (kèm dung sai float).
          expect(result).toBeGreaterThanOrEqual(lo - epsilon);
          expect(result).toBeLessThanOrEqual(hi + epsilon);

          // 2) Áp dụng lerp lặp lại với cùng target tạo dãy tiến gần target
          //    một cách đơn điệu: khoảng cách tới target không tăng.
          let value = current;
          let prevDistance = Math.abs(value - target);
          for (let i = 0; i < 20; i += 1) {
            value = lerp(value, target, alpha);
            const distance = Math.abs(value - target);

            // Khoảng cách không tăng (kèm dung sai float).
            const stepEpsilon = 1e-9 * (1 + prevDistance);
            expect(distance).toBeLessThanOrEqual(prevDistance + stepEpsilon);

            prevDistance = distance;
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
