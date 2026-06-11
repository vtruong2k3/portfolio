import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  computeParallaxTarget,
  type PointerInput,
  type RigBounds,
} from "./cameraRig";

/**
 * Property-based test cho `computeParallaxTarget`.
 *
 * _Requirements: 6.2, 6.4_
 */
describe("computeParallaxTarget", () => {
  // Feature: hero-3d-visual-enhancement, Property 6: Mục tiêu camera parallax luôn nằm trong biên
  // Validates: Requirements 6.2, 6.4
  it("kết quả luôn thỏa |x| <= maxOffsetX và |y| <= maxOffsetY với mọi pointer (kể cả ngoài [-1, 1]) và RigBounds", () => {
    fc.assert(
      fc.property(
        // pointer.x: bao gồm cả giá trị ngoài [-1, 1] (chuột hoặc chạm)
        fc.double({ min: -100, max: 100, noNaN: true, noDefaultInfinity: true }),
        // pointer.y: bao gồm cả giá trị ngoài [-1, 1]
        fc.double({ min: -100, max: 100, noNaN: true, noDefaultInfinity: true }),
        // maxOffsetX: biên độ không âm
        fc.double({ min: 0, max: 10, noNaN: true, noDefaultInfinity: true }),
        // maxOffsetY: biên độ không âm
        fc.double({ min: 0, max: 10, noNaN: true, noDefaultInfinity: true }),
        (px, py, maxOffsetX, maxOffsetY) => {
          const pointer: PointerInput = { x: px, y: py };
          const bounds: RigBounds = { maxOffsetX, maxOffsetY };
          const result = computeParallaxTarget(pointer, bounds);

          // Epsilon nhỏ để bù sai số dấu phẩy động của phép nhân/kẹp.
          const epsilon = 1e-9;
          expect(Math.abs(result.x)).toBeLessThanOrEqual(bounds.maxOffsetX + epsilon);
          expect(Math.abs(result.y)).toBeLessThanOrEqual(bounds.maxOffsetY + epsilon);
        },
      ),
      { numRuns: 100 },
    );
  });
});
