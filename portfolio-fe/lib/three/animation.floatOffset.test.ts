import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { floatOffset, type FloatConfig } from "./animation";

/**
 * Property-based test cho `floatOffset`.
 *
 * _Requirements: 5.1_
 */
describe("floatOffset", () => {
  // Feature: hero-3d-visual-enhancement, Property 9: Biên độ dao động trôi bị chặn bởi cấu hình
  // Validates: Requirements 5.1
  it("|floatOffset(elapsedSec, config)| <= config.amplitude với mọi elapsedSec và FloatConfig", () => {
    fc.assert(
      fc.property(
        // elapsedSec: số hữu hạn trong khoảng thời gian hợp lý
        fc.double({ min: -1e6, max: 1e6, noNaN: true, noDefaultInfinity: true }),
        // amplitude: không âm (biên độ dao động vị trí)
        fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true }),
        // frequency: số hữu hạn (rad/s)
        fc.double({ min: -100, max: 100, noNaN: true, noDefaultInfinity: true }),
        // phase: lệch pha hữu hạn (rad)
        fc.double({
          min: -2 * Math.PI,
          max: 2 * Math.PI,
          noNaN: true,
          noDefaultInfinity: true,
        }),
        (elapsedSec, amplitude, frequency, phase) => {
          const config: FloatConfig = { amplitude, frequency, phase };
          const result = floatOffset(elapsedSec, config);

          // Epsilon nhỏ để bù sai số dấu phẩy động của Math.sin.
          const epsilon = 1e-9;
          expect(Math.abs(result)).toBeLessThanOrEqual(config.amplitude + epsilon);
        },
      ),
      { numRuns: 100 },
    );
  });
});
