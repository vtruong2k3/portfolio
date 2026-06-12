/**
 * Render + a11y test cho `SceneCanvas` — "khung an toàn" dùng chung của Asset_Suite.
 *
 * `SceneCanvas` bọc một cây 3D bất kỳ trong: WebGL guard, error boundary,
 * QualityProvider, nền canvas trong suốt (alpha) và container trang trí
 * `aria-hidden`. Bài test này kiểm chứng các hành vi an toàn/tiếp cận đó mà
 * KHÔNG khởi tạo WebGL thật trong jsdom.
 *
 * Chiến lược mock (tối thiểu, có chủ đích — giống `HeroScene.test.tsx`):
 *  - `@/lib/three/webgl`: thay `isWebGLAvailable` bằng `vi.fn` điều khiển được để
 *    mô phỏng WebGL khả dụng / không khả dụng (Req 3.4).
 *  - `@react-three/fiber`: thay `Canvas` bằng marker `<div data-testid="r3f-canvas">`
 *    đồng thời GHI LẠI props (`gl`, `style`) để khẳng định nền trong suốt
 *    (alpha) — Req 1.8. `useFrame` mock no-op vì `SceneCanvas` gắn `FpsMonitor`
 *    bên trong Canvas (FpsMonitor dùng `useFrame`).
 *
 * `QualityProvider`/`useQualityTier`/`graphicsTier` là logic thuần (không WebGL)
 * nên giữ nguyên không mock.
 *
 * _Requirements: 3.4, 3.5, 3.6, 3.7, 1.8, 12.1, 12.2_
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import * as axeMatchers from "vitest-axe/matchers";
import { axe } from "vitest-axe";
import "vitest-axe/extend-expect";
import type { CSSProperties, ReactNode } from "react";

// State chia sẻ cho các mock (hoisted để dùng được bên trong factory của vi.mock).
const { webglMock, childState, canvasProps } = vi.hoisted(() => ({
  webglMock: vi.fn<() => boolean>(() => false),
  childState: { shouldThrow: false },
  canvasProps: {
    current: null as Record<string, unknown> | null,
  },
}));

// WebGL guard điều khiển được theo từng test.
vi.mock("@/lib/three/webgl", () => ({
  isWebGLAvailable: webglMock,
}));

// Canvas thật cần WebGL → thay bằng marker render children, GHI LẠI props để
// kiểm tra `gl.alpha` và `style.background` (Req 1.8).
vi.mock("@react-three/fiber", () => ({
  Canvas: (props: Record<string, unknown>) => {
    canvasProps.current = props;
    return (
      <div data-testid="r3f-canvas" style={props.style as CSSProperties}>
        {props.children as ReactNode}
      </div>
    );
  },
  useFrame: () => {},
}));

// vitest-axe 0.1.0: `extend-expect` chỉ bổ sung type augmentation, nên đăng ký
// matcher thủ công ở runtime.
expect.extend(axeMatchers);

import { SceneCanvas } from "./SceneCanvas";

/** Marker con của cảnh; có thể buộc ném lỗi để kích hoạt error boundary. */
function FakeScene() {
  if (childState.shouldThrow) {
    throw new Error("Scene boom (mô phỏng lỗi runtime trong Canvas)");
  }
  return <div data-testid="scene-child" />;
}

/** Fallback dễ nhận diện trong các ca cần phân biệt với HeroFallback mặc định. */
function CustomFallback() {
  return <div data-testid="custom-fallback" />;
}

beforeEach(() => {
  webglMock.mockReturnValue(false);
  childState.shouldThrow = false;
  canvasProps.current = null;
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("SceneCanvas — WebGL guard (Req 3.4, 3.5)", () => {
  it("renders the fallback (and no Canvas) immediately when WebGL is unavailable", () => {
    webglMock.mockReturnValue(false);

    render(
      <SceneCanvas fallback={<CustomFallback />}>
        <FakeScene />
      </SceneCanvas>,
    );

    // Fallback hiển thị NGAY trong lần render đồng bộ đầu tiên — đáp ứng ngưỡng
    // "trong vòng 1 giây" của Req 3.5 (không có bước bất đồng bộ nào).
    expect(screen.getByTestId("custom-fallback")).toBeInTheDocument();

    // Không dựng Canvas khi WebGL không khả dụng (Req 3.4, 3.5).
    expect(screen.queryByTestId("r3f-canvas")).toBeNull();
    expect(screen.queryByTestId("scene-child")).toBeNull();
  });

  it("uses HeroFallback by default when no fallback prop is provided and WebGL is unavailable", () => {
    webglMock.mockReturnValue(false);

    const { container } = render(
      <SceneCanvas>
        <FakeScene />
      </SceneCanvas>,
    );

    // HeroFallback mặc định: phần tử trang trí phủ trọn, không chặn tương tác.
    const fallback = container.querySelector(".pointer-events-none");
    expect(fallback).not.toBeNull();
    expect(fallback).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByTestId("r3f-canvas")).toBeNull();
  });

  it("mounts the Canvas (and the scene child) when WebGL is available", async () => {
    webglMock.mockReturnValue(true);

    render(
      <SceneCanvas fallback={<CustomFallback />}>
        <FakeScene />
      </SceneCanvas>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("r3f-canvas")).toBeInTheDocument();
    });
    // Cây con render được bên trong Canvas, fallback không xuất hiện.
    expect(screen.getByTestId("scene-child")).toBeInTheDocument();
    expect(screen.queryByTestId("custom-fallback")).toBeNull();
  });
});

describe("SceneCanvas — transparent canvas (Req 1.8)", () => {
  it("configures the Canvas with alpha + transparent background", async () => {
    webglMock.mockReturnValue(true);

    render(
      <SceneCanvas>
        <FakeScene />
      </SceneCanvas>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("r3f-canvas")).toBeInTheDocument();
    });

    // Canvas nhận `gl.alpha === true` (nền có alpha) và style nền trong suốt.
    const props = canvasProps.current;
    expect(props).not.toBeNull();
    expect((props!.gl as { alpha?: boolean }).alpha).toBe(true);
    expect((props!.style as CSSProperties).background).toBe("transparent");
  });
});

describe("SceneCanvas — error boundary (Req 3.6, 3.7)", () => {
  it("renders the fallback and logs via console.error when the scene throws", async () => {
    webglMock.mockReturnValue(true);
    childState.shouldThrow = true;
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <SceneCanvas fallback={<CustomFallback />}>
        <FakeScene />
      </SceneCanvas>,
    );

    // Canvas dựng rồi cây con ném lỗi → CanvasErrorBoundary chuyển sang fallback.
    await waitFor(() => {
      expect(screen.getByTestId("custom-fallback")).toBeInTheDocument();
    });

    // Cảnh lỗi không còn trong cây (Req 3.6).
    expect(screen.queryByTestId("scene-child")).toBeNull();
    // Boundary ghi log lỗi (Req 3.7).
    expect(errorSpy).toHaveBeenCalled();
  });

  it("keeps the rest of the page alive when the scene throws (Req 3.7)", async () => {
    webglMock.mockReturnValue(true);
    childState.shouldThrow = true;
    vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <div>
        <SceneCanvas fallback={<CustomFallback />}>
          <FakeScene />
        </SceneCanvas>
        <button type="button">page-content</button>
      </div>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("custom-fallback")).toBeInTheDocument();
    });

    // Nội dung anh em của Section vẫn hiển thị — trang không sập (Req 3.7).
    expect(
      screen.getByRole("button", { name: "page-content" }),
    ).toBeInTheDocument();
  });
});

describe("SceneCanvas — accessibility (Req 12.1, 12.2)", () => {
  it("marks the decorative container aria-hidden and exposes no focusable content", () => {
    webglMock.mockReturnValue(false);

    const { container } = render(
      <SceneCanvas fallback={<CustomFallback />}>
        <FakeScene />
      </SceneCanvas>,
    );

    const sceneContainer = container.firstElementChild as HTMLElement;
    expect(sceneContainer).not.toBeNull();

    // Cảnh trang trí → aria-hidden (Req 12.1).
    expect(sceneContainer).toHaveAttribute("aria-hidden", "true");

    // Ngoài thứ tự tiêu điểm bàn phím: không có `tabindex`, `<div>` mặc định
    // không nằm trong tab order, và không chứa phần tử focusable (Req 12.2).
    expect(sceneContainer).not.toHaveAttribute("tabindex");
    expect(sceneContainer.tabIndex).toBe(-1);
    expect(
      sceneContainer.querySelectorAll(
        "a, button, input, select, textarea, [tabindex]",
      ).length,
    ).toBe(0);
  });

  it("reports no accessibility violations in the fallback state (vitest-axe)", async () => {
    webglMock.mockReturnValue(false);

    const { container } = render(
      <SceneCanvas>
        <FakeScene />
      </SceneCanvas>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("reports no accessibility violations when the Canvas is mounted (vitest-axe)", async () => {
    webglMock.mockReturnValue(true);

    const { container } = render(
      <SceneCanvas>
        <FakeScene />
      </SceneCanvas>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("r3f-canvas")).toBeInTheDocument();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
