/**
 * Render and edge-case tests cho `ExperienceTimeline`.
 *
 * Component là lớp trình bày DOM/CSS mỏng tiêu thụ các hàm thuần trong
 * `lib/three/timeline.ts`. Các bài test dưới đây tập trung vào hành vi render
 * và các trường hợp biên mà người dùng quan sát được:
 *
 * - Cấu trúc đường dọc tô sáng + một thẻ kính cho mỗi mốc (Req 9.3).
 * - Reduced_Motion_Mode: mọi thẻ ở trạng thái cuối với đường tô sáng 100%
 *   (Req 9.8).
 * - Nhãn "Present" cho mốc có `endDate` là `null` (Req 9.9).
 * - Danh sách rỗng → thông báo, KHÔNG render đường dọc hay thẻ nào (Req 9.11).
 *
 * IntersectionObserver không tồn tại trong jsdom; component xử lý bằng cách
 * hiển thị thẻ ngay (trạng thái cuối), nên các bài test này tất định.
 *
 * _Requirements: 9.3, 9.8, 9.9, 9.11_
 */

import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";

import type { Experience } from "@/types/experience";
import { ExperienceTimeline } from "./ExperienceTimeline";

afterEach(() => {
  cleanup();
});

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

describe("ExperienceTimeline render and edge cases", () => {
  it("renders the highlight line and one glass card per experience (Req 9.3)", () => {
    render(
      <ExperienceTimeline experiences={experiences} reducedMotion={false} />,
    );

    // Đường dọc tô sáng theo tiến độ cuộn.
    expect(screen.getByTestId("timeline-progress-line")).toBeInTheDocument();

    // Một thẻ kính cho mỗi mốc.
    const cards = screen.getAllByTestId("timeline-card");
    expect(cards).toHaveLength(experiences.length);

    // Một mục danh sách cho mỗi mốc.
    expect(screen.getAllByTestId("timeline-item")).toHaveLength(
      experiences.length,
    );

    // Nội dung của từng mốc được render trong thẻ tương ứng.
    expect(screen.getByText("Frontend Engineer")).toBeInTheDocument();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("Senior Engineer")).toBeInTheDocument();
    expect(screen.getByText("Globex")).toBeInTheDocument();
  });

  it("assigns deterministic slide direction by position index (Req 9.3/9.5)", () => {
    render(
      <ExperienceTimeline experiences={experiences} reducedMotion={false} />,
    );

    const cards = screen.getAllByTestId("timeline-card");
    // Chỉ số chẵn trượt trái, lẻ trượt phải.
    expect(cards[0]).toHaveAttribute("data-slide-direction", "left");
    expect(cards[1]).toHaveAttribute("data-slide-direction", "right");
  });

  it("shows every card at final state with the line at 100% under reduced motion (Req 9.8)", () => {
    render(
      <ExperienceTimeline experiences={experiences} reducedMotion={true} />,
    );

    // Đường tô sáng đầy 100%.
    const line = screen.getByTestId("timeline-progress-line");
    expect(line).toHaveStyle({ height: "100%" });

    // Mọi thẻ ở trạng thái cuối: hiển thị đầy đủ, không lệch.
    const cards = screen.getAllByTestId("timeline-card");
    expect(cards).toHaveLength(experiences.length);
    for (const card of cards) {
      expect(card).toHaveStyle({ opacity: "1" });
      expect(card).toHaveStyle({ transform: "translateX(0)" });
    }
  });

  it('renders "Present" for an ongoing experience whose endDate is null (Req 9.9)', () => {
    render(
      <ExperienceTimeline
        experiences={[currentExperience]}
        reducedMotion={false}
      />,
    );

    const dateRange = screen.getByTestId("timeline-date-range");
    // Nhãn kết thúc là "Present" khi đang làm việc.
    expect(dateRange).toHaveTextContent("Present");
    expect(dateRange).toHaveTextContent("Jul 2021");
  });

  it("does not render the Present label for a finished experience (Req 9.9)", () => {
    render(
      <ExperienceTimeline
        experiences={[finishedExperience]}
        reducedMotion={false}
      />,
    );

    const dateRange = screen.getByTestId("timeline-date-range");
    expect(dateRange).not.toHaveTextContent("Present");
    expect(dateRange).toHaveTextContent("Mar 2020");
    expect(dateRange).toHaveTextContent("Jun 2021");
  });

  it("shows an empty-state message and renders no line or cards when the list is empty (Req 9.11)", () => {
    render(<ExperienceTimeline experiences={[]} reducedMotion={false} />);

    // Thông báo trạng thái rỗng hiển thị.
    const message = screen.getByTestId("experience-empty-message");
    expect(message).toBeInTheDocument();
    expect(message).toHaveTextContent(/no work experience/i);

    // Không render đường dọc hay thẻ nào.
    expect(screen.queryByTestId("timeline-progress-line")).toBeNull();
    expect(screen.queryAllByTestId("timeline-card")).toHaveLength(0);
    expect(screen.queryAllByTestId("timeline-item")).toHaveLength(0);

    // Container đánh dấu trạng thái rỗng.
    expect(screen.getByTestId("experience-timeline")).toHaveAttribute(
      "data-empty",
      "true",
    );
  });

  it("marks the current experience with a Current badge (Req 9.9)", () => {
    render(
      <ExperienceTimeline experiences={experiences} reducedMotion={false} />,
    );

    // Chỉ mốc đang diễn ra mới có nhãn "Current".
    const badges = screen.getAllByText("Current");
    expect(badges).toHaveLength(1);

    // Nhãn nằm trong thẻ của mốc đang diễn ra (Globex / Senior Engineer).
    const currentCard = screen.getByText("Senior Engineer").closest(
      '[data-testid="timeline-card"]',
    ) as HTMLElement;
    expect(currentCard).not.toBeNull();
    expect(within(currentCard).getByText("Current")).toBeInTheDocument();
  });
});
