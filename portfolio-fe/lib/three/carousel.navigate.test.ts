import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  type CarouselState,
  navigate,
  wrapIndex,
} from "./carousel";

/**
 * Property-based test cho ánh xạ chỉ số của Project_Carousel.
 *
 * Kiểm chứng tính tất định và khả nghịch của toán học chỉ số băng chuyền:
 * - `wrapIndex` luôn ánh xạ mọi chỉ số nguyên (kể cả âm/ngoài biên) về `[0, total)`.
 * - `navigate` đi tới (`next`) rồi đi lui (`prev`) trả về đúng `centerIndex` ban đầu
 *   (khả nghịch), với `total >= 1`.
 *
 * **Validates: Requirements 8.5, 8.6**
 */
describe("carousel index mapping", () => {
  // Feature: portfolio-3d-asset-suite, Property 14: Ánh xạ chỉ số Project_Carousel tất định và khả nghịch
  it("Property 14: Ánh xạ chỉ số Project_Carousel tất định và khả nghịch", () => {
    fc.assert(
      fc.property(
        // total >= 1 thẻ; index bất kỳ (kể cả âm hoặc vượt quá total) để kiểm tra wrap.
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: -500, max: 500 }),
        (total, index) => {
          // wrapIndex luôn cho kết quả trong [0, total).
          const wrapped = wrapIndex(index, total);
          expect(wrapped).toBeGreaterThanOrEqual(0);
          expect(wrapped).toBeLessThan(total);

          // Tất định: gọi lại với cùng đầu vào cho cùng kết quả.
          expect(wrapIndex(index, total)).toBe(wrapped);

          // navigate khả nghịch: next rồi prev (và prev rồi next) trả về centerIndex ban đầu.
          const state: CarouselState = {
            total,
            centerIndex: wrapIndex(index, total),
          };

          const nextThenPrev = navigate(navigate(state, "next"), "prev");
          expect(nextThenPrev.centerIndex).toBe(state.centerIndex);
          expect(nextThenPrev.total).toBe(state.total);

          const prevThenNext = navigate(navigate(state, "prev"), "next");
          expect(prevThenNext.centerIndex).toBe(state.centerIndex);
          expect(prevThenNext.total).toBe(state.total);
        },
      ),
      { numRuns: 100 },
    );
  });
});
