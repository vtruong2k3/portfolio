import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { type GraphicsTier, TIER_ORDER } from "./graphicsTier";
import { EARTH_ROTATION_DEG_PER_SEC, isEarthEnabled } from "./earth";

/**
 * Property-based test cho Earth_Globe (quả Địa Cầu 3D tùy chọn).
 *
 * **Validates: Requirements 11.1, 11.5**
 */
describe("earth", () => {
  // Feature: portfolio-3d-asset-suite, Property 23: Earth_Globe — tốc độ xoay trong dải và bị tắt ở tier thấp
  it("Property 23: Earth_Globe — tốc độ xoay trong dải và bị tắt ở tier thấp", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...TIER_ORDER),
        fc.boolean(),
        (tier: GraphicsTier, flag: boolean) => {
          // isEarthEnabled true khi và chỉ khi tier khác `low` và cờ bật (Req 11.5).
          expect(isEarthEnabled(tier, flag)).toBe(tier !== "low" && flag);

          // Tốc độ xoay cấu hình nằm trong dải [0.5, 2] độ/giây (Req 11.1).
          expect(EARTH_ROTATION_DEG_PER_SEC).toBeGreaterThanOrEqual(0.5);
          expect(EARTH_ROTATION_DEG_PER_SEC).toBeLessThanOrEqual(2);
        },
      ),
      { numRuns: 100 },
    );
  });
});
