import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { getModelPaths, resolveModelPath } from "./assetPath";

/**
 * Property-based test cho `resolveModelPath`.
 *
 * _Requirements: 2.5, 2.8_
 */
describe("resolveModelPath", () => {
  // Feature: portfolio-3d-asset-suite, Property 4: Ưu tiên biến thể đã tối ưu, fallback về nguồn
  // Validates: Requirements 2.5, 2.8
  it("trả về biến thể tối ưu khi tồn tại, ngược lại lùi về nguồn với optimizedMissing=true", () => {
    fc.assert(
      fc.property(
        // name: tên logic của mô hình (chuỗi tùy ý, kể cả rỗng)
        fc.string(),
        // optimizedExists: biến thể đã tối ưu có tồn tại hay không
        fc.boolean(),
        (name, optimizedExists) => {
          const { optimized, source } = getModelPaths(name);
          const resolved = resolveModelPath(name, optimizedExists);

          if (optimizedExists) {
            // Ưu tiên biến thể đã tối ưu, không cảnh báo thiếu (Req 2.5).
            expect(resolved.path).toBe(optimized);
            expect(resolved.optimizedMissing).toBe(false);
          } else {
            // Lùi về tệp nguồn và đặt cờ cảnh báo (Req 2.8).
            expect(resolved.path).toBe(source);
            expect(resolved.optimizedMissing).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
