"use client";

/**
 * Project_Carousel — Băng chuyền thẻ dự án 3D dựng bằng DOM/CSS 3D.
 *
 * Component này là **lớp trình bày mỏng** tiêu thụ toàn bộ toán học tất định từ
 * `lib/three/carousel.ts` (`computeCardPlacement`, `navigate`, `wrapIndex`,
 * `resolveProjectImage`, `resolveProjectLinkVisibility`). Chiều sâu 3D được tạo
 * bằng CSS `perspective` + `transform-style: preserve-3d` (không dùng WebGL) để
 * giữ nội dung tương tác (liên kết GitHub/Demo) có thể nhận tiêu điểm bàn phím và
 * có tên truy cập (accessible name) rõ ràng.
 *
 * Hành vi:
 * - Thẻ trung tâm phóng 1.1–1.3×; thẻ hai bên độ mờ 0.4–0.6 (Req 8.3).
 * - Hover: nghiêng ≤ 15°, phát sáng viền, phóng ảnh ≤ 1.1×, đổ bóng cyan/violet,
 *   hoàn tất trong 100–300ms (Req 8.4).
 * - Điều hướng next/prev chuyển thẻ trung tâm trong 300–600ms (Req 8.5, 8.6).
 * - Ẩn nút GitHub/Demo khi URL `null` (Req 8.7); liên kết là `<a>` focus được,
 *   có nhãn mô tả và chỉ báo tiêu điểm rõ ràng (Req 8.8).
 * - Reduced_Motion_Mode: tắt nghiêng/phóng ảnh, chỉ giữ chuyển thẻ ≤ 100ms (Req 8.9).
 * - Viewport ≤ 768px: một thẻ trung tâm, tiêu đề ≥ 16px, vùng chạm nút ≥ 44×44px (Req 8.10).
 * - Thiếu ảnh → ảnh giữ chỗ qua `resolveProjectImage` (Req 8.13).
 *
 * _Requirements: 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10, 8.13_
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Project } from "@/types/project";
import {
  computeCardPlacement,
  navigate as navigateCarousel,
  resolveProjectImage,
  resolveProjectLinkVisibility,
  wrapIndex,
  type CarouselDirection,
  type CarouselState,
} from "@/lib/three/carousel";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

export interface ProjectCarouselProps {
  /** Danh sách dự án để hiển thị (đã được tải từ `useProjects()`). */
  projects: Project[];
  /**
   * Bật chế độ giảm chuyển động. Nếu không truyền, component tự đọc tùy chọn hệ
   * điều hành qua `usePrefersReducedMotion`.
   */
  reducedMotion?: boolean;
}

/** Góc nghiêng tối đa khi hover (Req 8.4). */
const MAX_TILT_DEG = 15;
/** Hệ số phóng ảnh tối đa khi hover (Req 8.4). */
const IMAGE_HOVER_ZOOM = 1.1;
/** Thời lượng hiệu ứng hover trong [100, 300]ms (Req 8.4). */
const HOVER_TRANSITION_MS = 200;
/** Thời lượng chuyển thẻ trung tâm trong [300, 600]ms (Req 8.5). */
const NAV_TRANSITION_MS = 450;
/** Thời lượng tối đa khi giảm chuyển động (Req 8.9). */
const REDUCED_TRANSITION_MS = 100;
/** Số khe (slot) hiển thị mỗi bên thẻ trung tâm trên desktop. */
const VISIBLE_SLOTS = 2;
/** Khoảng dịch ngang giữa hai thẻ liền kề (px). */
const SLOT_SPACING_PX = 300;
/** Độ lùi chiều sâu mỗi khe (px). */
const SLOT_DEPTH_PX = 220;
/** Góc xoay Y mỗi khe để tạo chiều sâu (deg). */
const SLOT_ROTATE_DEG = 32;

/** Tilt theo con trỏ cho một thẻ. */
interface Tilt {
  rotateX: number;
  rotateY: number;
}

const NO_TILT: Tilt = { rotateX: 0, rotateY: 0 };

/**
 * Một Project_Card trong băng chuyền. Tách riêng để quản lý trạng thái hover/tilt
 * cục bộ mà không re-render toàn bộ băng chuyền.
 */
function ProjectCard({
  project,
  isCenter,
  scale,
  opacity,
  translateX,
  translateZ,
  rotateY,
  zIndex,
  reducedMotion,
  hidden,
}: {
  project: Project;
  isCenter: boolean;
  scale: number;
  opacity: number;
  translateX: number;
  translateZ: number;
  rotateY: number;
  zIndex: number;
  reducedMotion: boolean;
  hidden: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const [tilt, setTilt] = useState<Tilt>(NO_TILT);
  const tiltRef = useRef<HTMLDivElement>(null);

  const links = resolveProjectLinkVisibility(project);
  const image = resolveProjectImage(project);

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (reducedMotion) return;
      const el = tiltRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      // Vị trí con trỏ chuẩn hóa về [-0.5, 0.5] trong khung thẻ.
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;
      const clamp = (v: number) =>
        Math.max(-MAX_TILT_DEG, Math.min(MAX_TILT_DEG, v));
      setTilt({
        // Nghiêng theo hướng con trỏ, giới hạn ≤ 15° (Req 8.4).
        rotateX: clamp(-py * 2 * MAX_TILT_DEG),
        rotateY: clamp(px * 2 * MAX_TILT_DEG),
      });
    },
    [reducedMotion],
  );

  const resetHover = useCallback(() => {
    setHovered(false);
    setTilt(NO_TILT);
  }, []);

  // Transform của khe (slot) — chuyển động điều hướng next/prev (Req 8.5).
  const slotTransform = `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`;
  const slotTransitionMs = reducedMotion ? REDUCED_TRANSITION_MS : NAV_TRANSITION_MS;

  // Transform tilt theo con trỏ (Req 8.4) — tắt khi giảm chuyển động (Req 8.9).
  const tiltTransform = reducedMotion
    ? "none"
    : `perspective(900px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg)`;
  const hoverTransitionMs = reducedMotion
    ? REDUCED_TRANSITION_MS
    : HOVER_TRANSITION_MS;

  const showGlow = hovered && !reducedMotion;

  return (
    <div
      className="project-carousel-card absolute left-1/2 top-1/2"
      data-center={isCenter ? "true" : "false"}
      data-testid="project-carousel-card"
      aria-hidden={hidden ? "true" : undefined}
      style={{
        width: "min(340px, 80vw)",
        marginLeft: "min(-170px, -40vw)",
        marginTop: "-230px",
        transform: slotTransform,
        opacity,
        zIndex,
        transition: `transform ${slotTransitionMs}ms ease, opacity ${slotTransitionMs}ms ease`,
        transformStyle: "preserve-3d",
        pointerEvents: hidden ? "none" : "auto",
        visibility: hidden ? "hidden" : "visible",
      }}
    >
      <div
        ref={tiltRef}
        className="rounded-2xl glass overflow-hidden h-full flex flex-col"
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={resetHover}
        onPointerMove={handlePointerMove}
        style={{
          transform: tiltTransform,
          transition: `transform ${hoverTransitionMs}ms ease, box-shadow ${hoverTransitionMs}ms ease, border-color ${hoverTransitionMs}ms ease`,
          border: showGlow
            ? "1px solid rgba(34, 211, 238, 0.6)"
            : "1px solid var(--border)",
          boxShadow: showGlow
            ? "0 0 24px 2px rgba(34, 211, 238, 0.35), 0 0 40px 6px rgba(168, 85, 247, 0.25)"
            : "none",
        }}
      >
        {/* Ảnh dự án / ảnh giữ chỗ (Req 8.13) */}
        <div className="relative h-44 overflow-hidden bg-surface-2">
          <div
            role="img"
            aria-label={
              image.isPlaceholder
                ? `${project.title} (no preview image)`
                : `${project.title} preview`
            }
            data-placeholder={image.isPlaceholder ? "true" : "false"}
            className="absolute inset-0 bg-center bg-cover"
            style={{
              backgroundImage: `url("${image.src}")`,
              transform: showGlow ? `scale(${IMAGE_HOVER_ZOOM})` : "scale(1)",
              transition: `transform ${hoverTransitionMs}ms ease`,
            }}
          />
          {project.featured && (
            <span className="absolute top-3 right-3 text-xs font-bold px-3 py-1.5 rounded-full bg-background/50 backdrop-blur-md border border-white/20 text-foreground shadow-lg">
              ★ Featured
            </span>
          )}
        </div>

        {/* Nội dung */}
        <div className="flex flex-col flex-1 p-6 gap-4">
          <div>
            {/* Tiêu đề ≥ 16px (Req 8.10) */}
            <h3
              className="font-bold text-foreground"
              style={{ fontSize: "1.125rem" }}
            >
              {project.title}
            </h3>
            <p className="text-muted text-sm leading-relaxed mt-2 line-clamp-3">
              {project.description}
            </p>
          </div>

          {/* Tech stack */}
          {project.techStack.length > 0 && (
            <div className="flex flex-wrap gap-1.5" aria-label="Technologies used">
              {project.techStack.slice(0, 4).map((tech) => (
                <span key={tech} className="tech-badge">
                  {tech}
                </span>
              ))}
              {project.techStack.length > 4 && (
                <span className="tech-badge text-muted">
                  +{project.techStack.length - 4}
                </span>
              )}
            </div>
          )}

          {/* Liên kết — focus được, có nhãn mô tả, chỉ báo tiêu điểm rõ ràng (Req 8.7, 8.8) */}
          <div className="flex flex-wrap gap-3 mt-auto pt-4 border-t border-border">
            {links.github && (
              <a
                href={project.githubUrl ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`View ${project.title} source code on GitHub`}
                className="project-carousel-link inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-muted hover:text-primary transition-colors duration-200 rounded-md px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                style={{ minWidth: "44px", minHeight: "44px" }}
              >
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    clipRule="evenodd"
                  />
                </svg>
                GitHub
              </a>
            )}
            {links.demo && (
              <a
                href={project.demoUrl ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open live demo of ${project.title}`}
                className="project-carousel-link inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-muted hover:text-accent transition-colors duration-200 rounded-md px-3 ml-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                style={{ minWidth: "44px", minHeight: "44px" }}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
                Live Demo
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProjectCarousel({
  projects,
  reducedMotion,
}: ProjectCarouselProps) {
  const prefersReduced = usePrefersReducedMotion();
  const isReduced = reducedMotion ?? prefersReduced;

  const total = projects.length;
  const [state, setState] = useState<CarouselState>({
    centerIndex: 0,
    total,
  });
  const [isMobile, setIsMobile] = useState(false);

  // Đồng bộ tổng số thẻ và bao vòng centerIndex khi danh sách dự án đổi.
  useEffect(() => {
    setState((prev) => ({
      total,
      centerIndex: total > 0 ? wrapIndex(prev.centerIndex, total) : 0,
    }));
  }, [total]);

  // Theo dõi điểm ngắt di động ≤ 768px (Req 8.10).
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const mql = window.matchMedia("(max-width: 768px)");
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  const handleNavigate = useCallback((dir: CarouselDirection) => {
    setState((prev) => navigateCarousel(prev, dir));
  }, []);

  // Tính placement cho mỗi thẻ, lọc theo số khe hiển thị (desktop) hoặc chỉ thẻ
  // trung tâm (mobile, Req 8.10).
  const cards = useMemo(() => {
    if (total === 0) return [];
    const maxSlots = isMobile ? 0 : VISIBLE_SLOTS;
    return projects.map((project, index) => {
      const placement = computeCardPlacement(state, index);
      const visible = Math.abs(placement.slotOffset) <= maxSlots;
      return { project, index, placement, visible };
    });
  }, [projects, state, total, isMobile]);

  if (total === 0) {
    // Trạng thái rỗng cơ bản; thông báo chi tiết do ProjectsSection cung cấp (Task 15.2, Req 8.12).
    return (
      <p
        className="text-center text-muted text-sm py-12"
        role="status"
        data-testid="project-carousel-empty"
      >
        No projects to display yet.
      </p>
    );
  }

  return (
    <div className="project-carousel relative w-full" data-testid="project-carousel">
      {/* Sân khấu 3D với perspective + preserve-3d (DOM/CSS 3D) */}
      <div
        className="relative mx-auto"
        style={{
          perspective: "1200px",
          height: "480px",
          maxWidth: "1000px",
        }}
        aria-roledescription="carousel"
        aria-label="Projects carousel"
      >
        <div
          className="absolute inset-0"
          style={{ transformStyle: "preserve-3d" }}
        >
          {cards.map(({ project, index, placement, visible }) => (
            <ProjectCard
              key={project.id ?? index}
              project={project}
              isCenter={placement.slotOffset === 0}
              scale={placement.scale}
              opacity={placement.opacity}
              translateX={placement.slotOffset * SLOT_SPACING_PX}
              translateZ={-Math.abs(placement.slotOffset) * SLOT_DEPTH_PX}
              rotateY={-placement.slotOffset * SLOT_ROTATE_DEG}
              zIndex={total - Math.abs(placement.slotOffset)}
              reducedMotion={isReduced}
              hidden={!visible}
            />
          ))}
        </div>
      </div>

      {/* Điều khiển điều hướng — nút focus được, vùng chạm ≥ 44×44px (Req 8.8, 8.10) */}
      <div className="flex items-center justify-center gap-6 mt-6">
        <button
          type="button"
          onClick={() => handleNavigate("prev")}
          aria-label="Previous project"
          className="inline-flex items-center justify-center rounded-full glass border border-border-strong text-foreground hover:border-primary/50 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          style={{ width: "44px", height: "44px" }}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        <span className="text-sm font-mono text-muted" aria-live="polite">
          {wrapIndex(state.centerIndex, total) + 1} / {total}
        </span>

        <button
          type="button"
          onClick={() => handleNavigate("next")}
          aria-label="Next project"
          className="inline-flex items-center justify-center rounded-full glass border border-border-strong text-foreground hover:border-primary/50 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          style={{ width: "44px", height: "44px" }}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default ProjectCarousel;
