/**
 * Logic thuần tính tỉ lệ tương phản màu theo chuẩn WCAG cho vùng nội dung Hero.
 *
 * Các hàm ở đây không phụ thuộc DOM/WebGL để có thể kiểm thử dựa trên thuộc tính
 * (property-based testing). Chúng nhận chuỗi mã màu hex (ví dụ "#ffffff") và trả
 * về tỉ lệ tương phản dùng để xác nhận văn bản Hero đạt chuẩn WCAG AA.
 *
 * Công thức (WCAG 2.x):
 *   1. Parse hex -> sRGB từng kênh trong khoảng [0, 1].
 *   2. Tuyến tính hoá từng kênh:
 *        c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ^ 2.4
 *   3. Độ chói tương đối L = 0.2126*R + 0.7152*G + 0.0722*B.
 *   4. Tỉ lệ tương phản = (L_sáng + 0.05) / (L_tối + 0.05).
 *
 * _Requirements: 9.4_
 */

/** Ngưỡng tương phản tối thiểu theo WCAG AA. */
export const WCAG_AA_NORMAL_TEXT = 4.5;
export const WCAG_AA_LARGE_TEXT = 3;

/**
 * Phân tích một mã màu hex thành ba kênh sRGB trong khoảng [0, 1].
 *
 * Hỗ trợ dạng rút gọn `#rgb` và dạng đầy đủ `#rrggbb` (có hoặc không có `#`).
 * Ném `Error` khi chuỗi không phải mã màu hex hợp lệ.
 */
export function parseHexColor(hex: string): {
  r: number;
  g: number;
  b: number;
} {
  const cleaned = hex.trim().replace(/^#/, "");

  let normalized: string;
  if (/^[0-9a-fA-F]{3}$/.test(cleaned)) {
    // Dạng rút gọn: nhân đôi từng ký tự (#abc -> #aabbcc).
    normalized = cleaned
      .split("")
      .map((ch) => ch + ch)
      .join("");
  } else if (/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    normalized = cleaned;
  } else {
    throw new Error(`Mã màu hex không hợp lệ: "${hex}"`);
  }

  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;

  return { r, g, b };
}

/** Tuyến tính hoá một kênh sRGB (giá trị trong [0, 1]) theo công thức WCAG. */
function linearizeChannel(channel: number): number {
  return channel <= 0.03928
    ? channel / 12.92
    : Math.pow((channel + 0.055) / 1.055, 2.4);
}

/**
 * Độ chói tương đối (relative luminance) của một mã màu hex theo WCAG.
 *
 * Kết quả nằm trong khoảng [0, 1]: 0 là đen tuyền, 1 là trắng tuyền.
 */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = parseHexColor(hex);
  const rl = linearizeChannel(r);
  const gl = linearizeChannel(g);
  const bl = linearizeChannel(b);
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

/**
 * Tỉ lệ tương phản giữa màu chữ (`fg`) và màu nền (`bg`) theo WCAG.
 *
 * Kết quả nằm trong khoảng [1, 21]. Phép tính có tính đối xứng: thứ tự fg/bg
 * không ảnh hưởng tới kết quả (luôn lấy độ chói sáng hơn làm tử số).
 *
 * _Requirements: 9.4_
 */
export function contrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Các token màu vùng nội dung Hero, lấy từ design tokens trong `app/globals.css`.
 *
 * Vùng nội dung Hero nằm trên canvas trong suốt, nên màu nền hiệu dụng là
 * `--background`. Văn bản dùng các token `--foreground`, `--muted`, `--primary`.
 */
export const HERO_COLORS = {
  /** `--background` — nền hiệu dụng phía sau nội dung Hero. */
  background: "#050816",
  /** `--foreground` — tiêu đề và văn bản chính. */
  foreground: "#e6edf3",
  /** `--muted` — đoạn mô tả, nhãn phụ. */
  muted: "#8b9ab8",
  /** `--primary` — văn bản gõ động và nhãn trạng thái. */
  primary: "#22d3ee",
} as const;

/** Một cặp màu chữ/nền được dùng trong vùng nội dung Hero để kiểm tra tương phản. */
export interface HeroContrastPair {
  /** Tên mô tả cặp màu (phục vụ thông báo lỗi rõ ràng). */
  name: string;
  /** Mã màu chữ (hex). */
  foreground: string;
  /** Mã màu nền (hex). */
  background: string;
  /** `true` nếu cặp này chỉ dùng cho văn bản lớn (ngưỡng AA 3:1). */
  largeText: boolean;
}

/**
 * Các cặp (màu chữ, màu nền) thực tế được dùng cho văn bản vùng nội dung Hero.
 *
 * Mọi cặp đều phải đạt chuẩn WCAG AA (>= 4.5:1 cho văn bản thường) — xác nhận
 * bởi Property 14 (task 7.4).
 */
export const HERO_CONTRAST_PAIRS: readonly HeroContrastPair[] = [
  {
    name: "foreground trên background (tiêu đề/văn bản chính)",
    foreground: HERO_COLORS.foreground,
    background: HERO_COLORS.background,
    largeText: false,
  },
  {
    name: "muted trên background (đoạn mô tả/nhãn phụ)",
    foreground: HERO_COLORS.muted,
    background: HERO_COLORS.background,
    largeText: false,
  },
  {
    name: "primary trên background (văn bản gõ động/nhãn trạng thái)",
    foreground: HERO_COLORS.primary,
    background: HERO_COLORS.background,
    largeText: false,
  },
] as const;

/**
 * ───────────────────────────────────────────────────────────────────────────
 * Asset_Suite — các cặp màu chữ/nền cụ thể cần xác nhận WCAG AA
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Ngoài vùng Hero, bộ 3D Asset_Suite còn có văn bản trên các thành phần
 * DOM/CSS (Experience_Timeline, các nút liên kết của Project_Carousel,
 * Contact_Terminal) và văn bản nằm phía trên/liền kề Earth_Globe. Các token
 * dưới đây lấy từ design tokens trong `app/globals.css`.
 */
export const ASSET_SUITE_COLORS = {
  /** `--background` — nền nền tảng tối nhất của trang. */
  background: "#050816",
  /** `--surface` — nền hiệu dụng của thẻ kính/nút tương tác. */
  surface: "#080a12",
  /**
   * `--surface-2` — nền kính sáng hơn của thẻ timeline (đặt trên nền
   * lưới/mạch điện ở lớp dưới). Dùng làm nền hiệu dụng bảo thủ cho thẻ
   * timeline: đây là sắc nền sáng nhất mà chữ thẻ có thể nằm lên, nên cho
   * tỉ lệ tương phản thấp nhất (trường hợp xấu nhất) so với chữ sáng.
   */
  surface2: "#0d1120",
  /**
   * Nền hiệu dụng cho văn bản liền kề Earth_Globe: `--background` cộng lớp
   * phát sáng xanh nhẹ của địa cầu. Mô hình hoá bằng một sắc tối ngả xanh
   * sáng hơn `--background` để kiểm tra trường hợp xấu nhất (glow làm nền
   * sáng lên, giảm tương phản với chữ sáng).
   */
  earthGlowBackground: "#0a1626",
  /** `--foreground` — tiêu đề và văn bản chính. */
  foreground: "#e6edf3",
  /** `--muted` — nhãn phụ, khoảng thời gian, văn bản thứ cấp. */
  muted: "#8b9ab8",
  /** `--primary` (cyan) — chữ liên kết/điểm nhấn và dấu nhắc dòng lệnh. */
  primary: "#22d3ee",
} as const;

/**
 * Các cặp (màu chữ, màu nền) thực tế của Asset_Suite cần đạt chuẩn WCAG AA.
 *
 * Phủ ba nhóm sử dụng:
 *   - Thẻ Experience_Timeline trên nền lưới/mạch điện (Req 9.6, 9.10).
 *   - Văn bản tương tác: nút liên kết Project_Carousel, dấu nhắc/ô nhập của
 *     Contact_Terminal (Req 12.5).
 *   - Văn bản phía trên/liền kề Earth_Globe có phát sáng xanh (Req 11.2).
 *
 * Mọi cặp đều phải đạt WCAG AA — xác nhận bởi Property 21 (task 7.2).
 *
 * _Requirements: 9.6, 9.10, 11.2, 12.5_
 */
export const ASSET_SUITE_CONTRAST_PAIRS: readonly HeroContrastPair[] = [
  // ── Thẻ Experience_Timeline (nền hiệu dụng = surface-2 trên nền lưới) ──
  {
    name: "timeline: foreground trên surface-2 (tiêu đề/mô tả thẻ)",
    foreground: ASSET_SUITE_COLORS.foreground,
    background: ASSET_SUITE_COLORS.surface2,
    largeText: false,
  },
  {
    name: "timeline: muted trên surface-2 (khoảng thời gian/nhãn phụ)",
    foreground: ASSET_SUITE_COLORS.muted,
    background: ASSET_SUITE_COLORS.surface2,
    largeText: false,
  },
  {
    name: "timeline: primary trên surface-2 (chức danh/điểm nhấn)",
    foreground: ASSET_SUITE_COLORS.primary,
    background: ASSET_SUITE_COLORS.surface2,
    largeText: false,
  },
  // ── Văn bản tương tác (nền hiệu dụng = surface) ──
  {
    name: "interactive: primary trên surface (nút liên kết GitHub/Demo, dấu nhắc dòng lệnh)",
    foreground: ASSET_SUITE_COLORS.primary,
    background: ASSET_SUITE_COLORS.surface,
    largeText: false,
  },
  {
    name: "interactive: foreground trên surface (chữ ô nhập/nhãn nút)",
    foreground: ASSET_SUITE_COLORS.foreground,
    background: ASSET_SUITE_COLORS.surface,
    largeText: false,
  },
  {
    name: "interactive: muted trên surface (nhãn phụ/placeholder)",
    foreground: ASSET_SUITE_COLORS.muted,
    background: ASSET_SUITE_COLORS.surface,
    largeText: false,
  },
  // ── Văn bản liền kề Earth_Globe (nền hiệu dụng = background + glow xanh) ──
  {
    name: "earth: foreground trên nền có glow xanh (tiêu đề/văn bản Contact/Footer)",
    foreground: ASSET_SUITE_COLORS.foreground,
    background: ASSET_SUITE_COLORS.earthGlowBackground,
    largeText: false,
  },
  {
    name: "earth: muted trên nền có glow xanh (văn bản thứ cấp Contact/Footer)",
    foreground: ASSET_SUITE_COLORS.muted,
    background: ASSET_SUITE_COLORS.earthGlowBackground,
    largeText: false,
  },
] as const;
