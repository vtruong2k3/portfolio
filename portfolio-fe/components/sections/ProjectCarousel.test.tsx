/**
 * Render tests cho `ProjectCarousel`.
 *
 * Component là lớp trình bày DOM/CSS 3D mỏng tiêu thụ các hàm thuần trong
 * `lib/three/carousel.ts`. Các bài test dưới đây tập trung vào hành vi render
 * và tương tác mà người dùng quan sát được:
 *
 * - Render trường dữ liệu Project_Card: tiêu đề, mô tả, tech stack, liên kết,
 *   ảnh thực/giữ chỗ (Req 8.2).
 * - Dải tỉ lệ phóng/độ mờ: thẻ trung tâm phóng 1.1–1.3×, thẻ hai bên độ mờ
 *   0.4–0.6 (Req 8.3).
 * - Hover: nghiêng ≤ 15°, phóng ảnh ≤ 1.1×, phát sáng viền, hoàn tất trong
 *   100–300ms (Req 8.4).
 * - Điều hướng next/prev đổi thẻ trung tâm, hoàn tất trong 300–600ms (Req 8.5).
 * - Reduced_Motion_Mode: tắt nghiêng/phóng ảnh, chuyển thẻ ≤ 100ms (Req 8.9).
 * - Viewport ≤ 768px: một thẻ trung tâm, tiêu đề ≥ 16px, vùng chạm ≥ 44×44px
 *   (Req 8.10).
 *
 * jsdom không cài `matchMedia`; component có guard nên mặc định chạy ở bố cục
 * desktop (không giảm chuyển động). Các bài test mobile/reduced-motion truyền
 * prop `reducedMotion` hoặc mock `matchMedia` một cách tường minh để tất định.
 *
 * _Requirements: 8.2, 8.3, 8.4, 8.5, 8.9, 8.10_
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { Project } from "@/types/project";
import { ProjectCarousel } from "./ProjectCarousel";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  // jsdom mặc định không có matchMedia; khôi phục trạng thái đó giữa các test.
  delete (window as unknown as { matchMedia?: unknown }).matchMedia;
});

// --- Dữ liệu mẫu -----------------------------------------------------------

/** Dự án đầy đủ: có thumbnail, cả hai liên kết, 5 công nghệ (kiểm thử "+N"). */
const projectFull: Project = {
  id: "p1",
  title: "Project One",
  slug: "project-one",
  description: "First project description.",
  thumbnail: "/img/p1.png",
  images: [],
  techStack: ["React", "TypeScript", "Next.js", "Three.js", "GSAP"],
  githubUrl: "https://github.com/example/p1",
  demoUrl: "https://p1.example.dev",
  featured: true,
  order: 0,
  createdAt: "2024-01-01",
  updatedAt: "2024-01-02",
};

/** Dự án không có thumbnail (dùng images), ẩn nút GitHub (githubUrl null). */
const projectNoGithub: Project = {
  id: "p2",
  title: "Project Two",
  slug: "project-two",
  description: "Second project description.",
  thumbnail: null,
  images: ["/img/p2.png"],
  techStack: ["Vue"],
  githubUrl: null,
  demoUrl: "https://p2.example.dev",
  featured: false,
  order: 1,
  createdAt: "2024-01-01",
  updatedAt: "2024-01-02",
};

/** Dự án không có ảnh nào và không có liên kết → ảnh giữ chỗ, không nút. */
const projectPlaceholder: Project = {
  id: "p3",
  title: "Project Three",
  slug: "project-three",
  description: "Third project description.",
  thumbnail: null,
  images: [],
  techStack: [],
  githubUrl: null,
  demoUrl: null,
  featured: false,
  order: 2,
  createdAt: "2024-01-01",
  updatedAt: "2024-01-02",
};

const projects: Project[] = [projectFull, projectNoGithub, projectPlaceholder];

// --- Tiện ích --------------------------------------------------------------

/** Lấy tất cả thẻ trong băng chuyền. */
function getCards(): HTMLElement[] {
  return screen.getAllByTestId("project-carousel-card");
}

/** Lấy thẻ đang ở vị trí trung tâm (data-center="true"). */
function getCenterCard(): HTMLElement {
  const center = getCards().find(
    (card) => card.getAttribute("data-center") === "true",
  );
  if (!center) throw new Error("No center card found");
  return center;
}

/** Lấy thẻ chứa tiêu đề cho trước. */
function getCardByTitle(title: string): HTMLElement {
  const card = screen
    .getByText(title)
    .closest('[data-testid="project-carousel-card"]');
  if (!card) throw new Error(`No card found for title: ${title}`);
  return card as HTMLElement;
}

/** Phần tử nội dung có ref tilt (con trực tiếp dạng div của thẻ). */
function getTiltElement(card: HTMLElement): HTMLElement {
  const el = card.querySelector("div.rounded-2xl");
  if (!el) throw new Error("No tilt element found");
  return el as HTMLElement;
}

/** Trích giá trị `scale(...)` từ chuỗi transform. */
function parseScale(transform: string): number {
  const m = transform.match(/scale\(([-\d.]+)\)/);
  return m ? parseFloat(m[1]) : NaN;
}

/** Trích `rotateX/rotateY(...)deg` từ chuỗi transform. */
function parseRotate(transform: string, axis: "X" | "Y"): number {
  const m = transform.match(new RegExp(`rotate${axis}\\(([-\\d.]+)deg\\)`));
  return m ? parseFloat(m[1]) : NaN;
}

/** Trích thời lượng (ms) của một thuộc tính trong chuỗi transition. */
function parseTransitionMs(transition: string, prop: string): number {
  const part = transition
    .split(",")
    .map((s) => s.trim())
    .find((s) => s.startsWith(prop));
  const m = part?.match(/([\d.]+)ms/);
  return m ? parseFloat(m[1]) : NaN;
}

/** Span bộ đếm "N / M" (aria-live). */
function getCounter(): HTMLElement {
  return screen.getByText((_content, el) => {
    if (!el || el.tagName !== "SPAN") return false;
    return /^\s*\d+\s*\/\s*\d+\s*$/.test(el.textContent ?? "");
  });
}

/** Mock matchMedia: khớp "(max-width: 768px)" theo cờ truyền vào. */
function mockMatchMedia(maxWidthMatches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes("max-width: 768px") ? maxWidthMatches : false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

// --- Tests -----------------------------------------------------------------

describe("ProjectCarousel rendering", () => {
  it("renders Project_Card fields from Project data: title, description, tech stack, links, image (Req 8.2)", () => {
    render(<ProjectCarousel projects={projects} reducedMotion={false} />);

    // Tiêu đề + mô tả của mỗi dự án.
    expect(screen.getByText("Project One")).toBeInTheDocument();
    expect(screen.getByText("First project description.")).toBeInTheDocument();
    expect(screen.getByText("Project Two")).toBeInTheDocument();
    expect(screen.getByText("Project Three")).toBeInTheDocument();

    // Tech stack: 4 badge đầu + chỉ báo "+1" cho công nghệ thứ 5.
    const fullCard = getCardByTitle("Project One");
    expect(within(fullCard).getByText("React")).toBeInTheDocument();
    expect(within(fullCard).getByText("Three.js")).toBeInTheDocument();
    expect(within(fullCard).getByText("+1")).toBeInTheDocument();

    // Liên kết GitHub + Demo có nhãn mô tả (Req 8.2/8.8).
    expect(
      within(fullCard).getByRole("link", {
        name: /source code on github/i,
      }),
    ).toHaveAttribute("href", projectFull.githubUrl as string);
    expect(
      within(fullCard).getByRole("link", { name: /live demo/i }),
    ).toHaveAttribute("href", projectFull.demoUrl as string);

    // Ảnh thực có nhãn "preview" (không phải giữ chỗ).
    const fullImage = within(fullCard).getByRole("img");
    expect(fullImage).toHaveAttribute("data-placeholder", "false");
    expect(fullImage).toHaveStyle({
      backgroundImage: `url("${projectFull.thumbnail}")`,
    });
  });

  it("uses a placeholder image and hides links when a project has no images/urls (Req 8.2)", () => {
    render(<ProjectCarousel projects={projects} reducedMotion={false} />);

    const placeholderCard = getCardByTitle("Project Three");
    const image = within(placeholderCard).getByRole("img");
    expect(image).toHaveAttribute("data-placeholder", "true");
    expect(image).toHaveAccessibleName(/no preview image/i);

    // Không có liên kết nào khi cả hai URL là null.
    expect(within(placeholderCard).queryAllByRole("link")).toHaveLength(0);

    // Dự án ẩn nút GitHub khi githubUrl null nhưng vẫn hiển thị Demo.
    const noGithubCard = getCardByTitle("Project Two");
    const links = within(noGithubCard).getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAccessibleName(/live demo/i);
  });

  it("shows the empty state when there are no projects (Req 8.12 boundary)", () => {
    render(<ProjectCarousel projects={[]} reducedMotion={false} />);

    expect(screen.getByTestId("project-carousel-empty")).toHaveTextContent(
      /no projects to display/i,
    );
    expect(screen.queryByTestId("project-carousel")).toBeNull();
    expect(screen.queryAllByTestId("project-carousel-card")).toHaveLength(0);
  });
});

describe("ProjectCarousel scale/opacity bands (Req 8.3)", () => {
  it("scales the center card 1.1–1.3x and larger than the side cards", () => {
    render(<ProjectCarousel projects={projects} reducedMotion={false} />);

    const center = getCenterCard();
    const centerScale = parseScale(center.style.transform);
    expect(centerScale).toBeGreaterThanOrEqual(1.1);
    expect(centerScale).toBeLessThanOrEqual(1.3);

    const sideCards = getCards().filter(
      (card) => card.getAttribute("data-center") !== "true",
    );
    expect(sideCards.length).toBeGreaterThan(0);
    for (const side of sideCards) {
      const sideScale = parseScale(side.style.transform);
      expect(sideScale).toBeLessThan(centerScale);
    }
  });

  it("keeps side card opacity within 0.4–0.6 and the center fully opaque", () => {
    render(<ProjectCarousel projects={projects} reducedMotion={false} />);

    const center = getCenterCard();
    expect(parseFloat(center.style.opacity)).toBeCloseTo(1, 5);

    const sideCards = getCards().filter(
      (card) => card.getAttribute("data-center") !== "true",
    );
    for (const side of sideCards) {
      const opacity = parseFloat(side.style.opacity);
      expect(opacity).toBeGreaterThanOrEqual(0.4);
      expect(opacity).toBeLessThanOrEqual(0.6);
    }
  });
});

describe("ProjectCarousel hover tilt/zoom/timing (Req 8.4)", () => {
  it("tilts the card toward the pointer with a max of 15 degrees", () => {
    render(<ProjectCarousel projects={projects} reducedMotion={false} />);

    const tilt = getTiltElement(getCenterCard());
    // jsdom trả rect 0; mock kích thước để toán tilt tất định.
    tilt.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        width: 100,
        height: 100,
        right: 100,
        bottom: 100,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;

    // Con trỏ vượt xa mép phải/đáy → tilt phải bị kẹp ở 15°.
    fireEvent.pointerMove(tilt, { clientX: 1000, clientY: 1000 });

    const rotateX = parseRotate(tilt.style.transform, "X");
    const rotateY = parseRotate(tilt.style.transform, "Y");
    expect(Math.abs(rotateX)).toBeLessThanOrEqual(15);
    expect(Math.abs(rotateY)).toBeLessThanOrEqual(15);
    // Bị kẹp đúng ở biên 15°.
    expect(Math.abs(rotateY)).toBeCloseTo(15, 5);
  });

  it("glows the border and zooms the image up to 1.1x on hover", async () => {
    const user = userEvent.setup();
    render(<ProjectCarousel projects={projects} reducedMotion={false} />);

    const center = getCenterCard();
    const tilt = getTiltElement(center);
    const image = within(center).getByRole("img");

    // Trước hover: không phát sáng, ảnh không phóng.
    expect(image).toHaveStyle({ transform: "scale(1)" });
    expect(tilt.style.boxShadow).toBe("none");

    await user.hover(tilt);

    // Sau hover: ảnh phóng ≤ 1.1× và viền phát sáng.
    expect(parseScale(image.style.transform)).toBeCloseTo(1.1, 5);
    expect(tilt.style.boxShadow).not.toBe("none");
    expect(tilt.style.borderColor || tilt.style.border).toContain("34, 211, 238");
  });

  it("completes hover transitions within 100–300ms", () => {
    render(<ProjectCarousel projects={projects} reducedMotion={false} />);

    const tilt = getTiltElement(getCenterCard());
    const ms = parseTransitionMs(tilt.style.transition, "transform");
    expect(ms).toBeGreaterThanOrEqual(100);
    expect(ms).toBeLessThanOrEqual(300);
  });
});

describe("ProjectCarousel navigation timing (Req 8.5)", () => {
  it("moves the center card on next/prev and updates the counter", async () => {
    const user = userEvent.setup();
    render(<ProjectCarousel projects={projects} reducedMotion={false} />);

    // Ban đầu thẻ đầu tiên ở trung tâm.
    expect(within(getCenterCard()).getByRole("heading")).toHaveTextContent(
      "Project One",
    );
    expect(getCounter()).toHaveTextContent("1 / 3");

    await user.click(screen.getByRole("button", { name: /next project/i }));

    expect(within(getCenterCard()).getByRole("heading")).toHaveTextContent(
      "Project Two",
    );
    expect(getCounter()).toHaveTextContent("2 / 3");

    await user.click(screen.getByRole("button", { name: /previous project/i }));

    expect(within(getCenterCard()).getByRole("heading")).toHaveTextContent(
      "Project One",
    );
    expect(getCounter()).toHaveTextContent("1 / 3");
  });

  it("completes the center-card transition within 300–600ms", () => {
    render(<ProjectCarousel projects={projects} reducedMotion={false} />);

    const ms = parseTransitionMs(getCenterCard().style.transition, "transform");
    expect(ms).toBeGreaterThanOrEqual(300);
    expect(ms).toBeLessThanOrEqual(600);
  });
});

describe("ProjectCarousel reduced motion (Req 8.9)", () => {
  it("disables tilt and image zoom and limits transitions to <= 100ms", async () => {
    const user = userEvent.setup();
    render(<ProjectCarousel projects={projects} reducedMotion={true} />);

    const center = getCenterCard();
    const tilt = getTiltElement(center);
    const image = within(center).getByRole("img");

    // Nghiêng bị tắt: transform tilt là "none".
    expect(tilt.style.transform).toBe("none");

    // Hover không phóng ảnh và không phát sáng khi giảm chuyển động.
    await user.hover(tilt);
    expect(image).toHaveStyle({ transform: "scale(1)" });
    expect(tilt.style.boxShadow).toBe("none");

    // Chuyển thẻ và hiệu ứng hover đều ≤ 100ms.
    expect(
      parseTransitionMs(center.style.transition, "transform"),
    ).toBeLessThanOrEqual(100);
    expect(
      parseTransitionMs(tilt.style.transition, "transform"),
    ).toBeLessThanOrEqual(100);
  });

  it("still navigates between projects under reduced motion", async () => {
    const user = userEvent.setup();
    render(<ProjectCarousel projects={projects} reducedMotion={true} />);

    expect(getCounter()).toHaveTextContent("1 / 3");
    await user.click(screen.getByRole("button", { name: /next project/i }));
    expect(getCounter()).toHaveTextContent("2 / 3");
  });
});

describe("ProjectCarousel responsive layout <= 768px (Req 8.10)", () => {
  it("shows only the center card and hides the others", () => {
    mockMatchMedia(true);
    render(<ProjectCarousel projects={projects} reducedMotion={false} />);

    const center = getCenterCard();
    // Thẻ trung tâm hiển thị, không bị ẩn khỏi cây tiếp cận.
    expect(center).not.toHaveAttribute("aria-hidden", "true");
    expect(center.style.visibility).toBe("visible");

    const others = getCards().filter(
      (card) => card.getAttribute("data-center") !== "true",
    );
    expect(others.length).toBeGreaterThan(0);
    for (const card of others) {
      expect(card).toHaveAttribute("aria-hidden", "true");
      expect(card.style.visibility).toBe("hidden");
    }
  });

  it("keeps title font-size >= 16px and button touch targets >= 44x44px", () => {
    mockMatchMedia(true);
    render(<ProjectCarousel projects={projects} reducedMotion={false} />);

    // Tiêu đề ≥ 16px (1.125rem = 18px).
    const heading = within(getCenterCard()).getByRole("heading");
    expect(heading).toHaveStyle({ fontSize: "1.125rem" });

    // Nút điều hướng có vùng chạm ≥ 44×44px.
    const nextBtn = screen.getByRole("button", { name: /next project/i });
    expect(nextBtn).toHaveStyle({ width: "44px", height: "44px" });
    const prevBtn = screen.getByRole("button", { name: /previous project/i });
    expect(prevBtn).toHaveStyle({ width: "44px", height: "44px" });

    // Liên kết của thẻ cũng có vùng chạm tối thiểu 44×44px.
    const link = within(getCenterCard()).getAllByRole("link")[0];
    expect(link).toHaveStyle({ minWidth: "44px", minHeight: "44px" });
  });
});
