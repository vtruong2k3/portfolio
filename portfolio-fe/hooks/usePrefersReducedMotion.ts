"use client";

/**
 * Hook theo dõi tùy chọn `prefers-reduced-motion` của hệ điều hành/trình duyệt.
 *
 * Hook trả về `true` khi người dùng đã bật chế độ giảm chuyển động
 * (`matchMedia("(prefers-reduced-motion: reduce)")` khớp), ngược lại `false`.
 *
 * Đặc tính:
 * - SSR-safe: trạng thái ban đầu luôn là `false`; mọi truy cập `window`/
 *   `matchMedia` chỉ diễn ra bên trong `useEffect` sau khi component đã gắn
 *   vào DOM phía client, có guard `typeof window !== "undefined"`
 *   (Req 10.2, 10.3).
 * - Phản ứng theo thời gian thực: đăng ký listener `change` của media query để
 *   cập nhật trạng thái ngay khi tùy chọn đổi mà không cần tải lại trang
 *   (Req 9.2).
 * - Dọn dẹp: gỡ listener khi unmount để tránh rò rỉ.
 *
 * _Requirements: 9.2, 10.2, 10.3_
 */

import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Trả về `true` nếu người dùng ưu tiên giảm chuyển động, ngược lại `false`.
 *
 * Trạng thái khởi tạo là `false` để an toàn khi render phía server, sau đó
 * được đồng bộ và cập nhật phản ứng phía client.
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Guard client: không truy cập browser API khi chưa ở môi trường client.
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQueryList = window.matchMedia(QUERY);

    // Đồng bộ trạng thái ban đầu ngay sau khi mount phía client.
    setPrefersReducedMotion(mediaQueryList.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQueryList.addEventListener("change", handleChange);

    // Dọn dẹp listener khi unmount để tránh rò rỉ.
    return () => {
      mediaQueryList.removeEventListener("change", handleChange);
    };
  }, []);

  return prefersReducedMotion;
}

export default usePrefersReducedMotion;
