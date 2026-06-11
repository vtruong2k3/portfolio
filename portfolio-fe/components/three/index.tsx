"use client";

/**
 * Wrapper động cho các cảnh R3F — luôn `ssr: false` (Req 9.3, 10.1).
 *
 * Import các wrapper này thay vì component thô để tránh lỗi SSR.
 *
 * Next.js 16: `next/dynamic({ ssr: false })` khi render phía server sẽ ném
 * `BailoutToCSRError` (mã lỗi nội bộ E394 — xem
 * `next/dist/shared/lib/lazy-dynamic/dynamic-bailout-to-csr`). Vì vậy một
 * component `dynamic(..., { ssr: false })` CHỈ hợp lệ khi được tiêu thụ bên
 * trong một Client Component. `HeroSection` đã khai báo `"use client"`, và
 * module này cũng khai báo `"use client"` vì nó dùng các hook React
 * (`useEffect`/`useState`, `usePrefersReducedMotion`) cho hiệu ứng fade-in.
 *
 * _Requirements: 10.1, 11.1, 11.2, 11.3_
 */

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/**
 * Thời lượng hiệu ứng fade-in (ms) khi cảnh 3D hoàn tất nạp (Req 11.2).
 * Đặt tập trung ở đây để dễ cấu hình; được áp qua `transitionDuration`.
 */
export const FADE_DURATION_MS = 600;

/**
 * Wrapper `next/dynamic` cho `HeroScene` với `ssr: false`.
 *
 * `loading` là một chỉ báo tải chiếm trọn vùng nền Hero (`absolute inset-0`),
 * đánh dấu `aria-hidden` vì mang tính trang trí (Req 11.1).
 */
export const HeroSceneDynamic = dynamic(
  () => import("./HeroScene").then((m) => m.HeroScene),
  {
    ssr: false,
    loading: () => (
      <div
        className="absolute inset-0 flex items-center justify-center"
        aria-hidden="true"
      >
        <div className="w-16 h-16 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    ),
  }
);

/**
 * `HeroSceneWithFadeIn` — bọc `HeroSceneDynamic` và áp hiệu ứng làm rõ dần
 * (fade-in) sau khi mount phía client (Req 11.2).
 *
 * - Sau mount, chuyển opacity từ 0 → 1 qua `transition-opacity` trong thời
 *   lượng `FADE_DURATION_MS`. Việc bật `mounted` trong `requestAnimationFrame`
 *   bảo đảm trình duyệt vẽ trạng thái `opacity-0` trước rồi mới nội suy.
 * - Khi `prefers-reduced-motion` bật, hiển thị ngay ở opacity đầy đủ, không áp
 *   transition (Req 11.3).
 *
 * Đây là Client Component (phụ thuộc `usePrefersReducedMotion` + hook React).
 */
export function HeroSceneWithFadeIn() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Bật fade ở khung hình kế tiếp để trình duyệt vẽ opacity-0 trước.
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Reduced motion (Req 11.3): hiển thị ngay, không transition, không fade.
  if (prefersReducedMotion) {
    return (
      <div className="absolute inset-0 opacity-100" aria-hidden="true">
        <HeroSceneDynamic />
      </div>
    );
  }

  // Fade-in (Req 11.2): opacity 0 → 1 qua transition-opacity với thời lượng cấu hình.
  return (
    <div
      className={`absolute inset-0 transition-opacity ease-out ${
        mounted ? "opacity-100" : "opacity-0"
      }`}
      style={{ transitionDuration: `${FADE_DURATION_MS}ms` }}
      aria-hidden="true"
    >
      <HeroSceneDynamic />
    </div>
  );
}

export const SkillsCloudDynamic = dynamic(
  () => import("./SkillsCloud").then((m) => m.SkillsCloud),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[480px] flex items-center justify-center" aria-hidden="true">
        <div className="w-12 h-12 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    ),
  }
);
