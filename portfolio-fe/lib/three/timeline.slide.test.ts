import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { slideDirection } from "./timeline";

/**
 * Property-based test cho `slideDirection`.
 *
 * Hướng trượt vào của thẻ timeline được xác định tất định theo chỉ số vị trí:
 * chỉ số **chẵn** trượt vào từ **trái** (`"left"`), chỉ số **lẻ** trượt vào từ
 * **phải** (`"right"`).
 *
 * _Requirements: 9.5_
 */
describe("slideDirection", () => {
  // Feature: portfolio-3d-asset-suite, Property 19: Hướng trượt thẻ timeline theo chẵn/lẻ
  // Validates: Requirements 9.5
  it("chỉ số chẵn → 'left', chỉ số lẻ → 'right'", () => {
    fc.assert(
      fc.property(
        // Chỉ số vị trí: số nguyên không âm trong dải hợp lý của một timeline.
        fc.nat({ max: 100_000 }),
        (index) => {
          const expected = index % 2 === 0 ? "left" : "right";
          expect(slideDirection(index)).toBe(expected);
        },
      ),
      { numRuns: 200 },
    );
  });
});
