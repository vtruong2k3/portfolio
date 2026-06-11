import type { CSSProperties } from "react";

import { PALETTE } from "@/lib/three/palette";

/**
 * Nền tĩnh thay thế cho Hero_Scene khi WebGL không khả dụng hoặc khởi tạo thất bại.
 *
 * Phủ trọn vùng nền Hero bằng một gradient dùng đúng bảng màu chủ đạo
 * (cyan/violet/blue/pink) và không dùng WebGL/canvas. Phần tử được đánh dấu
 * `aria-hidden` và `pointer-events-none` để không chặn khả năng đọc/tương tác
 * của nội dung văn bản và nút bấm trong Hero section.
 *
 * _Requirements: 12.3, 12.4_
 */
export interface HeroFallbackProps {
  /** Lớp tiện ích bổ sung, ghép thêm vào các lớp mặc định. */
  className?: string;
}

/**
 * Gradient nền dùng ĐÚNG 4 mã màu của bảng màu chủ đạo (PALETTE).
 */
const fallbackBackgroundStyle: CSSProperties = {
  backgroundImage: [
    `radial-gradient(circle at 20% 20%, ${PALETTE.cyan} 0%, transparent 55%)`,
    `radial-gradient(circle at 80% 25%, ${PALETTE.violet} 0%, transparent 55%)`,
    `radial-gradient(circle at 75% 80%, ${PALETTE.pink} 0%, transparent 55%)`,
    `linear-gradient(135deg, ${PALETTE.blue} 0%, ${PALETTE.violet} 100%)`,
  ].join(", "),
};

export function HeroFallback({ className }: HeroFallbackProps) {
  const classNames = ["absolute inset-0 pointer-events-none", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      aria-hidden="true"
      className={classNames}
      style={fallbackBackgroundStyle}
    />
  );
}

export default HeroFallback;
