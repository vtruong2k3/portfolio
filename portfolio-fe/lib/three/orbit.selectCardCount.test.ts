import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { selectCardCount } from "./orbit";
import type { GraphicsTier } from "./graphicsTier";

/**
 * Property-based test cho `selectCardCount`.
 *
 * Kiểm tra bất biến chọn số lượng Tech_Icon_Card từ số kỹ năng khả dụng và
 * Graphics_Tier (Req 7.2, 7.10):
 * - Không vượt quá số kỹ năng khả dụng.
 * - Không vượt quá 8 (trần chung).
 * - Không vượt quá 6 khi tier là `low`.
 * - Khi có đủ kỹ năng khả dụng (>= 6), kết quả nằm trong khoảng [6, 8].
 *
 * _Requirements: 7.2, 7.10_
 */
describe("selectCardCount", () => {
  const tierArb: fc.Arbitrary<GraphicsTier> = fc.constantFrom(
    "high",
    "medium",
    "low",
  );

  // Feature: portfolio-3d-asset-suite, Property 12: Số lượng thẻ kỹ năng nằm trong khoảng hợp lệ
  // Validates: Requirements 7.2, 7.10
  it("trả về số thẻ <= khả dụng, <= 8, <= 6 khi tier low, và trong [6,8] khi đủ khả dụng", () => {
    fc.assert(
      fc.property(
        // available: số kỹ năng khả dụng (số nguyên không âm, bao gồm cả vùng < 6 và >= 6).
        fc.integer({ min: 0, max: 50 }),
        tierArb,
        (available, tier) => {
          const result = selectCardCount(available, tier);

          // (1) Không vượt quá số kỹ năng khả dụng.
          expect(result).toBeLessThanOrEqual(available);

          // (2) Không vượt quá trần chung là 8.
          expect(result).toBeLessThanOrEqual(8);

          // (3) Khi tier là `low`, không vượt quá 6.
          if (tier === "low") {
            expect(result).toBeLessThanOrEqual(6);
          }

          // (4) Khi có đủ kỹ năng khả dụng (>= 6), kết quả nằm trong [6, 8].
          if (available >= 6) {
            expect(result).toBeGreaterThanOrEqual(6);
            expect(result).toBeLessThanOrEqual(8);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
