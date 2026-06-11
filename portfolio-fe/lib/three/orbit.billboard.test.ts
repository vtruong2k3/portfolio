import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { angleBetweenDeg, billboardNormal, type Vec3 } from "./orbit";

/**
 * Property-based test cho định hướng billboard của Tech_Icon_Card.
 *
 * Một billboard luôn quay mặt về phía camera: pháp tuyến do `billboardNormal`
 * trả về phải trùng hướng với vector (camera − card). Độ lệch góc giữa pháp
 * tuyến và hướng tới camera không được vượt quá 1° (Req 7.4).
 *
 * _Requirements: 7.4_
 */
describe("billboardNormal", () => {
  // Feature: portfolio-3d-asset-suite, Property 11: Tech_Icon billboard hướng về camera
  // Validates: Requirements 7.4
  it("pháp tuyến billboard hướng về camera với độ lệch ≤ 1°", () => {
    const coord = fc.double({
      min: -100,
      max: 100,
      noNaN: true,
      noDefaultInfinity: true,
    });

    fc.assert(
      fc.property(
        coord,
        coord,
        coord,
        coord,
        coord,
        coord,
        (cx, cy, cz, camx, camy, camz) => {
          const cardPosition: Vec3 = [cx, cy, cz];
          const cameraPosition: Vec3 = [camx, camy, camz];

          // Hướng tới camera (camera − card).
          const toCamera: Vec3 = [
            camx - cx,
            camy - cy,
            camz - cz,
          ];

          // Bỏ qua trường hợp suy biến: thẻ trùng vị trí camera (vector 0),
          // khi đó hướng tới camera không xác định và billboardNormal trả về
          // pháp tuyến mặc định.
          const distance = Math.hypot(toCamera[0], toCamera[1], toCamera[2]);
          fc.pre(distance > 1e-6);

          const normal = billboardNormal(cardPosition, cameraPosition);

          // Độ lệch giữa pháp tuyến billboard và hướng tới camera ≤ 1°.
          const deviation = angleBetweenDeg(normal, toCamera);
          expect(deviation).toBeLessThanOrEqual(1);
        },
      ),
      { numRuns: 200 },
    );
  });
});
