import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  averageFps,
  type FpsMonitorConfig,
  type FpsSample,
  initFpsState,
  pushSample,
} from "./fpsMonitor";

/**
 * Generator cho cấu hình giám sát FPS với các khoảng giá trị hợp lý:
 * - windowMs: 500–2000ms
 * - minFps: 30–60
 * - sustainedMs: 1000–3000ms
 */
const configArb: fc.Arbitrary<FpsMonitorConfig> = fc.record({
  windowMs: fc.integer({ min: 500, max: 2000 }),
  minFps: fc.integer({ min: 30, max: 60 }),
  sustainedMs: fc.integer({ min: 1000, max: 3000 }),
});

// Feature: hero-3d-visual-enhancement, Property 5: Giám sát FPS tính trung bình đúng và chỉ hạ tier khi thấp liên tục đủ lâu
describe("fpsMonitor — Property 5", () => {
  it("(a) khi mọi mẫu có FPS >= minFps thì shouldDowngrade luôn false và averageFps luôn >= minFps", () => {
    fc.assert(
      fc.property(
        configArb.chain((config) => {
          // Mỗi mẫu phải tương ứng FPS >= minFps, tức deltaMs <= 1000/minFps.
          // Dùng cận trên hơi chặt hơn (trừ epsilon) để tránh trường hợp biên
          // do sai số dấu phẩy động đẩy avg xuống ngay dưới ngưỡng.
          const maxDelta = 1000 / config.minFps;
          const sampleArb: fc.Arbitrary<FpsSample> = fc
            .double({ min: 1, max: maxDelta, noNaN: true })
            .map((deltaMs) => ({ deltaMs }));
          return fc
            .array(sampleArb, { minLength: 1, maxLength: 200 })
            .map((samples) => ({ config, samples }));
        }),
        ({ config, samples }) => {
          let state = initFpsState();
          for (const sample of samples) {
            state = pushSample(state, sample, config);

            // shouldDowngrade không bao giờ bật khi FPS luôn ở/trên ngưỡng.
            expect(state.shouldDowngrade).toBe(false);

            // averageFps phản ánh FPS thực và phải >= minFps (kèm dung sai float).
            const avg = averageFps(state);
            expect(avg).toBeGreaterThanOrEqual(config.minFps - 1e-6);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("(b) averageFps phản ánh đúng FPS trung bình của các mẫu trong cửa sổ", () => {
    fc.assert(
      fc.property(
        configArb.chain((config) =>
          // deltaMs <= windowMs để N mẫu bằng nhau cùng nằm vừa trong cửa sổ.
          fc
            .double({ min: 1, max: config.windowMs, noNaN: true })
            .chain((deltaMs) =>
              // Số mẫu sao cho tổng thời lượng không vượt windowMs (không bị cắt).
              fc
                .integer({
                  min: 1,
                  max: Math.max(1, Math.floor(config.windowMs / deltaMs)),
                })
                .map((count) => ({ config, deltaMs, count })),
            ),
        ),
        ({ config, deltaMs, count }) => {
          let state = initFpsState();
          for (let i = 0; i < count; i++) {
            state = pushSample(state, { deltaMs }, config);
          }

          // Với N mẫu deltaMs bằng nhau trong cửa sổ:
          // averageFps == windowFrames*1000/windowDurationMs == 1000/deltaMs.
          const expected = 1000 / deltaMs;
          const avg = averageFps(state);
          expect(avg).toBeCloseTo(expected, 6);
        },
      ),
      { numRuns: 100 },
    );
  });
});
