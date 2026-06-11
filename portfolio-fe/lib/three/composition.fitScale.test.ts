import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  computeFitScale,
  visibleHalfHeight,
  visibleHalfWidth,
  type ViewportInfo,
} from "./composition";

/**
 * Property-based test cho `computeFitScale`.
 *
 * _Requirements: 4.3, 4.4_
 */
describe("computeFitScale", () => {
  // Feature: portfolio-3d-asset-suite, Property 5: Vật thể trung tâm luôn vừa khung hình không bị cắt
  // Validates: Requirements 4.3, 4.4
  it("trả về tỉ lệ ∈ (0, 1] và giữ vật thể vừa trọn cả chiều cao lẫn chiều rộng với mọi viewport", () => {
    fc.assert(
      fc.property(
        // objectRadius: bán kính vật thể trung tâm (dương, hữu hạn)
        fc.double({
          min: 1e-3,
          max: 1e4,
          noNaN: true,
          noDefaultInfinity: true,
        }),
        // width: chiều rộng viewport (px, dương)
        fc.double({
          min: 1,
          max: 10000,
          noNaN: true,
          noDefaultInfinity: true,
        }),
        // height: chiều cao viewport (px, dương)
        fc.double({
          min: 1,
          max: 10000,
          noNaN: true,
          noDefaultInfinity: true,
        }),
        // fovDeg: FOV dọc của camera (độ), giữ trong (0, 180) để vùng nhìn hữu hạn dương
        fc.double({
          min: 1,
          max: 179,
          noNaN: true,
          noDefaultInfinity: true,
        }),
        // cameraZ: khoảng cách camera tới gốc (dương, hữu hạn)
        fc.double({
          min: 1e-2,
          max: 1e4,
          noNaN: true,
          noDefaultInfinity: true,
        }),
        (objectRadius, width, height, fovDeg, cameraZ) => {
          const viewport: ViewportInfo = { width, height, fovDeg, cameraZ };

          const halfHeight = visibleHalfHeight(viewport);
          const halfWidth = visibleHalfWidth(viewport);

          // Tiền điều kiện: chỉ kiểm tra khi vùng nhìn thấy hợp lệ (hữu hạn, dương),
          // tức là không rơi vào nhánh guard suy biến của computeFitScale.
          fc.pre(
            Number.isFinite(halfHeight) &&
              Number.isFinite(halfWidth) &&
              halfHeight > 0 &&
              halfWidth > 0,
          );

          const scale = computeFitScale(objectRadius, viewport);

          // Tỉ lệ nằm trong (0, 1]: chỉ thu nhỏ, không phóng to, và luôn dương.
          expect(scale).toBeGreaterThan(0);
          expect(scale).toBeLessThanOrEqual(1);

          // Không bị cắt ở bất kỳ cạnh nào: bán kính sau khi thu tỉ lệ phải vừa
          // trọn CẢ nửa chiều cao LẪN nửa chiều rộng vùng nhìn thấy.
          expect(objectRadius * scale).toBeLessThanOrEqual(halfHeight);
          expect(objectRadius * scale).toBeLessThanOrEqual(halfWidth);
        },
      ),
      { numRuns: 100 },
    );
  });
});
