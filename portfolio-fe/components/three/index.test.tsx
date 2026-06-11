/**
 * Render test cho các wrapper động trong `components/three/index.tsx`:
 *  - Chỉ báo tải (`loading`) chiếm trọn nền Hero (`absolute inset-0`) (Req 11.1).
 *  - `HeroSceneWithFadeIn` áp hiệu ứng fade-in (transition opacity 0 → 1) sau
 *    khi mount phía client (Req 11.2).
 *  - Khi `prefers-reduced-motion` bật, hiển thị ngay ở opacity đầy đủ, không có
 *    transition / không fade (Req 11.3).
 *
 * Chiến lược mock (giữ tối thiểu, có chủ đích):
 *  - `next/dynamic`: thay bằng một factory ghi lại `(loader, opts)` của mỗi lần
 *    gọi `dynamic(...)` và trả về một component marker. Nhờ vậy test có thể vừa
 *    render trực tiếp `opts.loading()` để kiểm tra chỉ báo tải, vừa cho phép
 *    `HeroSceneWithFadeIn` render mà không kéo theo toàn bộ ngăn xếp R3F.
 *  - `@/hooks/usePrefersReducedMotion`: thay bằng `vi.fn` điều khiển được để bật/
 *    tắt Reduced_Motion_Mode theo từng ca test.
 *  - `requestAnimationFrame`/`cancelAnimationFrame`: thay bằng phiên bản điều
 *    khiển được để kiểm soát chính xác thời điểm `mounted` chuyển true, qua đó
 *    quan sát được cả trạng thái trước (opacity-0) và sau (opacity-100) fade.
 *
 * _Requirements: 11.1, 11.2, 11.3_
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import type { ComponentType, ReactNode } from "react";

// State chia sẻ cho các mock (hoisted để dùng được bên trong factory của vi.mock).
const { dynamicCalls, reducedMotionMock } = vi.hoisted(() => ({
  dynamicCalls: [] as Array<{
    loader: unknown;
    opts?: { ssr?: boolean; loading?: () => ReactNode };
  }>,
  reducedMotionMock: vi.fn<[], boolean>(() => false),
}));

// `next/dynamic` cần tải module R3F thật → thay bằng marker, ghi lại options để
// có thể kiểm tra chỉ báo `loading` mà không thực sự nạp HeroScene.
vi.mock("next/dynamic", () => ({
  default: (
    loader: unknown,
    opts?: { ssr?: boolean; loading?: () => ReactNode },
  ): ComponentType => {
    dynamicCalls.push({ loader, opts });
    const DynamicMarker = () => <div data-testid="dynamic-loaded" />;
    return DynamicMarker;
  },
}));

// Reduced_Motion_Mode điều khiển được theo từng test.
vi.mock("@/hooks/usePrefersReducedMotion", () => ({
  usePrefersReducedMotion: reducedMotionMock,
  default: reducedMotionMock,
}));

import {
  FADE_DURATION_MS,
  HeroSceneDynamic,
  HeroSceneWithFadeIn,
} from "./index";

/**
 * Hàng đợi callback của `requestAnimationFrame` để test chủ động flush, qua đó
 * kiểm soát chính xác thời điểm `mounted` chuyển true.
 */
let rafCallbacks: FrameRequestCallback[] = [];

function flushRaf() {
  const callbacks = rafCallbacks;
  rafCallbacks = [];
  act(() => {
    callbacks.forEach((cb) => cb(0));
  });
}

beforeEach(() => {
  reducedMotionMock.mockReturnValue(false);
  rafCallbacks = [];
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    rafCallbacks.push(cb);
    return rafCallbacks.length;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("HeroSceneDynamic — loading indicator (Req 11.1)", () => {
  it("renders a full-bleed `absolute inset-0` aria-hidden loading indicator", () => {
    // `HeroSceneDynamic` là lần gọi `dynamic(...)` đầu tiên ở thân module.
    const heroCall = dynamicCalls[0];
    expect(heroCall).toBeDefined();
    expect(heroCall.opts?.ssr).toBe(false);
    expect(typeof heroCall.opts?.loading).toBe("function");

    // Render trực tiếp chỉ báo tải mà Next.js sẽ hiển thị trong lúc nạp.
    const loadingNode = heroCall.opts!.loading!();
    const { container } = render(<>{loadingNode}</>);
    const indicator = container.firstElementChild as HTMLElement;

    expect(indicator).not.toBeNull();
    // Chiếm trọn vùng nền Hero (Req 11.1).
    expect(indicator).toHaveClass("absolute", "inset-0");
    // Mang tính trang trí → ẩn khỏi cây accessibility.
    expect(indicator).toHaveAttribute("aria-hidden", "true");
  });

  it("is exported as a usable dynamic component (ssr disabled)", () => {
    // Sanity: wrapper động render được marker (không kéo theo ngăn xếp R3F).
    const { getByTestId } = render(<HeroSceneDynamic />);
    expect(getByTestId("dynamic-loaded")).toBeInTheDocument();
  });
});

describe("HeroSceneWithFadeIn — fade-in after mount (Req 11.2)", () => {
  it("starts transparent with a transition, then fades to full opacity after mount", () => {
    reducedMotionMock.mockReturnValue(false);

    const { container } = render(<HeroSceneWithFadeIn />);
    const wrapper = container.firstElementChild as HTMLElement;

    // Trước khi khung hình kế tiếp chạy: opacity-0 + có transition opacity.
    expect(wrapper).toHaveClass("absolute", "inset-0", "transition-opacity");
    expect(wrapper).toHaveClass("opacity-0");
    expect(wrapper).not.toHaveClass("opacity-100");
    // Thời lượng fade lấy từ hằng số cấu hình (Req 11.2).
    expect(wrapper.style.transitionDuration).toBe(`${FADE_DURATION_MS}ms`);

    // Sau khi requestAnimationFrame chạy → mounted=true → fade lên opacity đầy đủ.
    flushRaf();

    expect(wrapper).toHaveClass("transition-opacity", "opacity-100");
    expect(wrapper).not.toHaveClass("opacity-0");
  });
});

describe("HeroSceneWithFadeIn — reduced motion (Req 11.3)", () => {
  it("renders immediately at full opacity with no fade transition", () => {
    reducedMotionMock.mockReturnValue(true);

    const { container } = render(<HeroSceneWithFadeIn />);
    const wrapper = container.firstElementChild as HTMLElement;

    // Hiển thị ngay ở opacity đầy đủ, không áp transition fade (Req 11.3).
    expect(wrapper).toHaveClass("absolute", "inset-0", "opacity-100");
    expect(wrapper).not.toHaveClass("transition-opacity");
    expect(wrapper).not.toHaveClass("opacity-0");

    // Dù khung hình kế tiếp có chạy, vẫn không xuất hiện hiệu ứng fade.
    flushRaf();
    expect(wrapper).toHaveClass("opacity-100");
    expect(wrapper).not.toHaveClass("transition-opacity");
  });
});
