import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

/**
 * Unit test cho hook `usePrefersReducedMotion`.
 *
 * Kiểm chứng hook đọc đúng trạng thái ban đầu của
 * `matchMedia("(prefers-reduced-motion: reduce)")` và cập nhật phản ứng khi
 * phát sự kiện `change` mà KHÔNG cần tải lại trang.
 *
 * _Requirements: 9.2_
 */

type ChangeHandler = (event: MediaQueryListEvent) => void;

/**
 * Stub MediaQueryList có thể điều khiển được: lưu lại các listener `change` và
 * cho phép phát sự kiện change với giá trị `matches` mới.
 */
function createMatchMediaStub(initialMatches: boolean) {
  const listeners = new Set<ChangeHandler>();
  const state = { matches: initialMatches };

  const mediaQueryList = {
    get matches() {
      return state.matches;
    },
    media: "(prefers-reduced-motion: reduce)",
    addEventListener: vi.fn((type: string, handler: ChangeHandler) => {
      if (type === "change") {
        listeners.add(handler);
      }
    }),
    removeEventListener: vi.fn((type: string, handler: ChangeHandler) => {
      if (type === "change") {
        listeners.delete(handler);
      }
    }),
  };

  const matchMedia = vi.fn(() => mediaQueryList as unknown as MediaQueryList);

  /** Phát sự kiện `change` với giá trị `matches` mới (không reload). */
  function dispatchChange(matches: boolean) {
    state.matches = matches;
    const event = { matches } as MediaQueryListEvent;
    listeners.forEach((listener) => listener(event));
  }

  return { matchMedia, mediaQueryList, dispatchChange, listeners };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("usePrefersReducedMotion", () => {
  it("trả về false khi media query không khớp lúc mount", () => {
    const stub = createMatchMediaStub(false);
    vi.stubGlobal("matchMedia", stub.matchMedia);

    const { result } = renderHook(() => usePrefersReducedMotion());

    expect(result.current).toBe(false);
    expect(stub.matchMedia).toHaveBeenCalledWith(
      "(prefers-reduced-motion: reduce)",
    );
  });

  it("đồng bộ trạng thái ban đầu true khi media query đã khớp lúc mount", () => {
    const stub = createMatchMediaStub(true);
    vi.stubGlobal("matchMedia", stub.matchMedia);

    const { result } = renderHook(() => usePrefersReducedMotion());

    expect(result.current).toBe(true);
  });

  it("cập nhật state thành true khi phát sự kiện change (không reload)", () => {
    const stub = createMatchMediaStub(false);
    vi.stubGlobal("matchMedia", stub.matchMedia);

    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);

    act(() => {
      stub.dispatchChange(true);
    });

    expect(result.current).toBe(true);
  });

  it("cập nhật state thành false khi phát sự kiện change ngược lại", () => {
    const stub = createMatchMediaStub(true);
    vi.stubGlobal("matchMedia", stub.matchMedia);

    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(true);

    act(() => {
      stub.dispatchChange(false);
    });

    expect(result.current).toBe(false);
  });

  it("đăng ký listener change khi mount và gỡ khi unmount", () => {
    const stub = createMatchMediaStub(false);
    vi.stubGlobal("matchMedia", stub.matchMedia);

    const { unmount } = renderHook(() => usePrefersReducedMotion());

    expect(stub.mediaQueryList.addEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function),
    );
    expect(stub.listeners.size).toBe(1);

    unmount();

    expect(stub.mediaQueryList.removeEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function),
    );
    expect(stub.listeners.size).toBe(0);
  });
});
