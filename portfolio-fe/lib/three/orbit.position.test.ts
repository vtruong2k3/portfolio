import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  ORBIT_MOTION_CONFIG,
  computeOrbitPosition,
  type OrbitParams,
} from "./orbit";

/**
 * Property-based test cho `computeOrbitPosition`.
 *
 * Kiểm tra ba bất biến định vị quỹ đạo của Tech_Icon_Orbit:
 * - Khoảng cách góc đều nhau: `baseAngleDeg = index * 360 / total` (Req 7.3).
 * - Điểm nằm trên đường tròn bán kính `radius`: `x² + z² === radius²` (Req 7.5, 7.13).
 * - Độ bay lên/xuống nằm trong biên ±`floatAmplitude` (±0.05) (Req 7.6).
 *
 * _Requirements: 7.3, 7.5, 7.6, 7.13_
 */
describe("computeOrbitPosition", () => {
  // Feature: portfolio-3d-asset-suite, Property 9: Quỹ đạo Tech_Icon — cách đều, nằm trên đường tròn, bay trong biên
  // Validates: Requirements 7.3, 7.5, 7.6, 7.13
  it("đặt thẻ cách đều trên đường tròn bán kính radius và bay trong biên ±0.05", () => {
    fc.assert(
      fc.property(
        // total: tổng số thẻ trên quỹ đạo (>= 1 để chia khoảng cách góc).
        fc.integer({ min: 1, max: 12 }),
        // rawIndex: chỉ số thô, sẽ lấy modulo total để nằm trong [0, total).
        fc.nat({ max: 1000 }),
        // radius: bán kính quỹ đạo dương, hữu hạn.
        fc.double({ min: 0.1, max: 50, noNaN: true, noDefaultInfinity: true }),
        // elapsedSec: thời gian trôi qua hữu hạn, không âm.
        fc.double({ min: 0, max: 1000, noNaN: true, noDefaultInfinity: true }),
        (total, rawIndex, radius, elapsedSec) => {
          const index = rawIndex % total; // chỉ số thẻ hợp lệ trong [0, total).
          const params: OrbitParams = {
            index,
            total,
            radius,
            elapsedSec,
            reduced: false,
          };

          const { position, baseAngleDeg } = computeOrbitPosition(params);
          const [x, y, z] = position;

          // (1) Khoảng cách góc đều nhau = 360 / total (Req 7.3).
          expect(baseAngleDeg).toBeCloseTo((index * 360) / total, 9);

          // (2) Điểm nằm trên đường tròn bán kính radius:
          //     khoảng cách phẳng sqrt(x² + z²) ≈ radius (Req 7.5, 7.13).
          const planarDist = Math.hypot(x, z);
          expect(planarDist).toBeCloseTo(radius, 6);

          // (3) Độ bay lên/xuống trong biên ±floatAmplitude (±0.05) (Req 7.6).
          expect(Math.abs(y)).toBeLessThanOrEqual(
            ORBIT_MOTION_CONFIG.floatAmplitude + 1e-9,
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});
