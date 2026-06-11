import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  MOTION_LIMITS,
  clampRotationSpeed,
  effectiveRotationSpeed,
} from "./motionConfig";

/**
 * Property-based test cho `effectiveRotationSpeed`.
 *
 * Tốc độ quay hiệu dụng dùng chung cho Cube_Logo (Req 6.7) và Earth_Globe
 * (Req 11.4): luôn bị kẹp về `[0, MOTION_LIMITS.maxRotationRevPerSec]` và bằng
 * `0` khi Reduced_Motion_Mode bật.
 *
 * _Requirements: 6.7, 11.4_
 */
describe("effectiveRotationSpeed", () => {
  // Feature: portfolio-3d-asset-suite, Property 8: Tốc độ quay liên tục bị kẹp và bằng 0 khi giảm chuyển động
  // Validates: Requirements 6.7, 11.4
  it("trả về 0 khi giảm chuyển động, ngược lại là tốc độ đã kẹp trong [0, trần]", () => {
    fc.assert(
      fc.property(
        // baseSpeed: tốc độ quay nền (vòng/giây), phủ cả âm/dưới trần/vượt trần.
        fc.double({ min: -10, max: 10, noNaN: true, noDefaultInfinity: true }),
        // reduced: trạng thái Reduced_Motion_Mode.
        fc.boolean(),
        (baseSpeed, reduced) => {
          const result = effectiveRotationSpeed(baseSpeed, reduced);

          // Luôn bị kẹp trong dải hợp lệ, không bao giờ âm hay vượt trần.
          expect(result).toBeGreaterThanOrEqual(0);
          expect(result).toBeLessThanOrEqual(MOTION_LIMITS.maxRotationRevPerSec);

          if (reduced) {
            // Giảm chuyển động => dừng quay hoàn toàn.
            expect(result).toBe(0);
          } else {
            // Không giảm chuyển động => bằng đúng tốc độ nền đã kẹp.
            expect(result).toBe(clampRotationSpeed(baseSpeed));
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
