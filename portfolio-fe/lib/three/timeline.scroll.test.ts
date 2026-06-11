import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { normalizeScrollProgress, type ScrollInput } from "./timeline";

/**
 * Property-based test cho `normalizeScrollProgress`.
 *
 * Tiến độ cuộn đã chuẩn hóa của Experience_Timeline phải luôn nằm trong `[0, 1]`,
 * không giảm khi `scrollTop` tăng (đơn điệu không giảm), bằng `0` trước điểm bắt
 * đầu và bằng `1` sau điểm kết thúc.
 *
 * _Requirements: 9.4, 9.7_
 */
describe("normalizeScrollProgress", () => {
  /** Sinh số hữu hạn (pixel) trong dải hợp lý của hệ tọa độ cuộn. */
  const finite = (min: number, max: number) =>
    fc.double({ min, max, noNaN: true, noDefaultInfinity: true });

  // Feature: portfolio-3d-asset-suite, Property 18: Tiến độ cuộn chuẩn hóa trong [0,1] và đơn điệu
  // Validates: Requirements 9.4, 9.7
  it("∈ [0,1], đơn điệu không giảm theo scrollTop, 0 trước điểm bắt đầu và 1 sau điểm kết thúc", () => {
    fc.assert(
      fc.property(
        // sectionTop: khoảng cách từ đầu tài liệu tới đỉnh Section.
        finite(0, 100_000),
        // sectionHeight: chiều cao tổng của Section (không âm).
        finite(0, 100_000),
        // viewportHeight: chiều cao viewport (dương).
        finite(1, 20_000),
        // Hai vị trí cuộn để kiểm tra tính đơn điệu (lo ≤ hi sau khi sắp xếp).
        finite(-50_000, 150_000),
        finite(-50_000, 150_000),
        (sectionTop, sectionHeight, viewportHeight, a, b) => {
          const lo = Math.min(a, b);
          const hi = Math.max(a, b);

          const base = { sectionTop, sectionHeight, viewportHeight };
          const at = (scrollTop: number): number =>
            normalizeScrollProgress({ ...base, scrollTop } satisfies ScrollInput);

          const pLo = at(lo);
          const pHi = at(hi);

          // 1) Kết quả luôn nằm trong [0, 1].
          for (const p of [pLo, pHi]) {
            expect(p).toBeGreaterThanOrEqual(0);
            expect(p).toBeLessThanOrEqual(1);
          }

          // 2) Đơn điệu không giảm khi scrollTop tăng.
          expect(pHi).toBeGreaterThanOrEqual(pLo);

          // 3) Bằng 0 trước điểm bắt đầu (scrollTop < sectionTop).
          const beforeStart = sectionTop - 1;
          expect(at(beforeStart)).toBe(0);

          // 4) Bằng 1 sau điểm kết thúc.
          const range = sectionHeight - viewportHeight;
          const end = range > 0 ? sectionTop + range : sectionTop;
          expect(at(end + 1)).toBe(1);
        },
      ),
      { numRuns: 200 },
    );
  });
});
