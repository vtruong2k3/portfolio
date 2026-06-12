import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  type FpsMonitorConfig,
  initFpsState,
  pushSample,
} from "./fpsMonitor";
import {
  downgradeTier,
  type GraphicsTier,
  TIER_ORDER,
} from "./graphicsTier";

/**
 * Property-based test cho hạ tier runtime khi FPS sụt.
 *
 * Tái sử dụng logic thuần của `fpsMonitor` (phát hiện cạnh lên `shouldDowngrade`)
 * và `graphicsTier` (`downgradeTier` hạ đúng một bậc, dừng ở `low`).
 *
 * _Requirements: 13.4, 13.5_
 */

/**
 * Generator cấu hình + chuỗi mẫu delta-time mô phỏng FPS sụt liên tục.
 *
 * - `windowMs` 500–2000, `minFps` 30–60, `sustainedMs` 1000–3000 (giống Property 5).
 * - `deltaMs` được chọn lớn hơn ngưỡng `1000/minFps` với biên an toàn nên FPS
 *   trung bình trượt (`1000/deltaMs`) LUÔN nằm dưới `minFps`. Việc cắt cửa sổ
 *   giữ nguyên tỉ số frames/duration nên trung bình không đổi do cắt.
 * - Số mẫu đủ để tổng thời lượng dưới ngưỡng vượt `sustainedMs`, cộng thêm vài
 *   frame để xác nhận `shouldDowngrade` KHÔNG bật lại (chỉ một lần cạnh lên).
 */
const scenarioArb: fc.Arbitrary<{
  config: FpsMonitorConfig;
  deltaMs: number;
  count: number;
}> = fc
  .record({
    windowMs: fc.integer({ min: 500, max: 2000 }),
    minFps: fc.integer({ min: 30, max: 60 }),
    sustainedMs: fc.integer({ min: 1000, max: 3000 }),
  })
  .chain((config) => {
    // deltaMs > 1000/minFps => averageFps = 1000/deltaMs < minFps (luôn dưới ngưỡng).
    // Dùng deltaMs nguyên (ms) để số học cộng dồn `belowThresholdMs` là CHÍNH XÁC
    // và khớp tuyệt đối với `Math.ceil(sustainedMs / deltaMs)`. Nếu dùng số thực,
    // tại các biên có tỉ số sustainedMs/deltaMs là số nguyên, phép cộng dồn lặp lại
    // bị sai số dấu phẩy động và bật `shouldDowngrade` trễ một frame -> flaky.
    // Cận dưới ceil(threshold*1.2) vẫn > threshold nên biên an toàn được giữ nguyên.
    const thresholdDelta = 1000 / config.minFps;
    return fc
      .integer({
        min: Math.ceil(thresholdDelta * 1.2),
        max: Math.floor(thresholdDelta * 3),
      })
      .chain((deltaMs) => {
        // Số frame tối thiểu để chạm sustainedMs, cộng thêm 5 frame quan sát.
        const minCount = Math.ceil(config.sustainedMs / deltaMs) + 5;
        return fc
          .integer({ min: minCount, max: minCount + 20 })
          .map((count) => ({ config, deltaMs, count }));
      });
  });

// Feature: portfolio-3d-asset-suite, Property 25: Hạ tier runtime khi FPS sụt và dừng ở tier thấp nhất
describe("fpsMonitor runtime downgrade — Property 25", () => {
  it("shouldDowngrade bật đúng một lần (cạnh lên) khi FPS sụt liên tục đủ lâu, và downgradeTier hạ đúng một bậc rồi dừng ở 'low'", () => {
    fc.assert(
      fc.property(
        scenarioArb,
        fc.constantFrom<GraphicsTier>(...TIER_ORDER),
        ({ config, deltaMs, count }, startTier) => {
          let state = initFpsState();
          let downgradeCount = 0;
          let firstTriggerFrame = -1;

          for (let frame = 0; frame < count; frame += 1) {
            state = pushSample(state, { deltaMs }, config);
            if (state.shouldDowngrade) {
              downgradeCount += 1;
              if (firstTriggerFrame === -1) {
                firstTriggerFrame = frame;
              }
            }
          }

          // Cạnh lên: shouldDowngrade chỉ bật ĐÚNG MỘT LẦN trong cả episode sụt FPS.
          expect(downgradeCount).toBe(1);

          // Tín hiệu bật đúng tại frame đầu tiên belowThresholdMs đạt sustainedMs.
          const expectedFrame = Math.ceil(config.sustainedMs / deltaMs) - 1;
          expect(firstTriggerFrame).toBe(expectedFrame);

          // downgradeTier hạ đúng một bậc liền kề (index tăng đúng 1), trừ khi đã ở 'low'.
          const startIndex = TIER_ORDER.indexOf(startTier);
          const afterTier = downgradeTier(startTier);
          const afterIndex = TIER_ORDER.indexOf(afterTier);
          const expectedIndex = Math.min(startIndex + 1, TIER_ORDER.length - 1);
          expect(afterIndex).toBe(expectedIndex);

          // Đã ở tier thấp nhất thì giữ nguyên (không hạ thêm) — Req 13.5.
          expect(downgradeTier("low")).toBe("low");

          // Áp dụng lặp lại luôn hội tụ và dừng ở 'low'.
          let current = startTier;
          for (let step = 0; step < TIER_ORDER.length; step += 1) {
            current = downgradeTier(current);
          }
          expect(current).toBe("low");
        },
      ),
      { numRuns: 100 },
    );
  });
});
