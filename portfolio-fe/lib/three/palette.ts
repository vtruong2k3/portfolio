/**
 * Bảng màu chủ đạo của cảnh 3D Hero.
 *
 * Gồm đúng 4 mã màu được dùng xuyên suốt vật liệu, ánh sáng, hiệu ứng hậu kỳ
 * và Fallback_Visual để giữ nhận diện thị giác nhất quán.
 *
 * _Requirements: 1.3_
 */
export const PALETTE = {
  cyan: "#22d3ee",
  violet: "#a855f7",
  blue: "#3b82f6",
  pink: "#ec4899",
} as const;

/** Một mã màu hợp lệ thuộc bảng màu chủ đạo. */
export type PaletteColor = (typeof PALETTE)[keyof typeof PALETTE];
