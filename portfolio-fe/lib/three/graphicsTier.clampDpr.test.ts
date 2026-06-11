import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { clampDpr, TIER_ORDER, TIER_PRESETS } from "./graphicsTier";

/**
 * Property-based test cho `clampDpr`.
 *
 * _Requirements: 7.4_
 */
describe("clampDpr", () => {
  // Feature: hero-3d-visual-enhancement, Property 3: Giới hạn DPR theo trần của tier
  // Validates: Requirements 7.4
  it("trả về giá trị > 0, không vượt trần maxDpr của tier và không vượt rawDpr", () => {
    fc.assert(
      fc.property(
        fc.double({
          min: Number.MIN_VALUE,
          max: Number.MAX_VALUE,
          noNaN: true,
          noDefaultInfinity: true,
        }),
        fc.constantFrom(...TIER_ORDER),
        (rawDpr, tier) => {
          const result = clampDpr(rawDpr, tier);

          expect(result).toBeGreaterThan(0);
          expect(result).toBeLessThanOrEqual(TIER_PRESETS[tier].maxDpr);
          expect(result).toBeLessThanOrEqual(rawDpr);
        },
      ),
      { numRuns: 100 },
    );
  });
});
