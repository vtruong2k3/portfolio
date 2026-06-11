import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  contrastRatio,
  HERO_CONTRAST_PAIRS,
  type HeroContrastPair,
  WCAG_AA_LARGE_TEXT,
  WCAG_AA_NORMAL_TEXT,
} from "./contrast";

/** Generator chọn ngẫu nhiên một cặp màu chữ/nền thực tế của vùng Hero. */
const heroPairArb: fc.Arbitrary<HeroContrastPair> = fc.constantFrom(
  ...HERO_CONTRAST_PAIRS,
);

// Feature: hero-3d-visual-enhancement, Property 14: Tương phản văn bản Hero đạt chuẩn WCAG AA
describe("contrast — Property 14", () => {
  it("mọi cặp màu Hero đạt ngưỡng tương phản WCAG AA", () => {
    fc.assert(
      fc.property(heroPairArb, (pair) => {
        const ratio = contrastRatio(pair.foreground, pair.background);
        const threshold = pair.largeText
          ? WCAG_AA_LARGE_TEXT
          : WCAG_AA_NORMAL_TEXT;

        // Văn bản thường cần >= 4.5:1, văn bản lớn cần >= 3:1.
        expect(
          ratio,
          `Cặp "${pair.name}" có tương phản ${ratio.toFixed(2)}:1 (< ${threshold}:1)`,
        ).toBeGreaterThanOrEqual(threshold);
      }),
      { numRuns: 100 },
    );
  });

  it("tỉ lệ tương phản có tính đối xứng theo thứ tự fg/bg", () => {
    fc.assert(
      fc.property(heroPairArb, (pair) => {
        const forward = contrastRatio(pair.foreground, pair.background);
        const reversed = contrastRatio(pair.background, pair.foreground);
        expect(reversed).toBeCloseTo(forward, 10);
      }),
      { numRuns: 100 },
    );
  });

  it("neo đã biết: trắng so với đen cho tỉ lệ 21:1", () => {
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 5);
  });
});
