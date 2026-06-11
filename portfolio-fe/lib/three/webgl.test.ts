import { afterEach, describe, expect, it, vi } from "vitest";

import { isWebGLAvailable } from "./webgl";

/**
 * Unit test cho `isWebGLAvailable`.
 *
 * Mục tiêu:
 * - KHÔNG ném lỗi khi `window`/`document` không tồn tại (SSR) và trả về `false`
 *   (Req 10.2, 10.3).
 * - Trả về `false` khi không lấy được WebGL context (mặc định trong jsdom),
 *   và `true` khi lấy được context (Req 12.1).
 * - Trả về `false` khi việc thăm dò context ném lỗi (được bắt trong try/catch).
 */
describe("isWebGLAvailable", () => {
  afterEach(() => {
    // Khôi phục mọi global/stub đã thay đổi giữa các test.
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("không ném lỗi và trả về false khi window là undefined (SSR)", () => {
    vi.stubGlobal("window", undefined);

    expect(() => isWebGLAvailable()).not.toThrow();
    expect(isWebGLAvailable()).toBe(false);
  });

  it("không ném lỗi và trả về false khi document là undefined (SSR)", () => {
    vi.stubGlobal("document", undefined);

    expect(() => isWebGLAvailable()).not.toThrow();
    expect(isWebGLAvailable()).toBe(false);
  });

  it("trả về false khi không có WebGL context khả dụng (jsdom mặc định)", () => {
    // jsdom không cung cấp WebGL context thực -> getContext trả về null.
    const canvas = document.createElement("canvas");
    vi.spyOn(canvas, "getContext").mockReturnValue(null);
    vi.spyOn(document, "createElement").mockReturnValue(canvas);

    expect(isWebGLAvailable()).toBe(false);
  });

  it("trả về true khi getContext('webgl') trả về một context", () => {
    const fakeContext = {} as RenderingContext;
    const canvas = document.createElement("canvas");
    const getContext = vi
      .spyOn(canvas, "getContext")
      .mockReturnValue(fakeContext);
    vi.spyOn(document, "createElement").mockReturnValue(canvas);

    expect(isWebGLAvailable()).toBe(true);
    expect(getContext).toHaveBeenCalledWith("webgl");
  });

  it("dùng 'experimental-webgl' làm dự phòng khi 'webgl' không khả dụng", () => {
    const fakeContext = {} as RenderingContext;
    const canvas = document.createElement("canvas");
    vi.spyOn(canvas, "getContext").mockImplementation(
      (contextId: string) =>
        contextId === "experimental-webgl" ? fakeContext : null,
    );
    vi.spyOn(document, "createElement").mockReturnValue(canvas);

    expect(isWebGLAvailable()).toBe(true);
  });

  it("trả về false khi việc thăm dò context ném lỗi (được bắt)", () => {
    const canvas = document.createElement("canvas");
    vi.spyOn(canvas, "getContext").mockImplementation(() => {
      throw new Error("WebGL bị chặn");
    });
    vi.spyOn(document, "createElement").mockReturnValue(canvas);

    expect(() => isWebGLAvailable()).not.toThrow();
    expect(isWebGLAvailable()).toBe(false);
  });
});
