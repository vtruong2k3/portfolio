import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  computeNormalizationTransform,
  type BoundingBox,
  type NormalizationTransform,
} from "./bbox";

/**
 * Áp dụng phép biến đổi chuẩn hóa cho một điểm: `pNew = (p + translate) * scale`.
 */
function applyTransform(
  point: [number, number, number],
  { translate, scale }: NormalizationTransform,
): [number, number, number] {
  return [
    (point[0] + translate[0]) * scale,
    (point[1] + translate[1]) * scale,
    (point[2] + translate[2]) * scale,
  ];
}

/** Liệt kê 8 góc của hộp bao trục-thẳng. */
function corners(bbox: BoundingBox): [number, number, number][] {
  const { min, max } = bbox;
  const xs = [min[0], max[0]];
  const ys = [min[1], max[1]];
  const zs = [min[2], max[2]];
  const result: [number, number, number][] = [];
  for (const x of xs) {
    for (const y of ys) {
      for (const z of zs) {
        result.push([x, y, z]);
      }
    }
  }
  return result;
}

/**
 * Property-based test cho `computeNormalizationTransform`.
 *
 * _Requirements: 2.4_
 */
describe("computeNormalizationTransform", () => {
  // Feature: portfolio-3d-asset-suite, Property 3: Chuẩn hóa bounding box về tâm gốc và kích thước đơn vị
  // Validates: Requirements 2.4
  it("đưa tâm hộp bao về gốc toạ độ (±0.001) và cạnh lớn nhất về 1.0 (±0.001)", () => {
    fc.assert(
      fc.property(
        // Góc nhỏ nhất theo từng trục, giữ trong dải hữu hạn hợp lý.
        fc.double({ min: -1000, max: 1000, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: -1000, max: 1000, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: -1000, max: 1000, noNaN: true, noDefaultInfinity: true }),
        // Kích thước cạnh không âm theo từng trục.
        fc.double({ min: 0, max: 2000, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0, max: 2000, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0, max: 2000, noNaN: true, noDefaultInfinity: true }),
        (minX, minY, minZ, sizeX, sizeY, sizeZ) => {
          const maxEdge = Math.max(sizeX, sizeY, sizeZ);

          // Precondition: loại bỏ hộp bao suy biến (mọi cạnh ≈ 0) — không thể chuẩn
          // hóa tỉ lệ về 1.0. Yêu cầu cạnh lớn nhất đủ lớn để số học ổn định.
          fc.pre(maxEdge >= 1e-3);

          const bbox: BoundingBox = {
            min: [minX, minY, minZ],
            max: [minX + sizeX, minY + sizeY, minZ + sizeZ],
          };

          const transform = computeNormalizationTransform(bbox);

          // Áp dụng phép biến đổi cho 8 góc rồi tính lại hộp bao mới.
          const transformed = corners(bbox).map((c) => applyTransform(c, transform));

          const newMin: [number, number, number] = [Infinity, Infinity, Infinity];
          const newMax: [number, number, number] = [-Infinity, -Infinity, -Infinity];
          for (const p of transformed) {
            for (let axis = 0; axis < 3; axis += 1) {
              if (p[axis] < newMin[axis]) newMin[axis] = p[axis];
              if (p[axis] > newMax[axis]) newMax[axis] = p[axis];
            }
          }

          const newCenter: [number, number, number] = [
            (newMin[0] + newMax[0]) / 2,
            (newMin[1] + newMax[1]) / 2,
            (newMin[2] + newMax[2]) / 2,
          ];
          const newMaxEdge = Math.max(
            newMax[0] - newMin[0],
            newMax[1] - newMin[1],
            newMax[2] - newMin[2],
          );

          // Tâm mới nằm tại gốc toạ độ trong sai số ±0.001.
          expect(Math.abs(newCenter[0])).toBeLessThanOrEqual(1e-3);
          expect(Math.abs(newCenter[1])).toBeLessThanOrEqual(1e-3);
          expect(Math.abs(newCenter[2])).toBeLessThanOrEqual(1e-3);

          // Cạnh lớn nhất mới bằng 1.0 trong sai số ±0.001.
          expect(Math.abs(newMaxEdge - 1)).toBeLessThanOrEqual(1e-3);
        },
      ),
      { numRuns: 100 },
    );
  });
});
