import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  type DeviceSignals,
  type GraphicsTier,
  selectInitialTier,
  TIER_THRESHOLDS,
} from "./graphicsTier";

const VALID_TIERS: ReadonlySet<GraphicsTier> = new Set([
  "high",
  "medium",
  "low",
]);

/**
 * Generator cho `DeviceSignals` phủ cả vùng hợp lệ lẫn các giá trị ngoài
 * ngưỡng, kèm trường hợp `logicalCores` undefined.
 *
 * - `screenWidth`/`screenHeight`: trải từ rất nhỏ tới vượt mức desktop để bao
 *   phủ cả phía dưới ngưỡng `minScreenWidth` lẫn ngưỡng `high` (>= 1280).
 * - `devicePixelRatio`: dương, gồm cả giá trị > maxDpr.
 * - `logicalCores`: undefined hoặc nguyên không âm gồm cả < minLogicalCores
 *   và >= 8.
 */
const deviceSignalsArb: fc.Arbitrary<DeviceSignals> = fc.record({
  screenWidth: fc.integer({ min: 0, max: 4000 }),
  screenHeight: fc.integer({ min: 0, max: 4000 }),
  devicePixelRatio: fc.double({
    min: 0.1,
    max: 5,
    noNaN: true,
  }),
  logicalCores: fc.option(fc.integer({ min: 0, max: 32 }), {
    nil: undefined,
  }),
});

// Feature: hero-3d-visual-enhancement, Property 1: Chọn tier luôn hợp lệ, tất định và ép `low` khi dưới ngưỡng
describe("selectInitialTier — Property 1", () => {
  it("luôn trả về tier hợp lệ, tất định và ép `low` khi dưới ngưỡng", () => {
    fc.assert(
      fc.property(deviceSignalsArb, (signals) => {
        const result = selectInitialTier(signals);

        // 1. Kết quả luôn thuộc tập tier hợp lệ.
        expect(VALID_TIERS.has(result)).toBe(true);

        // 2. Tất định: cùng đầu vào -> cùng đầu ra.
        expect(selectInitialTier(signals)).toBe(result);

        // 3. Ép `low` khi bất kỳ tín hiệu nào dưới ngưỡng tối thiểu:
        //    screenWidth < minScreenWidth, hoặc cores được khai báo và < minLogicalCores.
        const coresKnown = typeof signals.logicalCores === "number";
        const belowWidth = signals.screenWidth < TIER_THRESHOLDS.minScreenWidth;
        const belowCores =
          coresKnown &&
          (signals.logicalCores as number) < TIER_THRESHOLDS.minLogicalCores;

        if (belowWidth || belowCores) {
          expect(result).toBe("low");
        }
      }),
      { numRuns: 100 },
    );
  });
});
