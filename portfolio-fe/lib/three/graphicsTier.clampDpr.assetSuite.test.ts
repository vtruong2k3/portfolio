import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { clampDpr, TIER_ORDER, TIER_PRESETS } from "./graphicsTier";

/**
 * Property-based test cho `clampDpr` (tái sử dụng hàm hạ tầng hiện có).
 *
 * Property 24 kiểm tra rằng với mọi `rawDpr` và Graphics_Tier, kết quả của
 * `clampDpr` luôn là một giá trị dương (sàn an toàn), không vượt trần `maxDpr`
 * của tier và không vượt `rawDpr` đầu vào.
 *
 * _Requirements: 13.3_
 */
describe("clampDpr (asset suite)", () => {
  // Feature: portfolio-3d-asset-suite, Property 24: Giới hạn DPR theo trần của tier
  // Validates: Requirements 13.3
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

          // Sàn an toàn: kết quả luôn dương.
          expect(result).toBeGreaterThan(0);
          // Trần: không vượt maxDpr của tier hiện tại.
          expect(result).toBeLessThanOrEqual(TIER_PRESETS[tier].maxDpr);
          // Không phóng đại vượt rawDpr đầu vào hợp lệ.
          expect(result).toBeLessThanOrEqual(rawDpr);
        },
      ),
      { numRuns: 100 },
    );
  });
});
