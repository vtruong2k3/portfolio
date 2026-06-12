/**
 * A11y test cho cảnh Hero chứa `DesktopModel` (Programmer Desktop) — vật thể 3D
 * trung tâm (focal) thay thế TorusKnot.
 *
 * Trọng tâm: KHẲNG ĐỊNH cảnh 3D chứa Desktop_Model là **thuần trang trí** trong
 * cây khả năng truy cập — container mang `aria-hidden="true"` (Req 4.10, 12.1)
 * và nằm NGOÀI thứ tự tiêu điểm bàn phím, không phơi bất kỳ phần tử nào nhận
 * được focus qua Tab/Shift+Tab (Req 12.2). Cảnh được kiểm thêm bằng `vitest-axe`
 * để không có vi phạm tiếp cận nào.
 *
 * `DesktopModel` sống BÊN TRONG `<Canvas>` (qua `HeroScene → SceneCanvas → Scene`).
 * Bản thân nội dung WebGL không nằm trong cây DOM ngữ nghĩa; điều bảo đảm khả
 * năng truy cập là container `aria-hidden` do `SceneCanvas` dựng (xem chú thích
 * đầu `DesktopModel.tsx`: "Cảnh chứa component này đã mang aria-hidden ở
 * SceneCanvas — Req 4.10"). Vì vậy bài test này kiểm chứng ở TẦNG DOM thật chứ
 * không dùng renderer 3D headless (hành vi 3D của Desktop_Model đã được phủ bởi
 * `DesktopModel.test.tsx`).
 *
 * Chiến lược mock (tối thiểu, có chủ đích — giống `HeroScene.test.tsx` /
 * `SceneCanvas.test.tsx`):
 *  - `@/lib/three/webgl`: thay `isWebGLAvailable` bằng `vi.fn` điều khiển được để
 *    mô phỏng WebGL khả dụng (Canvas mount) và không khả dụng (fallback).
 *  - `@react-three/fiber`: thay `Canvas` bằng marker `<div data-testid="r3f-canvas">`
 *    render children vào DOM (tránh khởi tạo WebGL thật trong jsdom); `useFrame`
 *    no-op vì `SceneCanvas` gắn `FpsMonitor` bên trong Canvas.
 *  - `@/components/three/hero/Scene`: thay bằng marker `data-testid="desktop-model"`
 *    đại diện cho cây Desktop_Model nằm trong Canvas. Scene thật kéo theo nhiều
 *    phụ thuộc R3F (Lighting, PostProcessing…) không render headless được; ở đây
 *    ta chỉ quan tâm cảnh chứa Desktop_Model được phơi ra sao trong DOM/a11y.
 *
 * `QualityProvider`/`useQualityTier`/`graphicsTier` là logic thuần (không WebGL)
 * nên giữ nguyên không mock.
 *
 * _Requirements: 4.10, 12.1, 12.2_
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import * as axeMatchers from "vitest-axe/matchers";
import { axe } from "vitest-axe";
import "vitest-axe/extend-expect";
import type { ReactNode } from "react";

// State chia sẻ cho các mock (hoisted để dùng được bên trong factory của vi.mock).
const { webglMock } = vi.hoisted(() => ({
  webglMock: vi.fn<() => boolean>(() => true),
}));

// WebGL guard điều khiển được theo từng test.
vi.mock("@/lib/three/webgl", () => ({
  isWebGLAvailable: webglMock,
}));

// Canvas thật cần WebGL → thay bằng marker render children vào DOM.
// `useFrame` mock no-op vì `SceneCanvas` gắn `FpsMonitor` (dùng useFrame) bên
// trong Canvas.
vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children }: { children?: ReactNode }) => (
    <div data-testid="r3f-canvas">{children}</div>
  ),
  useFrame: () => {},
}));

// Scene thật (chứa DesktopModel + Lighting + PostProcessing…) kéo theo nhiều phụ
// thuộc R3F không render headless trong jsdom → thay bằng marker đại diện cho
// cây Desktop_Model nằm bên trong Canvas.
vi.mock("@/components/three/hero/Scene", () => ({
  Scene: () => <div data-testid="desktop-model" />,
}));

// vitest-axe 0.1.0: `extend-expect` chỉ bổ sung type augmentation, nên đăng ký
// matcher thủ công ở runtime.
expect.extend(axeMatchers);

import { HeroScene } from "@/components/three/HeroScene";

beforeEach(() => {
  webglMock.mockReturnValue(true);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("HeroScene with DesktopModel — decorative scene (Req 4.10, 12.1)", () => {
  it("marks the scene container aria-hidden so Desktop_Model is decorative", async () => {
    webglMock.mockReturnValue(true);

    const { container } = render(<HeroScene />);

    // Canvas (chứa Desktop_Model) mount khi WebGL khả dụng.
    await waitFor(() => {
      expect(screen.getByTestId("r3f-canvas")).toBeInTheDocument();
    });

    // Container của cảnh là phần tử gốc do SceneCanvas dựng.
    const sceneContainer = container.firstElementChild as HTMLElement;
    expect(sceneContainer).not.toBeNull();

    // Cảnh trang trí → aria-hidden="true" (Req 4.10, 12.1).
    expect(sceneContainer).toHaveAttribute("aria-hidden", "true");

    // Desktop_Model (marker) nằm BÊN TRONG container aria-hidden → được đánh dấu
    // trang trí trong cây khả năng truy cập (Req 4.10).
    const desktopModel = screen.getByTestId("desktop-model");
    expect(desktopModel).toBeInTheDocument();
    expect(sceneContainer.contains(desktopModel)).toBe(true);
    expect(desktopModel.closest("[aria-hidden='true']")).toBe(sceneContainer);
  });

  it("keeps the scene decorative in the WebGL-unavailable fallback state", () => {
    webglMock.mockReturnValue(false);

    const { container } = render(<HeroScene />);

    // Không dựng Canvas khi WebGL không khả dụng; vẫn là cảnh trang trí.
    expect(screen.queryByTestId("r3f-canvas")).toBeNull();

    const sceneContainer = container.firstElementChild as HTMLElement;
    expect(sceneContainer).toHaveAttribute("aria-hidden", "true");

    // Fallback (HeroFallback) cũng trang trí, không chặn tương tác.
    const fallback = sceneContainer.querySelector(".pointer-events-none");
    expect(fallback).not.toBeNull();
    expect(fallback).toHaveAttribute("aria-hidden", "true");
  });
});

describe("HeroScene with DesktopModel — outside keyboard focus order (Req 12.2)", () => {
  it("exposes no focusable content and is not itself in the tab order", async () => {
    webglMock.mockReturnValue(true);

    const { container } = render(<HeroScene />);

    await waitFor(() => {
      expect(screen.getByTestId("r3f-canvas")).toBeInTheDocument();
    });

    const sceneContainer = container.firstElementChild as HTMLElement;

    // Container không tự nằm trong tab order: không có `tabindex` và `<div>` mặc
    // định có tabIndex -1 (không nhận focus qua Tab/Shift+Tab) — Req 12.2.
    expect(sceneContainer).not.toHaveAttribute("tabindex");
    expect(sceneContainer.tabIndex).toBe(-1);

    // Không phơi bất kỳ phần tử nào có thể nhận tiêu điểm bàn phím — Req 12.2.
    expect(
      sceneContainer.querySelectorAll(
        "a, button, input, select, textarea, [tabindex]",
      ).length,
    ).toBe(0);
  });
});

describe("HeroScene with DesktopModel — vitest-axe (Req 4.10, 12.1, 12.2)", () => {
  it("reports no accessibility violations when the Canvas (Desktop_Model) is mounted", async () => {
    webglMock.mockReturnValue(true);

    const { container } = render(<HeroScene />);

    await waitFor(() => {
      expect(screen.getByTestId("r3f-canvas")).toBeInTheDocument();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("reports no accessibility violations in the fallback state", async () => {
    webglMock.mockReturnValue(false);

    const { container } = render(<HeroScene />);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
