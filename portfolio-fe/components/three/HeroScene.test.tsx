/**
 * Render test cho `HeroScene` (Canvas wrapper + WebGL guard + error boundary)
 * và `HeroFallback` (nền tĩnh không-WebGL).
 *
 * Chiến lược mock (giữ tối thiểu, có chủ đích):
 *  - `@/lib/three/webgl`: thay `isWebGLAvailable` bằng một `vi.fn` điều khiển được
 *    để mô phỏng WebGL khả dụng / không khả dụng theo từng ca test.
 *  - `@react-three/fiber`: thay `Canvas` bằng một marker `<div data-testid="r3f-canvas">`
 *    để tránh khởi tạo WebGL thật trong jsdom, đồng thời cho phép kiểm tra
 *    Canvas có/không được dựng.
 *  - `@/components/three/hero/Scene`: thay bằng marker, có thể buộc ném lỗi runtime
 *    để kích hoạt `CanvasErrorBoundary`.
 *
 * `QualityProvider`/`useQualityTier`/`graphicsTier` là logic thuần (không WebGL)
 * nên giữ nguyên không mock.
 *
 * _Requirements: 8.3, 12.1, 12.2, 12.3, 12.4_
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import type { ReactNode } from "react";

import { PALETTE } from "@/lib/three/palette";

// State chia sẻ cho các mock (hoisted để dùng được bên trong factory của vi.mock).
const { webglMock, sceneState } = vi.hoisted(() => ({
  webglMock: vi.fn<() => boolean>(() => false),
  sceneState: { shouldThrow: false },
}));

// WebGL guard điều khiển được theo từng test.
vi.mock("@/lib/three/webgl", () => ({
  isWebGLAvailable: webglMock,
}));

// Canvas thật cần WebGL → thay bằng marker render children.
// `useFrame` cũng được mock (no-op) vì `SceneCanvas` gắn một `FpsMonitor` bên
// trong Canvas và FpsMonitor dựa vào `useFrame`.
vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children }: { children?: ReactNode }) => (
    <div data-testid="r3f-canvas">{children}</div>
  ),
  useFrame: () => {},
}));

// Scene thật kéo theo nhiều phụ thuộc 3D → thay bằng marker, có thể ném lỗi.
vi.mock("@/components/three/hero/Scene", () => ({
  Scene: () => {
    if (sceneState.shouldThrow) {
      throw new Error("Scene boom (mô phỏng lỗi runtime trong Canvas)");
    }
    return <div data-testid="r3f-scene" />;
  },
}));

import { HeroScene } from "./HeroScene";
import { HeroFallback } from "./HeroFallback";

const PALETTE_HEXES = [PALETTE.cyan, PALETTE.violet, PALETTE.blue, PALETTE.pink];

/**
 * jsdom chuẩn hóa màu hex trong `style.backgroundImage` thành dạng
 * `rgb(r, g, b)`. Chuyển mỗi mã hex của PALETTE sang đúng dạng đó để khẳng định
 * gradient thực sự dùng các màu của bảng màu chủ đạo (Req 12.3).
 */
function hexToRgbString(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

const PALETTE_RGBS = PALETTE_HEXES.map(hexToRgbString);

beforeEach(() => {
  webglMock.mockReturnValue(false);
  sceneState.shouldThrow = false;
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("HeroFallback", () => {
  it("renders a decorative, non-interactive full-bleed gradient using PALETTE (Req 12.3, 12.4)", () => {
    const { container } = render(<HeroFallback />);
    const fallback = container.firstElementChild as HTMLElement;

    expect(fallback).not.toBeNull();
    // Full-bleed + không chặn tương tác (Req 12.4).
    expect(fallback).toHaveClass("absolute", "inset-0", "pointer-events-none");
    // Trang trí, ẩn khỏi cây accessibility.
    expect(fallback).toHaveAttribute("aria-hidden", "true");

    // Nền gradient dùng ĐÚNG 4 mã màu của PALETTE (Req 12.3).
    const backgroundImage = fallback.style.backgroundImage;
    for (const rgb of PALETTE_RGBS) {
      expect(backgroundImage).toContain(rgb);
    }
  });

  it("merges an extra className while keeping the default classes", () => {
    const { container } = render(<HeroFallback className="custom-x" />);
    const fallback = container.firstElementChild as HTMLElement;
    expect(fallback).toHaveClass(
      "absolute",
      "inset-0",
      "pointer-events-none",
      "custom-x",
    );
  });
});

describe("HeroScene — WebGL guard (Req 12.1)", () => {
  it("renders the fallback (and no Canvas) when WebGL is unavailable", async () => {
    webglMock.mockReturnValue(false);

    const { container } = render(<HeroScene />);

    // Effect sau mount chạy → state ổn định ở nhánh fallback.
    await waitFor(() => {
      expect(container.querySelector(".pointer-events-none")).not.toBeNull();
    });

    // Không dựng Canvas khi WebGL không khả dụng.
    expect(screen.queryByTestId("r3f-canvas")).toBeNull();

    // Fallback là gradient PALETTE.
    const fallback = container.querySelector(
      ".pointer-events-none",
    ) as HTMLElement;
    for (const rgb of PALETTE_RGBS) {
      expect(fallback.style.backgroundImage).toContain(rgb);
    }
  });

  it("mounts the Canvas when WebGL is available", async () => {
    webglMock.mockReturnValue(true);

    render(<HeroScene />);

    await waitFor(() => {
      expect(screen.getByTestId("r3f-canvas")).toBeInTheDocument();
    });
    // Scene marker render được bên trong Canvas (không có lỗi).
    expect(screen.getByTestId("r3f-scene")).toBeInTheDocument();
  });
});

describe("HeroScene — error boundary (Req 12.2)", () => {
  it("renders the fallback and logs via console.error when the Canvas subtree throws", async () => {
    webglMock.mockReturnValue(true);
    sceneState.shouldThrow = true;
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { container } = render(<HeroScene />);

    // Sau khi WebGL khả dụng (post-mount effect), Canvas dựng rồi Scene ném lỗi
    // → CanvasErrorBoundary chuyển sang HeroFallback.
    await waitFor(() => {
      expect(container.querySelector(".pointer-events-none")).not.toBeNull();
    });

    // Đã chuyển sang fallback: Canvas/Scene không còn trong cây.
    expect(screen.queryByTestId("r3f-canvas")).toBeNull();
    expect(screen.queryByTestId("r3f-scene")).toBeNull();

    // Boundary ghi log lỗi (Req 12.2).
    expect(errorSpy).toHaveBeenCalled();
  });
});

describe("HeroScene fallback — interaction passthrough (Req 12.4)", () => {
  it("does not block clicks on sibling Hero content because it is pointer-events-none", () => {
    const onClick = vi.fn();
    render(
      <div style={{ position: "relative" }}>
        <HeroFallback />
        <button type="button" onClick={onClick}>
          cta
        </button>
      </div>,
    );

    fireEvent.click(screen.getByRole("button", { name: "cta" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
