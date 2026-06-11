import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  isLinkVisible,
  resolveProjectLinkVisibility,
} from "./carousel";

/**
 * Property-based test cho hiển thị nút liên kết GitHub/Demo của Project_Card
 * (`resolveProjectLinkVisibility` / `isLinkVisible`).
 *
 * Nút GitHub hiển thị khi và chỉ khi `githubUrl != null`; nút Demo hiển thị khi
 * và chỉ khi `demoUrl != null` (Req 8.7).
 *
 * **Validates: Requirements 8.7**
 */
describe("resolveProjectLinkVisibility", () => {
  // Sinh một URL hợp lệ (chuỗi không rỗng) hoặc null để bao phủ cả hai nhánh.
  const urlOrNull = fc.option(
    fc.webUrl().filter((u) => u.length > 0),
    { nil: null },
  );

  // Feature: portfolio-3d-asset-suite, Property 15: Hiển thị nút liên kết theo dữ liệu Project
  it("Property 15: Hiển thị nút liên kết theo dữ liệu Project", () => {
    fc.assert(
      fc.property(urlOrNull, urlOrNull, (githubUrl, demoUrl) => {
        const visibility = resolveProjectLinkVisibility({ githubUrl, demoUrl });

        // Nút hiển thị khi và chỉ khi URL tương ứng khác null (iff).
        expect(visibility.github).toBe(githubUrl !== null);
        expect(visibility.demo).toBe(demoUrl !== null);

        // Nhất quán với helper đơn `isLinkVisible`.
        expect(visibility.github).toBe(isLinkVisible(githubUrl));
        expect(visibility.demo).toBe(isLinkVisible(demoUrl));
      }),
      { numRuns: 100 },
    );
  });
});
