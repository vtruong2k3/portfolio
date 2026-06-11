import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  MOTION_LIMITS,
  clampMotionConfig,
  type MotionConfig,
} from "./motionConfig";

/**
 * Property-based test cho `clampMotionConfig`.
 *
 * _Requirements: 1.4, 1.5, 1.7_
 */
describe("clampMotionConfig", () => {
  // Feature: portfolio-3d-asset-suite, Property 1: Motion_Config được kẹp về trong giới hạn và ổn định
  // Validates: Requirements 1.4, 1.5, 1.7
  it("kẹp mọi MotionConfig về trong giới hạn cho phép và phép kẹp là idempotent", () => {
    fc.assert(
      fc.property(
        // maxTranslation: số bất kỳ (kể cả âm/vượt trần) để kiểm tra kẹp
        fc.double({ min: -1000, max: 1000, noNaN: true, noDefaultInfinity: true }),
        // maxRotationRevPerSec: số bất kỳ (kể cả âm/vượt trần)
        fc.double({ min: -1000, max: 1000, noNaN: true, noDefaultInfinity: true }),
        // minCyclePeriodSec: số bất kỳ (kể cả dưới sàn)
        fc.double({ min: -1000, max: 1000, noNaN: true, noDefaultInfinity: true }),
        (maxTranslation, maxRotationRevPerSec, minCyclePeriodSec) => {
          const input: MotionConfig = {
            maxTranslation,
            maxRotationRevPerSec,
            minCyclePeriodSec,
          };

          const clamped = clampMotionConfig(input);

          // maxTranslation nằm trong [0, MOTION_LIMITS.maxTranslation] (Req 1.4).
          expect(clamped.maxTranslation).toBeGreaterThanOrEqual(0);
          expect(clamped.maxTranslation).toBeLessThanOrEqual(
            MOTION_LIMITS.maxTranslation,
          );

          // maxRotationRevPerSec nằm trong [0, MOTION_LIMITS.maxRotationRevPerSec] (Req 1.4).
          expect(clamped.maxRotationRevPerSec).toBeGreaterThanOrEqual(0);
          expect(clamped.maxRotationRevPerSec).toBeLessThanOrEqual(
            MOTION_LIMITS.maxRotationRevPerSec,
          );

          // minCyclePeriodSec >= sàn MOTION_LIMITS.minCyclePeriodSec (Req 1.5).
          expect(clamped.minCyclePeriodSec).toBeGreaterThanOrEqual(
            MOTION_LIMITS.minCyclePeriodSec,
          );

          // Idempotent: clamp(clamp(x)) === clamp(x) (Req 1.7).
          const twice = clampMotionConfig(clamped);
          expect(twice.maxTranslation).toBe(clamped.maxTranslation);
          expect(twice.maxRotationRevPerSec).toBe(clamped.maxRotationRevPerSec);
          expect(twice.minCyclePeriodSec).toBe(clamped.minCyclePeriodSec);
        },
      ),
      { numRuns: 100 },
    );
  });
});
