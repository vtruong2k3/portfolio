/**
 * Accessibility và contrast tests cho `ExperienceTimeline`.
 *
 * `ExperienceTimeline` là lớp trình bày DOM/CSS: nền lưới/mạch điện nằm ở lớp
 * dưới (`aria-hidden`, `pointer-events: none`) phía sau các thẻ kính, và KHÔNG
 * được làm giảm tỷ lệ tương phản văn bản của thẻ xuống dưới ngưỡng WCAG AA
 * (Req 9.6). Văn bản mỗi thẻ phải đạt chuẩn WCAG AA: ≥ 4.5:1 cho văn bản thường
 * và ≥ 3:1 cho văn bản lớn (Req 9.10, 12.5).
 *
 * Hai nhóm kiểm tra:
 *   1. Tương phản: dùng các cặp màu chữ/nền thực tế của thẻ timeline trong
 *      `ASSET_SUITE_CONTRAST_PAIRS` (nền hiệu dụng = `surface-2` đặt trên nền
 *      lưới) và xác nhận đạt ngưỡng WCAG AA tương ứng.
 *   2. Không vi phạm tiếp cận: toàn bộ cây render của `ExperienceTimeline`
 *      không vi phạm các quy tắc `vitest-axe`, kể cả trạng thái có dữ liệu lẫn
 *      trạng thái rỗng.
 *
 * IntersectionObserver không tồn tại trong jsdom; component xử lý bằng cách hiển
 * thị thẻ ngay ở trạng thái cuối, nên các bài test này tất định.
 *
 * _Requirements: 9.6, 9.10, 12.5_
 */

import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import * as axeMatchers from "vitest-axe/matchers";
import { axe } from "vitest-axe";
import "vitest-axe/extend-expect";

import {
  ASSET_SUITE_CONTRAST_PAIRS,
  contrastRatio,
  WCAG_AA_LARGE_TEXT,
  WCAG_AA_NORMAL_TEXT,
} from "@/lib/three/contrast";
import type { Experience } from "@/types/experience";

// vitest-axe 0.1.0: `extend-expect` chỉ bổ sung type augmentation, nên đăng ký
// matcher thủ công ở runtime (giống HeroSection.test.tsx / SceneCanvas.test.tsx).
expect.extend(axeMatchers);

import { ExperienceTimeline } from "./ExperienceTimeline";

/** Các cặp màu áp dụng cho thẻ Experience_Timeline (nền lưới → surface-2). */
const timelinePairs = ASSET_SUITE_CONTRAST_PAIRS.filter((pair) =>
  pair.name.startsWith("timeline:"),
);

/** Mốc đã kết thúc (có `endDate`). */
const finishedExperience: Experience = {
  id: "exp-1",
  company: "Acme Corp",
  position: "Frontend Engineer",
  description: "Built the design system and component library.",
  startDate: "2020-03-01",
  endDate: "2021-06-01",
  order: 0,
};

/** Mốc đang diễn ra (`endDate` là `null`). */
const currentExperience: Experience = {
  id: "exp-2",
  company: "Globex",
  position: "Senior Engineer",
  description: "Leading the 3D portfolio initiative.",
  startDate: "2021-07-01",
  endDate: null,
  order: 1,
};

const experiences: Experience[] = [finishedExperience, currentExperience];

afterEach(() => {
  cleanup();
});

describe("ExperienceTimeline accessibility and contrast", () => {
  it("covers the timeline card text/background color pairs (Req 9.6, 9.10)", () => {
    // Bộ cặp màu của thẻ timeline phải tồn tại để bài test có ý nghĩa.
    expect(timelinePairs.length).toBeGreaterThan(0);
  });

  it("keeps timeline card text at WCAG AA contrast over the grid background (Req 9.6, 9.10, 12.5)", () => {
    for (const pair of timelinePairs) {
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

  it("reports no accessibility violations with experiences rendered (vitest-axe)", async () => {
    const { container } = render(
      <ExperienceTimeline experiences={experiences} reducedMotion={false} />,
    );

    const results = await axe(container);

    expect(results).toHaveNoViolations();
  });

  it("reports no accessibility violations under reduced motion (vitest-axe)", async () => {
    const { container } = render(
      <ExperienceTimeline experiences={experiences} reducedMotion={true} />,
    );

    const results = await axe(container);

    expect(results).toHaveNoViolations();
  });

  it("reports no accessibility violations in the empty state (vitest-axe)", async () => {
    const { container } = render(
      <ExperienceTimeline experiences={[]} reducedMotion={false} />,
    );

    const results = await axe(container);

    expect(results).toHaveNoViolations();
  });

  it("marks the decorative grid/circuit background aria-hidden and non-interactive (Req 9.6)", () => {
    const { container } = render(
      <ExperienceTimeline experiences={experiences} reducedMotion={false} />,
    );

    // Mọi phần tử trang trí (nền lưới, đường dọc, nút mạch điện) phải aria-hidden
    // và không nằm trong thứ tự tiêu điểm bàn phím.
    const decorative = container.querySelectorAll('[aria-hidden="true"]');
    expect(decorative.length).toBeGreaterThan(0);
    for (const el of Array.from(decorative)) {
      expect(
        el.querySelectorAll(
          "a, button, input, select, textarea, [tabindex]",
        ).length,
      ).toBe(0);
    }
  });
});
