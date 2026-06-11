import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { buildEnabledEffects } from "./postProcessing";

/**
 * Property-based test cho `buildEnabledEffects`.
 *
 * _Requirements: 2.3_
 */
describe("buildEnabledEffects", () => {
  // Feature: hero-3d-visual-enhancement, Property 12: Bật/tắt bloom và vignette độc lập nhau
  // Validates: Requirements 2.3
  it("chứa 'bloom' iff enableBloom và 'vignette' iff enableVignette, độc lập nhau", () => {
    fc.assert(
      fc.property(fc.boolean(), fc.boolean(), (enableBloom, enableVignette) => {
        const effects = buildEnabledEffects({ enableBloom, enableVignette });

        expect(effects.includes("bloom")).toBe(enableBloom);
        expect(effects.includes("vignette")).toBe(enableVignette);
      }),
      { numRuns: 100 },
    );
  });
});
