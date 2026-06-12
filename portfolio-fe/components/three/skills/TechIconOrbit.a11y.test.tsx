/**
 * A11y test cho cảnh Skills Orbit (Tech_Icon_Orbit) — quỹ đạo các
 * `Tech_Icon_Card` bay quanh tâm, render qua `SkillsOrbitScene`.
 *
 * Trọng tâm: KHẲNG ĐỊNH cảnh 3D chứa `TechIconOrbit` là **thuần trang trí**
 * trong cây khả năng truy cập — container do `SceneCanvas` dựng mang
 * `aria-hidden="true"` (Req 12.1) và nằm NGOÀI thứ tự tiêu điểm bàn phím, không
 * phơi bất kỳ phần tử nào nhận được focus qua Tab/Shift+Tab (Req 12.2). Cảnh
 * được kiểm thêm bằng `vitest-axe` để không có vi phạm tiếp cận nào.
 *
 * `TechIconOrbit` sống BÊN TRONG `<Canvas>` (qua `SkillsOrbitScene → SceneCanvas`).
 * Nội dung WebGL không nằm trong cây DOM ngữ nghĩa; điều bảo đảm khả năng truy
 * cập là container `aria-hidden` do `SceneCanvas` dựng (xem chú thích đầu
 * `SkillsOrbitScene.tsx`: "Cảnh mang tính trang trí: SceneCanvas đã đặt
 * aria-hidden..."). Vì vậy bài test này kiểm chứng ở TẦNG DOM thật chứ không
 * dùng renderer 3D headless (hành vi 3D / chọn số thẻ của Tech_Icon_Orbit đã
 * được phủ bởi `TechIconOrbit.test.tsx`).
 *
 * Chiến lược mock (tối thiểu, có chủ đích — giống `SceneCanvas.test.tsx` /
 * `DesktopModel.a11y.test.tsx`):
 *  - `@/lib/three/webgl`: thay `isWebGLAvailable` bằng `vi.fn` điều khiển được để
 *    mô phỏng WebGL khả dụng (Canvas mount) và không khả dụng (fallback).
 *  - `@react-three/fiber`: thay `Canvas` bằng marker `<div data-testid="r3f-canvas">`
 *    render children vào DOM (tránh khởi tạo WebGL thật trong jsdom); `useFrame`
 *    no-op vì `SceneCanvas` gắn `FpsMonitor` (dùng useFrame) bên trong Canvas và
 *    `TechIconOrbit` cập nhật vị trí quỹ đạo mỗi frame qua `useFrame`.
 *  - `@/components/three/skills/TechIconOrbit`: thay bằng marker
 *    `data-testid="tech-icon-orbit"` đại diện cho cây Tech_Icon_Orbit nằm trong
 *    Canvas. Orbit thật render các đối tượng R3F (`<group>`, `<Billboard>`…)
 *    không render headless được trong jsdom; ở đây ta chỉ quan tâm cảnh chứa nó
 *    được phơi ra sao trong DOM/a11y.
 *  - `@/hooks/queries/use-skills`: thay `useSkills` (React Query) bằng `vi.fn` để
 *    `SkillsOrbitScene` nạp dữ liệu ở tầng DOM mà không cần `QueryClientProvider`.
 *
 * `QualityProvider`/`useQualityTier`/`graphicsTier` là logic thuần (không WebGL)
 * nên giữ nguyên không mock.
 *
 * _Requirements: 12.1, 12.2_
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
// `useFrame` mock no-op vì `SceneCanvas` gắn `FpsMonitor` và `TechIconOrbit` đều
// dùng useFrame bên trong Canvas.
vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children }: { children?: ReactNode }) => (
    <div data-testid="r3f-canvas">{children}</div>
  ),
  useFrame: () => {},
}));

// Tech_Icon_Orbit thật render các đối tượng R3F (group/Billboard/material…) không
// render headless trong jsdom → thay bằng marker đại diện cho cây Orbit nằm bên
// trong Canvas.
vi.mock("@/components/three/skills/TechIconOrbit", () => ({
  TechIconOrbit: () => <div data-testid="tech-icon-orbit" />,
}));

// useSkills dùng React Query (cần QueryClientProvider) → thay bằng stub trả dữ
// liệu ở tầng DOM. Dữ liệu cụ thể không quan trọng vì Orbit đã được mock.
vi.mock("@/hooks/queries/use-skills", () => ({
  useSkills: () => ({ data: [] }),
}));

// vitest-axe 0.1.0: `extend-expect` chỉ bổ sung type augmentation, nên đăng ký
// matcher thủ công ở runtime.
expect.extend(axeMatchers);

import { SkillsOrbitScene } from "@/components/three/skills/SkillsOrbitScene";

beforeEach(() => {
  webglMock.mockReturnValue(true);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("SkillsOrbitScene — decorative scene (Req 12.1)", () => {
  it("marks the scene container aria-hidden so Tech_Icon_Orbit is decorative", async () => {
    webglMock.mockReturnValue(true);

    const { container } = render(<SkillsOrbitScene />);

    // Canvas (chứa Tech_Icon_Orbit) mount khi WebGL khả dụng.
    await waitFor(() => {
      expect(screen.getByTestId("r3f-canvas")).toBeInTheDocument();
    });

    // Container của cảnh là phần tử gốc do SceneCanvas dựng.
    const sceneContainer = container.firstElementChild as HTMLElement;
    expect(sceneContainer).not.toBeNull();

    // Cảnh trang trí → aria-hidden="true" (Req 12.1).
    expect(sceneContainer).toHaveAttribute("aria-hidden", "true");

    // Tech_Icon_Orbit (marker) nằm BÊN TRONG container aria-hidden → được đánh
    // dấu trang trí trong cây khả năng truy cập (Req 12.1).
    const orbit = screen.getByTestId("tech-icon-orbit");
    expect(orbit).toBeInTheDocument();
    expect(sceneContainer.contains(orbit)).toBe(true);
    expect(orbit.closest("[aria-hidden='true']")).toBe(sceneContainer);
  });

  it("keeps the scene decorative in the WebGL-unavailable fallback state", () => {
    webglMock.mockReturnValue(false);

    const { container } = render(<SkillsOrbitScene />);

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

describe("SkillsOrbitScene — outside keyboard focus order (Req 12.2)", () => {
  it("exposes no focusable content and is not itself in the tab order", async () => {
    webglMock.mockReturnValue(true);

    const { container } = render(<SkillsOrbitScene />);

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

describe("SkillsOrbitScene — vitest-axe (Req 12.1, 12.2)", () => {
  it("reports no accessibility violations when the Canvas (Tech_Icon_Orbit) is mounted", async () => {
    webglMock.mockReturnValue(true);

    const { container } = render(<SkillsOrbitScene />);

    await waitFor(() => {
      expect(screen.getByTestId("r3f-canvas")).toBeInTheDocument();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("reports no accessibility violations in the fallback state", async () => {
    webglMock.mockReturnValue(false);

    const { container } = render(<SkillsOrbitScene />);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
