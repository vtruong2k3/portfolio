import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  CAROUSEL_PLACEMENT,
  type CarouselState,
  computeCardPlacement,
} from "./carousel";

/**
 * Property-based test cho bố trí thẻ của Project_Carousel (`computeCardPlacement`).
 *
 * **Validates: Requirements 8.3**
 */
describe("computeCardPlacement", () => {
  // Feature: portfolio-3d-asset-suite, Property 13: Bố trí thẻ Project_Carousel — tỉ lệ và độ mờ trong biên
  it("Property 13: Bố trí thẻ Project_Carousel — tỉ lệ và độ mờ trong biên", () => {
    fc.assert(
      fc.property(
        // total >= 1 thẻ; centerIndex bất kỳ (kể cả âm/ngoài biên) để wrap xử lý.
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: -200, max: 200 }),
        (total, centerIndex) => {
          const state: CarouselState = { total, centerIndex };

          // Bố trí của mọi thẻ trong băng chuyền.
          const placements = Array.from({ length: total }, (_, cardIndex) =>
            computeCardPlacement(state, cardIndex),
          );

          // Thẻ trung tâm là thẻ có slotOffset === 0.
          const center = placements.find((p) => p.slotOffset === 0);
          expect(center).toBeDefined();

          // Thẻ trung tâm có scale trong [1.1, 1.3].
          expect(center!.scale).toBeGreaterThanOrEqual(1.1);
          expect(center!.scale).toBeLessThanOrEqual(1.3);

          // Thẻ trung tâm là thẻ có scale lớn nhất (lớn hơn hẳn các thẻ bên).
          const maxScale = Math.max(...placements.map((p) => p.scale));
          expect(center!.scale).toBe(maxScale);

          // Các thẻ không phải trung tâm có opacity trong [0.4, 0.6] và scale nhỏ hơn.
          for (const p of placements) {
            if (p.slotOffset === 0) continue;
            expect(p.opacity).toBeGreaterThanOrEqual(0.4);
            expect(p.opacity).toBeLessThanOrEqual(0.6);
            expect(p.scale).toBeLessThan(center!.scale);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
