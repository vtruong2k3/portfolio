import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { BLOOM_BASE_INTENSITY, computeBloomIntensity } from "./postProcessing";

/**
 * Property-based test cho tham số hậu kỳ tĩnh khi giảm chuyển động.
 *
 * _Requirements: 2.5_
 */
describe("computeBloomIntensity (reduced motion)", () => {
  // Feature: hero-3d-visual-enhancement, Property 13: Tham số hậu kỳ tĩnh khi giảm chuyển động
  // Validates: Requirements 2.5
  it("computeBloomIntensity(t1, true) === computeBloomIntensity(t2, true) với mọi t1, t2", () => {
    fc.assert(
      fc.property(
        // t1: thời điểm hữu hạn
        fc.double({ min: -1e6, max: 1e6, noNaN: true, noDefaultInfinity: true }),
        // t2: thời điểm hữu hạn
        fc.double({ min: -1e6, max: 1e6, noNaN: true, noDefaultInfinity: true }),
        (t1, t2) => {
          const v1 = computeBloomIntensity(t1, true);
          const v2 = computeBloomIntensity(t2, true);

          // Khi reducedMotion = true, tham số không dao động theo thời gian:
          // giá trị tại mọi thời điểm bằng hằng số tĩnh và bằng nhau.
          expect(v1).toBe(v2);
          expect(v1).toBe(BLOOM_BASE_INTENSITY);
        },
      ),
      { numRuns: 100 },
    );
  });
});
