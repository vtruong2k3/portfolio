import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  PROJECT_IMAGE_PLACEHOLDER,
  resolveProjectImage,
} from "./carousel";

/**
 * Property-based test cho phân giải ảnh hiển thị của Project_Card
 * (`resolveProjectImage`).
 *
 * Ảnh giữ chỗ được trả về (`isPlaceholder = true`) khi và chỉ khi `thumbnail`
 * là `null` và `images` rỗng; ngược lại trả về một ảnh dự án thực (ưu tiên
 * `thumbnail`, nếu không có thì phần tử đầu của `images`) với
 * `isPlaceholder = false` (Req 8.13).
 *
 * **Validates: Requirements 8.13**
 */
describe("resolveProjectImage", () => {
  // Đường dẫn ảnh thực: chuỗi không rỗng.
  const imagePath = fc.string({ minLength: 1 });
  // `thumbnail` hợp lệ là một ảnh thực hoặc null.
  const thumbnailOrNull = fc.option(imagePath, { nil: null });
  // `images` là danh sách (có thể rỗng) các đường dẫn ảnh thực.
  const images = fc.array(imagePath);

  // Feature: portfolio-3d-asset-suite, Property 16: Ảnh placeholder khi không có ảnh dự án
  it("Property 16: Ảnh placeholder khi không có ảnh dự án", () => {
    fc.assert(
      fc.property(thumbnailOrNull, images, (thumbnail, imgs) => {
        const resolved = resolveProjectImage({ thumbnail, images: imgs });

        const hasNoImage = thumbnail === null && imgs.length === 0;

        // Placeholder khi và chỉ khi không có ảnh dự án nào (iff).
        expect(resolved.isPlaceholder).toBe(hasNoImage);

        if (hasNoImage) {
          // Không có ảnh -> dùng ảnh giữ chỗ.
          expect(resolved.src).toBe(PROJECT_IMAGE_PLACEHOLDER);
        } else {
          // Có ảnh -> trả về ảnh thực, ưu tiên thumbnail rồi tới images[0].
          expect(resolved.src).toBe(thumbnail !== null ? thumbnail : imgs[0]);
        }
      }),
      { numRuns: 100 },
    );
  });
});
