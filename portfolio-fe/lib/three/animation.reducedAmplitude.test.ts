import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  REDUCED_AMPLITUDE_MAX,
  reducedAmplitude,
  type FloatConfig,
} from "./animation";

/**
 * Property-based test cho `reducedAmplitude`.
 *
 * _Requirements: 5.3_
 */
describe("reducedAmplitude", () => {
  // Feature: hero-3d-visual-enhancement, Property 11: Chế độ giảm chuyển động làm giảm biên độ trong ngưỡng
  // Validates: Requirements 5.3
  it("reduced=true kẹp biên độ <= biên độ gốc và <= ngưỡng; reduced=false giữ nguyên cấu hình", () => {
    fc.assert(
      fc.property(
        // amplitude: không âm (biên độ dao động vị trí)
        fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true }),
        // frequency: số hữu hạn (rad/s)
        fc.double({ noNaN: true, noDefaultInfinity: true }),
        // phase: lệch pha hữu hạn (rad)
        fc.double({ noNaN: true, noDefaultInfinity: true }),
        (amplitude, frequency, phase) => {
          const config: FloatConfig = { amplitude, frequency, phase };

          // reduced=true: biên độ bị kẹp xuống không vượt quá cả gốc lẫn ngưỡng.
          const reduced = reducedAmplitude(config, true);
          expect(reduced.amplitude).toBeLessThanOrEqual(config.amplitude);
          expect(reduced.amplitude).toBeLessThanOrEqual(REDUCED_AMPLITUDE_MAX);

          // reduced=false: giữ nguyên biên độ và các trường khác.
          const unchanged = reducedAmplitude(config, false);
          expect(unchanged.amplitude).toBe(config.amplitude);
          expect(unchanged.frequency).toBe(config.frequency);
          expect(unchanged.phase).toBe(config.phase);
        },
      ),
      { numRuns: 100 },
    );
  });
});
