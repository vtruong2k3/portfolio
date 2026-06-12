"use client";

/**
 * Experience_Timeline — Dòng thời gian kinh nghiệm dựng bằng DOM/CSS + cuộn trang.
 *
 * Component này là **lớp trình bày mỏng** tiêu thụ toàn bộ toán học tất định từ
 * `lib/three/timeline.ts` (`sortExperiences`, `normalizeScrollProgress`,
 * `slideDirection`, `formatDateRange`). Chiều sâu/hiệu ứng được tạo bằng DOM/CSS
 * (không dùng WebGL) để giữ nội dung văn bản đạt WCAG AA và có thể đọc bằng trình
 * đọc màn hình.
 *
 * Hành vi:
 * - Sắp xếp các mốc tăng dần theo `order`, tie-break giảm dần theo `startDate`
 *   qua `sortExperiences` (Req 9.2 — đã được phủ ở component cha; áp dụng tại đây).
 * - Đường dọc kiểu mạch điện + mỗi mốc là một thẻ kính riêng (Req 9.3).
 * - Đường sáng tô đúng tỷ lệ tiến độ cuộn chuẩn hóa `[0, 1]` qua
 *   `normalizeScrollProgress`, lấy vị trí cuộn từ Lenis/native scroll +
 *   IntersectionObserver (Req 9.4, 9.7).
 * - Thẻ trượt vào khi đạt ≥ 30% diện tích trong viewport, thời lượng 300–600ms,
 *   theo `slideDirection` (chỉ số chẵn trượt trái, lẻ trượt phải) (Req 9.5).
 * - Nền lưới/mạch điện đặt dưới các thẻ, độ tương phản văn bản không giảm dưới
 *   WCAG AA (Req 9.6).
 * - `formatDateRange` hiển thị "Present" khi `endDate` là `null` (Req 9.9).
 * - Reduced_Motion_Mode: mọi thẻ ở trạng thái cuối, đường tô sáng 100%, không
 *   hiệu ứng trượt (Req 9.8).
 *
 * _Requirements: 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9_
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Experience } from "@/types/experience";
import {
  formatDateRange,
  normalizeScrollProgress,
  slideDirection,
  sortExperiences,
} from "@/lib/three/timeline";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

export interface ExperienceTimelineProps {
  /** Danh sách mốc kinh nghiệm (đã được tải từ `useExperiences()`). */
  experiences: Experience[];
  /**
   * Bật chế độ giảm chuyển động. Nếu không truyền, component tự đọc tùy chọn hệ
   * điều hành qua `usePrefersReducedMotion`.
   */
  reducedMotion?: boolean;
}

/** Thời lượng trượt thẻ trong [300, 600]ms (Req 9.5). */
const SLIDE_TRANSITION_MS = 500;
/** Tỷ lệ hiển thị tối thiểu để kích hoạt trượt vào (Req 9.5). */
const VISIBILITY_THRESHOLD = 0.3;
/** Khoảng dịch ngang ban đầu khi thẻ chưa hiện (px). */
const SLIDE_OFFSET_PX = 48;

/**
 * Một thẻ kính cho một mốc kinh nghiệm. Quản lý trạng thái hiển thị cục bộ qua
 * IntersectionObserver (≥ 30% diện tích) để trượt vào (Req 9.5). Khi giảm chuyển
 * động, thẻ hiển thị ngay ở trạng thái cuối (Req 9.8).
 */
function TimelineCard({
  experience,
  index,
  reducedMotion,
}: {
  experience: Experience;
  index: number;
  reducedMotion: boolean;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const [visible, setVisible] = useState(false);

  const direction = slideDirection(index);
  const isLeft = direction === "left";
  const isCurrent = experience.endDate === null;

  useEffect(() => {
    // Reduced motion: hiển thị ngay trạng thái cuối, không quan sát giao điểm.
    if (reducedMotion) {
      setVisible(true);
      return;
    }

    const el = ref.current;
    if (!el) return;

    // Môi trường không hỗ trợ IntersectionObserver → hiển thị ngay (an toàn).
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: VISIBILITY_THRESHOLD },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [reducedMotion]);

  // Trạng thái ẩn: lệch sang trái/phải theo slideDirection và mờ; trạng thái
  // cuối: về vị trí gốc, rõ nét. Khi reduced motion, không áp transition.
  const hiddenTransform = isLeft
    ? `translateX(-${SLIDE_OFFSET_PX}px)`
    : `translateX(${SLIDE_OFFSET_PX}px)`;

  const cardStyle: React.CSSProperties = reducedMotion
    ? { transform: "translateX(0)", opacity: 1 }
    : {
        transform: visible ? "translateX(0)" : hiddenTransform,
        opacity: visible ? 1 : 0,
        transition: `transform ${SLIDE_TRANSITION_MS}ms ease, opacity ${SLIDE_TRANSITION_MS}ms ease`,
        willChange: "transform, opacity",
      };

  return (
    <li ref={ref} data-testid="timeline-item">
      <div
        className={`flex items-start gap-8 md:gap-0 ${
          isLeft ? "md:flex-row" : "md:flex-row-reverse"
        }`}
      >
        {/* Thẻ kính — chiếm 5/12 trên desktop */}
        <div className={`pl-12 md:pl-0 md:w-5/12 ${isLeft ? "md:pr-8" : "md:pl-8"}`}>
          <div
            data-testid="timeline-card"
            data-slide-direction={direction}
            data-visible={visible ? "true" : "false"}
            className={`glass rounded-2xl p-6 group ${
              isCurrent ? "border-primary/30" : ""
            }`}
            style={cardStyle}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h3 className="font-bold text-foreground group-hover:text-primary transition-colors duration-200">
                  {experience.position}
                </h3>
                <p className="text-primary text-sm font-semibold mt-0.5">
                  {experience.company}
                </p>
              </div>
              {isCurrent && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/15 border border-primary/30 text-primary whitespace-nowrap shrink-0">
                  Current
                </span>
              )}
            </div>

            {/* Khoảng thời gian — "Present" khi đang làm việc (Req 9.9) */}
            <div className="flex items-center gap-1.5 text-xs text-muted mb-3 font-mono">
              <svg
                className="w-3.5 h-3.5 text-primary shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span data-testid="timeline-date-range">
                {formatDateRange(experience)}
              </span>
            </div>

            {/* Mô tả */}
            <p className="text-muted text-sm leading-relaxed">
              {experience.description}
            </p>
          </div>
        </div>

        {/* Nút mạch điện trên đường dọc — chỉ desktop */}
        <div className="hidden md:flex md:w-2/12 justify-center items-start pt-6">
          <div
            className={`w-4 h-4 rounded-full border-2 transition-all duration-300 z-10 relative ${
              isCurrent
                ? "bg-primary border-primary glow-cyan"
                : "bg-surface border-primary/60 group-hover:border-primary"
            }`}
            aria-hidden="true"
          />
        </div>

        {/* Khoảng đệm cho bên đối diện */}
        <div className="hidden md:block md:w-5/12" />
      </div>
    </li>
  );
}

export function ExperienceTimeline({
  experiences,
  reducedMotion,
}: ExperienceTimelineProps) {
  const prefersReduced = usePrefersReducedMotion();
  const isReduced = reducedMotion ?? prefersReduced;

  // Sắp xếp tất định theo order rồi startDate (Req 9.2).
  const ordered = useMemo(() => sortExperiences(experiences), [experiences]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  // Danh sách rỗng → thông báo, KHÔNG render đường dọc hay thẻ nào (Req 9.11).
  const isEmpty = ordered.length === 0;

  // Tiến độ cuộn chuẩn hóa [0, 1] → chiều cao đường sáng (Req 9.4, 9.7).
  useEffect(() => {
    // Danh sách rỗng: không có đường/thẻ để theo dõi (Req 9.11).
    if (isEmpty) return;

    // Reduced motion: đường sáng 100%, không gắn listener (Req 9.8).
    if (isReduced) {
      setProgress(1);
      return;
    }

    if (typeof window === "undefined") return;

    let frame = 0;

    const update = () => {
      frame = 0;
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const next = normalizeScrollProgress({
        scrollTop: window.scrollY,
        // offset tuyệt đối của container so với đầu tài liệu.
        sectionTop: rect.top + window.scrollY,
        sectionHeight: rect.height,
        viewportHeight: window.innerHeight,
      });
      setProgress(next);
    };

    // Throttle qua requestAnimationFrame để tránh tính lại quá dày.
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [isReduced, isEmpty]);

  // Danh sách rỗng: chỉ hiển thị thông báo, không đường dọc/lưới/thẻ (Req 9.11).
  if (isEmpty) {
    return (
      <div
        ref={containerRef}
        className="relative max-w-4xl mx-auto"
        data-testid="experience-timeline"
        data-empty="true"
      >
        <p
          data-testid="experience-empty-message"
          className="text-center text-muted text-sm py-12"
        >
          No work experience to show yet.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative max-w-4xl mx-auto"
      data-testid="experience-timeline"
    >
      {/* Nền lưới/mạch điện — đặt dưới thẻ, độ mờ thấp giữ tương phản WCAG AA (Req 9.6) */}
      <div
        className="absolute inset-0 pointer-events-none -z-10 opacity-[0.06]"
        aria-hidden="true"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--primary) 1px, transparent 1px), linear-gradient(to bottom, var(--primary) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)",
        }}
      />

      {/* Đường dọc nền (dim) kiểu mạch điện */}
      <div
        className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 -translate-x-1/2 rounded-full bg-border-strong/40"
        aria-hidden="true"
      />

      {/* Đường tô sáng theo tiến độ cuộn chuẩn hóa (Req 9.4) */}
      <div
        data-testid="timeline-progress-line"
        className="absolute left-4 md:left-1/2 top-0 w-0.5 -translate-x-1/2 rounded-full timeline-line"
        aria-hidden="true"
        style={{
          height: `${progress * 100}%`,
          transition: isReduced ? "none" : "height 120ms linear",
        }}
      />

      <ol className="flex flex-col gap-10" aria-label="Work experience timeline">
        {ordered.map((experience, index) => (
          <TimelineCard
            key={experience.id ?? index}
            experience={experience}
            index={index}
            reducedMotion={isReduced}
          />
        ))}
      </ol>
    </div>
  );
}

export default ExperienceTimeline;
