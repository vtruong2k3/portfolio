import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  computeFitScale,
  type ViewportInfo,
  visibleHalfHeight,
  visibleHalfWidth,
} from "./composition";

/**
 * Generator cho ViewportInfo hợp lệ với các khoảng giá trị hợp lý:
 * - width/height: 1–4000 px (dương)
 * - fovDeg: 10–120 độ (dải FOV thực tế)
 * - cameraZ: 0.1–50 (khoảng cách camera dương)
 */
const viewportArb: fc.Arbitrary<ViewportInfo> = fc.record({
  width: fc.double({ min: 1, max: 4000, noNaN: true }),
  height: fc.double({ min: 1, max: 4000, noNaN: true }),
  fovDeg: fc.double({ min: 10, max: 120, noNaN: true }),
  cameraZ: fc.double({ min: 0.1, max: 50, noNaN: true }),
});

/** Bán kính vật thể dương. */
const objectRadiusArb: fc.Arbitrary<number> = fc.double({
  min: 0.01,
  max: 100,
  noNaN: true,
});

// Feature: hero-3d-visual-enhancement, Property 8: Tỉ lệ vừa khung giữ vật thể trung tâm trọn trong khung hình
describe("composition — Property 8", () => {
  it("computeFitScale trả về (0, 1] và bán kính sau tỉ lệ vừa trọn khung hình", () => {
    fc.assert(
      fc.property(objectRadiusArb, viewportArb, (objectRadius, viewport) => {
        const scale = computeFitScale(objectRadius, viewport);

        // Chỉ thu nhỏ, không phóng to: 0 < scale <= 1.
        expect(scale).toBeGreaterThan(0);
        expect(scale).toBeLessThanOrEqual(1);

        // Bán kính sau khi nhân tỉ lệ không vượt nửa chiều cao lẫn nửa chiều rộng
        // vùng nhìn thấy (kèm dung sai float nhỏ).
        const scaledRadius = objectRadius * scale;
        const halfHeight = visibleHalfHeight(viewport);
        const halfWidth = visibleHalfWidth(viewport);
        const epsilon = 1e-9;

        expect(scaledRadius).toBeLessThanOrEqual(halfHeight + epsilon);
        expect(scaledRadius).toBeLessThanOrEqual(halfWidth + epsilon);
      }),
      { numRuns: 100 },
    );
  });
});
