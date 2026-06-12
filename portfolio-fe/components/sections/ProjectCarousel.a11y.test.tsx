/**
 * Edge-case & accessibility tests cho `ProjectCarousel`.
 *
 * Phạm vi (cấp băng chuyền — lỗi tải/trạng thái rỗng cấp Section do
 * `ProjectsSection` đảm nhiệm):
 * - Trạng thái rỗng: danh sách dự án rỗng → thông báo trạng thái rỗng
 *   (`project-carousel-empty`, `role="status"`) (Req 8.12).
 * - Ảnh giữ chỗ: `thumbnail` `null` + `images` rỗng → ảnh giữ chỗ
 *   (`data-placeholder="true"`) thay cho ảnh dự án (Req 8.13).
 * - Ẩn liên kết: `githubUrl`/`demoUrl` là `null` → ẩn nút tương ứng (Req 8.7).
 * - Liên kết tương tác: GitHub/Demo là `<a>` có `href`, nhận tiêu điểm bàn phím
 *   và có tên truy cập (accessible name) không rỗng (Req 8.8, 12.3).
 * - Không vi phạm quy tắc tiếp cận (`vitest-axe`).
 *
 * _Requirements: 8.7, 8.8, 8.11, 8.12, 8.13, 12.3_
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  within,
} from "@testing-library/react";
import * as axeMatchers from "vitest-axe/matchers";
import { axe } from "vitest-axe";
import "vitest-axe/extend-expect";

import type { Project } from "@/types/project";
import { PROJECT_IMAGE_PLACEHOLDER } from "@/lib/three/carousel";

// vitest-axe 0.1.0: `extend-expect` chỉ bổ sung type augmentation, nên đăng ký
// matcher thủ công ở runtime (đồng nhất với các bài test a11y khác).
expect.extend(axeMatchers);

import { ProjectCarousel } from "./ProjectCarousel";

/** Tạo một `Project` với giá trị mặc định hợp lệ, cho phép ghi đè từng trường. */
function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "p1",
    title: "Sample Project",
    slug: "sample-project",
    description: "A sample project used in accessibility tests.",
    thumbnail: "/images/sample.png",
    images: [],
    techStack: ["TypeScript", "React"],
    githubUrl: "https://github.com/example/sample",
    demoUrl: "https://example.com/demo",
    featured: false,
    order: 0,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ProjectCarousel — edge cases & accessibility", () => {
  it("renders an empty-state status message when there are no projects (Req 8.12)", () => {
    render(<ProjectCarousel projects={[]} />);

    const empty = screen.getByTestId("project-carousel-empty");
    expect(empty).toBeInTheDocument();
    // Thông báo phải là live region `status` để công nghệ trợ giúp đọc được.
    expect(empty).toHaveAttribute("role", "status");
    expect(empty.textContent?.trim().length ?? 0).toBeGreaterThan(0);

    // Không có sân khấu băng chuyền nào được render khi rỗng.
    expect(screen.queryByTestId("project-carousel")).not.toBeInTheDocument();
  });

  it("uses a placeholder image when thumbnail is null and images is empty (Req 8.13)", () => {
    const project = makeProject({
      id: "no-image",
      thumbnail: null,
      images: [],
    });

    render(<ProjectCarousel projects={[project]} reducedMotion />);

    const card = screen.getByTestId("project-carousel-card");
    const imageEl = within(card).getByRole("img");

    expect(imageEl).toHaveAttribute("data-placeholder", "true");
    expect(imageEl.style.backgroundImage).toContain(PROJECT_IMAGE_PLACEHOLDER);
    // Nhãn truy cập của ảnh giữ chỗ phải mô tả việc thiếu ảnh xem trước.
    expect(imageEl).toHaveAccessibleName(/no preview image/i);
  });

  it("uses the real project image (not placeholder) when an image is available (Req 8.13)", () => {
    const project = makeProject({
      id: "with-image",
      thumbnail: "/images/real.png",
      images: [],
    });

    render(<ProjectCarousel projects={[project]} reducedMotion />);

    const card = screen.getByTestId("project-carousel-card");
    const imageEl = within(card).getByRole("img");

    expect(imageEl).toHaveAttribute("data-placeholder", "false");
    expect(imageEl.style.backgroundImage).toContain("/images/real.png");
  });

  it("hides the GitHub and Demo buttons when their URLs are null (Req 8.7)", () => {
    const project = makeProject({
      id: "no-links",
      githubUrl: null,
      demoUrl: null,
    });

    render(<ProjectCarousel projects={[project]} reducedMotion />);

    const card = screen.getByTestId("project-carousel-card");
    // Không nút GitHub/Demo nào được render khi cả hai URL đều null.
    expect(within(card).queryByRole("link")).not.toBeInTheDocument();
  });

  it("shows only the GitHub link when demoUrl is null (Req 8.7)", () => {
    const project = makeProject({
      id: "github-only",
      githubUrl: "https://github.com/example/repo",
      demoUrl: null,
    });

    render(<ProjectCarousel projects={[project]} reducedMotion />);

    const card = screen.getByTestId("project-carousel-card");
    const links = within(card).getAllByRole("link");

    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute(
      "href",
      "https://github.com/example/repo",
    );
    expect(links[0]).toHaveAccessibleName(/github/i);
  });

  it("renders GitHub/Demo as focusable <a> elements with non-empty accessible names (Req 8.8, 12.3)", () => {
    const project = makeProject({
      id: "both-links",
      title: "Nebula Dashboard",
      githubUrl: "https://github.com/example/nebula",
      demoUrl: "https://nebula.example.com",
    });

    render(<ProjectCarousel projects={[project]} reducedMotion />);

    const card = screen.getByTestId("project-carousel-card");
    const links = within(card).getAllByRole("link");

    expect(links).toHaveLength(2);

    for (const link of links) {
      // Phải là phần tử <a> thực sự với href → nhận tiêu điểm bàn phím qua Tab.
      expect(link.tagName).toBe("A");
      expect(link.getAttribute("href")).toBeTruthy();
      // Không bị loại khỏi thứ tự tiêu điểm.
      expect(link).not.toHaveAttribute("tabindex", "-1");
      // Tên truy cập không rỗng và mô tả đích đến của liên kết.
      const accessibleName = link.getAttribute("aria-label") ?? "";
      expect(accessibleName.trim().length).toBeGreaterThan(0);
      expect(accessibleName).toContain("Nebula Dashboard");
    }

    // Các nhãn phân biệt được đích đến (GitHub vs live demo).
    expect(
      within(card).getByRole("link", { name: /source code on github/i }),
    ).toBeInTheDocument();
    expect(
      within(card).getByRole("link", { name: /live demo/i }),
    ).toBeInTheDocument();
  });

  it("exposes focusable navigation buttons with descriptive accessible names (Req 8.8)", () => {
    const projects = [
      makeProject({ id: "a", slug: "a" }),
      makeProject({ id: "b", slug: "b" }),
      makeProject({ id: "c", slug: "c" }),
    ];

    render(<ProjectCarousel projects={projects} reducedMotion />);

    expect(
      screen.getByRole("button", { name: /previous project/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /next project/i }),
    ).toBeInTheDocument();
  });

  it("reports no accessibility violations with populated projects (vitest-axe)", async () => {
    const projects = [
      makeProject({ id: "a", title: "Alpha", slug: "alpha" }),
      makeProject({
        id: "b",
        title: "Beta",
        slug: "beta",
        thumbnail: null,
        images: [],
        demoUrl: null,
      }),
      makeProject({
        id: "c",
        title: "Gamma",
        slug: "gamma",
        githubUrl: null,
      }),
    ];

    const { container } = render(
      <ProjectCarousel projects={projects} reducedMotion />,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("reports no accessibility violations in the empty state (vitest-axe)", async () => {
    const { container } = render(<ProjectCarousel projects={[]} />);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
