import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  type GraphicsTier,
  TIER_ORDER,
  TIER_PRESETS,
  getPreset,
} from "./graphicsTier";

/**
 * Property-based test cho `TIER_PRESETS` của module quản lý chất lượng đồ họa.
 *
 * **Validates: Requirements 1.4, 2.4, 3.4, 3.5, 7.3, 7.5, 7.6**
 */
describe("TIER_PRESETS", () => {
  // Feature: hero-3d-visual-enhancement, Property 2: Preset của mỗi tier hợp lệ và đơn điệu theo tier
  it("Property 2: Preset của mỗi tier hợp lệ và đơn điệu theo tier", () => {
    fc.assert(
      fc.property(fc.constantFrom(...TIER_ORDER), (tier: GraphicsTier) => {
        const preset = getPreset(tier);

        // Preset phải tự nhất quán: trường `tier` khớp tier được tra cứu.
        expect(preset.tier).toBe(tier);

        if (tier === "low") {
          // Tier `low` tắt mọi tính năng tốn kém (Req 2.4, 3.4, 3.5, 7.3, 7.5, 7.6).
          expect(preset.postProcessing).toBe(false);
          expect(preset.shadows).toBe(false);
          expect(preset.antialias).toBe(false);
          expect(preset.envMapResolution).not.toBe("high");
        }

        if (tier === "high") {
          // Tier `high` bật chất lượng cao nhất (Req 1.4, 3.4, 3.5).
          expect(preset.shadows).toBe(true);
          expect(preset.antialias).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });

  // Kiểm tra tính đơn điệu (non-increasing) khi đi high -> medium -> low.
  // TIER_ORDER = ["high", "medium", "low"] đã sắp giảm dần về năng lực.
  it("particleCount và maxDpr không tăng dần theo TIER_ORDER (high -> low)", () => {
    for (let i = 1; i < TIER_ORDER.length; i += 1) {
      const prev = TIER_PRESETS[TIER_ORDER[i - 1]];
      const curr = TIER_PRESETS[TIER_ORDER[i]];
      expect(curr.particleCount).toBeLessThanOrEqual(prev.particleCount);
      expect(curr.maxDpr).toBeLessThanOrEqual(prev.maxDpr);
    }
  });
});
