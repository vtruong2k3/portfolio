/**
 * Accessibility test cho `HeroSection`.
 *
 * Cảnh 3D Hero mang tính trang trí: nó PHẢI được đánh dấu `aria-hidden="true"`
 * và KHÔNG nhận tiêu điểm bàn phím (Req 9.1, 9.3). Toàn bộ `HeroSection` phải
 * không vi phạm các quy tắc tiếp cận (`vitest-axe`), và các cặp màu chữ/nền của
 * vùng nội dung Hero phải đạt chuẩn tương phản WCAG AA (Req 9.4).
 *
 * `@/components/three` (R3F/WebGL + `next/dynamic`) được mock thành một marker
 * `aria-hidden` nhẹ để bài test tất định, tập trung vào markup của chính
 * `HeroSection` thay vì stack 3D/WebGL không chạy được trong jsdom.
 *
 * _Requirements: 9.1, 9.3, 9.4_
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import * as axeMatchers from "vitest-axe/matchers";
import { axe } from "vitest-axe";
import "vitest-axe/extend-expect";

import {
  HERO_CONTRAST_PAIRS,
  WCAG_AA_LARGE_TEXT,
  WCAG_AA_NORMAL_TEXT,
  contrastRatio,
} from "@/lib/three/contrast";

// Mock cảnh 3D → marker `aria-hidden`, không focusable. Tránh nạp R3F/WebGL và
// `next/dynamic` trong jsdom; phản ánh đúng ràng buộc "scene container trang trí".
vi.mock("@/components/three", () => ({
  HeroSceneWithFadeIn: () => (
    <div data-testid="hero-scene" aria-hidden="true" />
  ),
}));

// vitest-axe 0.1.0: `extend-expect` chỉ bổ sung type augmentation, nên đăng ký
// matcher thủ công ở runtime.
expect.extend(axeMatchers);

import { HeroSection } from "./HeroSection";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("HeroSection accessibility", () => {
  it("marks the decorative 3D scene container aria-hidden and not keyboard focusable (Req 9.1, 9.3)", () => {
    render(<HeroSection />);

    const scene = screen.getByTestId("hero-scene");

    // Cảnh 3D là trang trí → aria-hidden (Req 9.1).
    expect(scene).toHaveAttribute("aria-hidden", "true");

    // Không nhận tiêu điểm bàn phím: không có `tabindex`, và `<div>` không nằm
    // trong thứ tự tab mặc định (`tabIndex === -1`) (Req 9.3).
    expect(scene).not.toHaveAttribute("tabindex");
    expect(scene.tabIndex).toBe(-1);

    // Không có phần tử focusable nào nằm bên trong cảnh trang trí.
    expect(
      scene.querySelectorAll("a, button, input, select, textarea, [tabindex]")
        .length,
    ).toBe(0);
  });

  it("reports no accessibility violations (vitest-axe)", async () => {
    const { container } = render(<HeroSection />);

    const results = await axe(container);

    expect(results).toHaveNoViolations();
  });

  it("keeps Hero content text/background pairs at WCAG AA contrast (Req 9.4)", () => {
    expect(HERO_CONTRAST_PAIRS.length).toBeGreaterThan(0);

    for (const pair of HERO_CONTRAST_PAIRS) {
      const ratio = contrastRatio(pair.foreground, pair.background);
      const threshold = pair.largeText
        ? WCAG_AA_LARGE_TEXT
        : WCAG_AA_NORMAL_TEXT;

      expect(
        ratio,
        `Cặp "${pair.name}" có tỉ lệ tương phản ${ratio.toFixed(
          2,
        )}:1, dưới ngưỡng AA ${threshold}:1`,
      ).toBeGreaterThanOrEqual(threshold);
    }
  });
});
