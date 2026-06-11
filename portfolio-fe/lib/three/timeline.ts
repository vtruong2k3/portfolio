/**
 * Hàm thuần cho Experience_Timeline (dòng thời gian kinh nghiệm).
 *
 * Toàn bộ logic tất định của timeline — sắp xếp các mốc kinh nghiệm, chuẩn hóa
 * tiến độ cuộn về `[0, 1]`, xác định hướng trượt của thẻ theo chỉ số vị trí và
 * định dạng khoảng thời gian — được tách thành **hàm thuần, tất định** trong
 * module này để kiểm thử dựa trên thuộc tính (property-based testing) mà không
 * cần DOM, scroll thật hay WebGL context. Component DOM/CSS chỉ là lớp mỏng tiêu
 * thụ các hàm này (IntersectionObserver + Lenis cho cuộn).
 *
 * _Requirements: 9.2, 9.4, 9.5, 9.7, 9.9_
 */

import type { Experience } from "@/types/experience";

/**
 * Đầu vào để tính tiến độ cuộn đã chuẩn hóa của Experience_Timeline.
 *
 * Tất cả giá trị tính bằng pixel theo hệ tọa độ cuộn của tài liệu/viewport.
 */
export interface ScrollInput {
  /** Vị trí cuộn hiện tại (khoảng cách đã cuộn từ đầu tài liệu). */
  scrollTop: number;
  /** Khoảng cách từ đầu tài liệu tới đỉnh của Experience Section. */
  sectionTop: number;
  /** Chiều cao tổng của Experience Section. */
  sectionHeight: number;
  /** Chiều cao vùng nhìn (viewport). */
  viewportHeight: number;
}

/** Hướng trượt vào của một thẻ timeline khi lọt vào vùng nhìn. */
export type SlideDirection = "left" | "right";

/** Nhãn hiển thị cho mốc thời điểm hiện tại khi `endDate` là `null`. */
export const PRESENT_LABEL = "Present";

/** Tên viết tắt của tháng (en-US) dùng để định dạng khoảng thời gian. */
const MONTH_ABBREVIATIONS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/**
 * Phân giải chuỗi ngày thành mốc thời gian (mili-giây) một cách tất định.
 * Trả về `NaN` khi chuỗi không phân giải được.
 */
function parseDateMs(dateStr: string): number {
  return Date.parse(dateStr);
}

/**
 * Định dạng một chuỗi ngày thành nhãn "MMM YYYY" theo lịch UTC (tất định, không
 * phụ thuộc múi giờ hay locale của máy chạy). Khi chuỗi không phân giải được,
 * trả về nguyên chuỗi đầu vào để tránh mất thông tin.
 */
function formatMonthYear(dateStr: string): string {
  const ms = parseDateMs(dateStr);
  if (Number.isNaN(ms)) {
    return dateStr;
  }
  const date = new Date(ms);
  return `${MONTH_ABBREVIATIONS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/**
 * Sắp xếp danh sách `Experience` theo quy tắc tất định của timeline (Req 9.2):
 *
 * - Tăng dần theo `order`.
 * - Khi hai mốc có cùng `order`, sắp **giảm dần** theo `startDate` (mốc gần đây
 *   hơn xếp trước).
 *
 * Hàm thuần: không thay đổi mảng đầu vào (sao chép trước khi sắp xếp) và kết quả
 * luôn là một **hoán vị** của đầu vào với đúng các phần tử ban đầu.
 *
 * _Requirements: 9.2_
 */
export function sortExperiences(experiences: readonly Experience[]): Experience[] {
  return experiences.slice().sort((a, b) => {
    // Tăng dần theo order.
    if (a.order !== b.order) {
      return a.order - b.order;
    }

    // Tie-break: giảm dần theo startDate (mốc mới hơn trước).
    const aMs = parseDateMs(a.startDate);
    const bMs = parseDateMs(b.startDate);

    // Ngày không phân giải được được coi là cũ nhất (đẩy xuống cuối nhóm).
    const aKey = Number.isNaN(aMs) ? -Infinity : aMs;
    const bKey = Number.isNaN(bMs) ? -Infinity : bMs;

    return bKey - aKey;
  });
}

/**
 * Tính tiến độ cuộn đã chuẩn hóa của Experience_Timeline trong khoảng `[0, 1]`
 * (Req 9.4, 9.7). Giá trị này tô sáng đường dọc đúng theo tỷ lệ: `0` ⇔ 0% chiều
 * dài đường, `1` ⇔ 100% chiều dài đường.
 *
 * Quy ước:
 * - Bắt đầu tô sáng khi đỉnh Section chạm đỉnh viewport (`scrollTop === sectionTop`).
 * - Hoàn tất khi đáy Section chạm đáy viewport
 *   (`scrollTop === sectionTop + sectionHeight - viewportHeight`).
 *
 * Tính chất bảo đảm:
 * - Kết quả luôn nằm trong `[0, 1]` (được kẹp).
 * - Không giảm khi `scrollTop` tăng (đơn điệu không giảm).
 * - Bằng `0` khi chưa tới điểm bắt đầu và bằng `1` khi đã qua điểm kết thúc.
 *
 * Đầu vào không hữu hạn được xử lý thận trọng bằng cách trả về `0`. Khi quãng
 * cuộn hữu dụng không dương (Section thấp hơn hoặc bằng viewport), tiến độ là một
 * hàm bậc thang: `0` trước điểm bắt đầu và `1` từ điểm bắt đầu trở đi — vẫn đơn
 * điệu không giảm và nằm trong `[0, 1]`.
 *
 * Hàm thuần, tất định.
 *
 * _Requirements: 9.4, 9.7_
 */
export function normalizeScrollProgress(input: ScrollInput): number {
  const { scrollTop, sectionTop, sectionHeight, viewportHeight } = input;

  // Guard: mọi đầu vào phải hữu hạn.
  if (
    !Number.isFinite(scrollTop) ||
    !Number.isFinite(sectionTop) ||
    !Number.isFinite(sectionHeight) ||
    !Number.isFinite(viewportHeight)
  ) {
    return 0;
  }

  const start = sectionTop;
  const range = sectionHeight - viewportHeight;

  // Section thấp hơn hoặc bằng viewport: hàm bậc thang 0 → 1 tại điểm bắt đầu.
  if (range <= 0) {
    return scrollTop >= start ? 1 : 0;
  }

  const progress = (scrollTop - start) / range;

  // Kẹp về [0, 1]: 0 trước điểm bắt đầu, 1 sau điểm kết thúc.
  if (progress <= 0) {
    return 0;
  }
  if (progress >= 1) {
    return 1;
  }
  return progress;
}

/**
 * Xác định hướng trượt vào của thẻ timeline theo chỉ số vị trí (tính từ 0).
 *
 * Quy tắc tất định (Req 9.5): chỉ số **chẵn** trượt vào từ **trái** (`"left"`),
 * chỉ số **lẻ** trượt vào từ **phải** (`"right"`).
 *
 * Hàm thuần, tất định.
 *
 * _Requirements: 9.5_
 */
export function slideDirection(index: number): SlideDirection {
  return index % 2 === 0 ? "left" : "right";
}

/**
 * Định dạng khoảng thời gian của một mốc kinh nghiệm thành nhãn dạng
 * `"<start> – <end>"`.
 *
 * Theo Req 9.9, khi `endDate` là `null` (đang làm việc), nhãn kết thúc là
 * `"Present"`; ngược lại nhãn kết thúc là thời điểm `endDate` đã được định dạng.
 * Nói cách khác, nhãn kết thúc bằng `"Present"` **khi và chỉ khi** `endDate` là
 * `null`.
 *
 * Các thời điểm được định dạng theo lịch UTC để bảo đảm tính tất định, không phụ
 * thuộc múi giờ hay locale.
 *
 * Hàm thuần, tất định.
 *
 * _Requirements: 9.9_
 */
export function formatDateRange(experience: Experience): string {
  const start = formatMonthYear(experience.startDate);
  const end =
    experience.endDate === null
      ? PRESENT_LABEL
      : formatMonthYear(experience.endDate);
  return `${start} – ${end}`;
}
