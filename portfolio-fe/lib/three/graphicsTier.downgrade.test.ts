import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { downgradeTier, TIER_ORDER } from "./graphicsTier";

/**
 * Property-based test cho `downgradeTier`.
 *
 * _Requirements: 8.4_
 */
describe("downgradeTier", () => {
  // Feature: hero-3d-visual-enhancement, Property 4: Hạ tier đơn điệu, không bao giờ nâng
  // Validates: Requirements 8.4
  it("hạ tier đơn điệu (rank không giảm), không bao giờ nâng và hội tụ về 'low'", () => {
    fc.assert(
      fc.property(fc.constantFrom(...TIER_ORDER), (tier) => {
        // Một bước hạ tier không bao giờ nâng chất lượng:
        // index trong TIER_ORDER (0 = cao nhất) phải tăng hoặc giữ nguyên.
        const startIndex = TIER_ORDER.indexOf(tier);
        const nextIndex = TIER_ORDER.indexOf(downgradeTier(tier));
        expect(nextIndex).toBeGreaterThanOrEqual(startIndex);

        // Áp dụng lặp lại tạo dãy index không giảm và hội tụ về 'low'.
        let current = tier;
        let prevIndex = startIndex;
        for (let step = 0; step < 5; step += 1) {
          current = downgradeTier(current);
          const index = TIER_ORDER.indexOf(current);
          // Dãy index đơn điệu không giảm (không bao giờ về tier chất lượng cao hơn).
          expect(index).toBeGreaterThanOrEqual(prevIndex);
          prevIndex = index;
        }

        // Sau đủ số bước (>= số tier), luôn dừng tại 'low' (mức thấp nhất).
        expect(current).toBe("low");
        expect(TIER_ORDER.indexOf(current)).toBe(TIER_ORDER.length - 1);
      }),
      { numRuns: 100 },
    );
  });
});
