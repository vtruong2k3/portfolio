import fc from "fast-check";
import { describe, expect, it } from "vitest";

import type { Experience } from "@/types/experience";
import { PRESENT_LABEL, formatDateRange } from "./timeline";

/**
 * Property-based test cho định dạng khoảng thời gian của Experience_Timeline
 * (`formatDateRange`).
 *
 * **Validates: Requirements 9.9**
 */
describe("formatDateRange", () => {
  /** Một chuỗi ngày ISO hợp lệ trong khoảng rộng (phân giải được). */
  const isoDateArb: fc.Arbitrary<string> = fc
    .date({ min: new Date("1970-01-01"), max: new Date("2100-01-01") })
    .map((d) => d.toISOString());

  /**
   * Sinh một `Experience` với `endDate` lúc là `null` (đang làm việc), lúc là
   * một ngày hợp lệ, để bao phủ cả hai nhánh của định dạng kết thúc.
   */
  const experienceArb: fc.Arbitrary<Experience> = fc.record({
    id: fc.uuid(),
    company: fc.string(),
    position: fc.string(),
    description: fc.string(),
    startDate: isoDateArb,
    endDate: fc.option(isoDateArb, { nil: null }),
    order: fc.integer({ min: 0, max: 5 }),
  });

  // Feature: portfolio-3d-asset-suite, Property 20: Định dạng khoảng thời gian dùng "Present" khi đang làm việc
  it('Property 20: Định dạng khoảng thời gian dùng "Present" khi đang làm việc', () => {
    fc.assert(
      fc.property(experienceArb, (experience) => {
        const label = formatDateRange(experience);

        // Nhãn có dạng "<start> – <end>"; tách lấy nhãn kết thúc.
        const separator = " – ";
        const sepIndex = label.lastIndexOf(separator);
        expect(sepIndex).toBeGreaterThanOrEqual(0);
        const endLabel = label.slice(sepIndex + separator.length);

        // Nhãn kết thúc bằng "Present" KHI VÀ CHỈ KHI endDate là null.
        const usesPresent = endLabel === PRESENT_LABEL;
        expect(usesPresent).toBe(experience.endDate === null);
      }),
      { numRuns: 100 },
    );
  });
});
