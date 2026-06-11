import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { computeOrbitPosition, type OrbitParams } from "./orbit";

/**
 * Property-based test cho `computeOrbitPosition` ở chế độ Reduced_Motion_Mode.
 *
 * Khi `reduced === true`, Tech_Icon_Orbit phải đứng yên: vị trí trả về là **vị
 * trí gốc tĩnh** (không xoay quỹ đạo, không bay lên/xuống) và độc lập hoàn toàn
 * với `elapsedSec` — bất kể thời gian trôi qua bao nhiêu (Req 7.9).
 *
 * _Requirements: 7.9_
 */
describe("computeOrbitPosition (Reduced_Motion_Mode)", () => {
  // Feature: portfolio-3d-asset-suite, Property 10: Quỹ đạo Tech_Icon đứng yên khi giảm chuyển động
  // Validates: Requirements 7.9
  it("trả về vị trí gốc tĩnh độc lập với elapsedSec khi reduced bật", () => {
    fc.assert(
      fc.property(
        // total: tổng số thẻ trên quỹ đạo (>= 1 để chia khoảng cách góc).
        fc.integer({ min: 1, max: 12 }),
        // rawIndex: chỉ số thô, sẽ lấy modulo total để nằm trong [0, total).
        fc.nat({ max: 1000 }),
        // radius: bán kính quỹ đạo dương, hữu hạn.
        fc.double({ min: 0.1, max: 50, noNaN: true, noDefaultInfinity: true }),
        // Hai mốc thời gian bất kỳ, hữu hạn, không âm — vị trí phải không đổi.
        fc.double({ min: 0, max: 1000, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0, max: 1000, noNaN: true, noDefaultInfinity: true }),
        (total, rawIndex, radius, elapsedA, elapsedB) => {
          const index = rawIndex % total; // chỉ số thẻ hợp lệ trong [0, total).
          const base: Omit<OrbitParams, "elapsedSec"> = {
            index,
            total,
            radius,
            reduced: true,
          };

          const a = computeOrbitPosition({ ...base, elapsedSec: elapsedA });
          const b = computeOrbitPosition({ ...base, elapsedSec: elapsedB });

          // (1) Vị trí độc lập với elapsedSec: hai mốc thời gian → cùng vị trí.
          expect(a.position[0]).toBe(b.position[0]);
          expect(a.position[1]).toBe(b.position[1]);
          expect(a.position[2]).toBe(b.position[2]);

          // (2) Đứng yên tại vị trí gốc tĩnh: độ cao y = 0 (không bay lên/xuống).
          expect(a.position[1]).toBe(0);

          // (3) Tọa độ phẳng nằm đúng tại góc gốc index * 360 / total trên đường
          //     tròn bán kính radius (không xoay quỹ đạo theo thời gian).
          const baseRad = ((index * 360) / total) * (Math.PI / 180);
          expect(a.position[0]).toBeCloseTo(radius * Math.cos(baseRad), 9);
          expect(a.position[2]).toBeCloseTo(radius * Math.sin(baseRad), 9);
        },
      ),
      { numRuns: 100 },
    );
  });
});
