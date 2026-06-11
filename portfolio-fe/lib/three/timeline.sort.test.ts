import fc from "fast-check";
import { describe, expect, it } from "vitest";

import type { Experience } from "@/types/experience";
import { sortExperiences } from "./timeline";

/**
 * Property-based test cho sắp xếp Experience của Experience_Timeline
 * (`sortExperiences`).
 *
 * **Validates: Requirements 9.2**
 */
describe("sortExperiences", () => {
  /** Sinh một `Experience` với `order` và `startDate` đa dạng để bao phủ tie-break. */
  const experienceArb: fc.Arbitrary<Experience> = fc.record({
    id: fc.uuid(),
    company: fc.string(),
    position: fc.string(),
    description: fc.string(),
    // startDate hợp lệ trong khoảng rộng (ms epoch) để đảm bảo phân giải được.
    startDate: fc
      .date({ min: new Date("1970-01-01"), max: new Date("2100-01-01") })
      .map((d) => d.toISOString()),
    endDate: fc.option(
      fc
        .date({ min: new Date("1970-01-01"), max: new Date("2100-01-01") })
        .map((d) => d.toISOString()),
      { nil: null },
    ),
    // order hẹp để cố tình tạo nhiều phần tử cùng order (kích hoạt tie-break).
    order: fc.integer({ min: 0, max: 5 }),
  });

  // Feature: portfolio-3d-asset-suite, Property 17: Sắp xếp Experience theo order rồi startDate
  it("Property 17: Sắp xếp Experience theo order rồi startDate", () => {
    fc.assert(
      fc.property(fc.array(experienceArb, { maxLength: 30 }), (experiences) => {
        const sorted = sortExperiences(experiences);

        // (1) Kết quả là một hoán vị của đầu vào: cùng độ dài và cùng đa tập phần tử.
        expect(sorted).toHaveLength(experiences.length);
        const countById = (arr: readonly Experience[]) => {
          const m = new Map<Experience, number>();
          for (const e of arr) m.set(e, (m.get(e) ?? 0) + 1);
          return m;
        };
        const inputCounts = countById(experiences);
        const outputCounts = countById(sorted);
        expect(outputCounts.size).toBe(inputCounts.size);
        for (const [el, count] of inputCounts) {
          expect(outputCounts.get(el)).toBe(count);
        }

        // (2) Sắp tăng dần theo order; (3) cùng order thì giảm dần theo startDate.
        for (let i = 0; i + 1 < sorted.length; i++) {
          const a = sorted[i];
          const b = sorted[i + 1];

          // order không giảm.
          expect(a.order).toBeLessThanOrEqual(b.order);

          // Cùng order: startDate không tăng (giảm dần — mốc mới hơn trước).
          if (a.order === b.order) {
            const aMs = Date.parse(a.startDate);
            const bMs = Date.parse(b.startDate);
            expect(aMs).toBeGreaterThanOrEqual(bMs);
          }
        }
      }),
      { numRuns: 100 },
    );
  });
});
