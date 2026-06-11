import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  ASSET_SUITE_CONTRAST_PAIRS,
  contrastRatio,
  type HeroContrastPair,
  WCAG_AA_LARGE_TEXT,
  WCAG_AA_NORMAL_TEXT,
} from "./contrast";

/** Generator chọn ngẫu nhiên một cặp màu chữ/nền thực tế của Asset_Suite. */
const assetSuitePairArb: fc.Arbitrary<HeroContrastPair> = fc.constantFrom(
  ...ASSET_SUITE_CONTRAST_PAIRS,
);

// Feature: portfolio-3d-asset-suite, Property 21: Tương phản văn bản đạt chuẩn WCAG AA
describe("contrast (Asset_Suite) — Property 21", () => {
  it("mọi cặp màu Asset_Suite đạt ngưỡng WCAG AA, đối xứng và nằm trong [1, 21]", () => {
    fc.assert(
      fc.property(assetSuitePairArb, (pair) => {
        const ratio = contrastRatio(pair.foreground, pair.background);

        // Văn bản thường cần >= 4.5:1, văn bản lớn cần >= 3:1.
        const threshold = pair.largeText
          ? WCAG_AA_LARGE_TEXT
          : WCAG_AA_NORMAL_TEXT;
        expect(
          ratio,
          `Cặp "${pair.name}" có tương phản ${ratio.toFixed(2)}:1 (< ${threshold}:1)`,
        ).toBeGreaterThanOrEqual(threshold);

        // Tỉ lệ tương phản luôn nằm trong khoảng hợp lệ [1, 21].
        expect(ratio).toBeGreaterThanOrEqual(1);
        expect(ratio).toBeLessThanOrEqual(21);

        // Tính đối xứng: thứ tự fg/bg không ảnh hưởng tới kết quả.
        const reversed = contrastRatio(pair.background, pair.foreground);
        expect(reversed).toBeCloseTo(ratio, 10);
      }),
      { numRuns: 100 },
    );
  });
});
