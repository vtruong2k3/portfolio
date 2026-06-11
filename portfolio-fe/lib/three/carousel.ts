/**
 * Logic thuần cho băng chuyền thẻ dự án 3D (Project_Carousel).
 *
 * Toàn bộ toán học định vị/chỉ số của băng chuyền được tách thành **hàm thuần,
 * tất định** ở đây để kiểm thử bằng property-based testing mà không cần DOM hay
 * WebGL context. Component DOM/CSS 3D (`ProjectCarousel.tsx`) chỉ là lớp mỏng
 * tiêu thụ các hàm này: tính `CardPlacement` cho từng thẻ, điều hướng chỉ số
 * trung tâm, phân giải ảnh và quyết định hiển thị nút liên kết.
 *
 * _Requirements: 8.3, 8.5, 8.6, 8.7, 8.13_
 */

import type { Project } from "@/types/project";

/** Trạng thái băng chuyền: chỉ số thẻ trung tâm hiện tại và tổng số thẻ. */
export interface CarouselState {
  /** Chỉ số thẻ đang ở vị trí trung tâm (đã chuẩn hóa về `[0, total)`). */
  centerIndex: number;
  /** Tổng số thẻ trong băng chuyền. */
  total: number;
}

/** Kết quả định vị/biến đổi hiển thị của một thẻ trong băng chuyền. */
export interface CardPlacement {
  /**
   * Khoảng cách (số thẻ) tới thẻ trung tâm, có dấu, theo đường vòng ngắn nhất.
   * `0` là thẻ trung tâm; dương = bên phải, âm = bên trái.
   */
  slotOffset: number;
  /** Tỉ lệ phóng của thẻ. Thẻ trung tâm lớn nhất, trong `[1.1, 1.3]`. */
  scale: number;
  /** Độ mờ của thẻ trong `[0.4, 1.0]`. Thẻ trung tâm = `1.0`. */
  opacity: number;
  /** Dịch ngang (đơn vị tỉ lệ với `slotOffset`) để bố trí thẻ. */
  translateX: number;
}

/** Hướng điều hướng băng chuyền. */
export type CarouselDirection = "next" | "prev";

/** Kết quả phân giải ảnh hiển thị cho một Project_Card. */
export interface ResolvedProjectImage {
  /** Đường dẫn ảnh được chọn (ảnh thực hoặc ảnh giữ chỗ). */
  src: string;
  /** `true` khi phải dùng ảnh giữ chỗ vì không có ảnh dự án nào. */
  isPlaceholder: boolean;
}

/** Cờ hiển thị các nút liên kết của một Project_Card. */
export interface ProjectLinkVisibility {
  /** Hiển thị nút GitHub khi và chỉ khi `githubUrl != null`. */
  github: boolean;
  /** Hiển thị nút Demo khi và chỉ khi `demoUrl != null`. */
  demo: boolean;
}

/**
 * Hằng số bố trí băng chuyền (Req 8.3).
 *
 * - Thẻ trung tâm: `scale = 1.2` (trong `[1.1, 1.3]`) và là thẻ lớn nhất.
 * - Thẻ hai bên: `scale = 1.0` (luôn nhỏ hơn thẻ trung tâm), `opacity` trong
 *   `[0.4, 0.6]` giảm dần theo khoảng cách tới trung tâm.
 */
export const CAROUSEL_PLACEMENT = {
  /** Tỉ lệ phóng của thẻ trung tâm (trong `[1.1, 1.3]`). */
  centerScale: 1.2,
  /** Tỉ lệ phóng của các thẻ không phải trung tâm. */
  sideScale: 1.0,
  /** Độ mờ của thẻ trung tâm. */
  centerOpacity: 1.0,
  /** Độ mờ tối đa của thẻ hai bên (thẻ liền kề trung tâm). */
  sideOpacityMax: 0.6,
  /** Độ mờ tối thiểu của thẻ hai bên (thẻ xa trung tâm). */
  sideOpacityMin: 0.4,
  /** Khoảng dịch ngang giữa hai thẻ liền kề (đơn vị tỉ lệ). */
  spacing: 1,
} as const;

/** Đường dẫn ảnh giữ chỗ khi một dự án không có ảnh nào (Req 8.13). */
export const PROJECT_IMAGE_PLACEHOLDER = "/images/project-placeholder.svg";

/**
 * Bao vòng (wrap) một chỉ số về khoảng `[0, total)`. Thuần, tất định.
 *
 * Hỗ trợ chỉ số âm và chỉ số vượt quá `total` bằng phép chia lấy dư hai lần để
 * luôn trả về giá trị không âm. Khi `total <= 0` trả về `0` để tránh chia cho 0.
 *
 * _Requirements: 8.6_
 */
export function wrapIndex(i: number, total: number): number {
  if (!Number.isFinite(total) || total <= 0) {
    return 0;
  }
  const t = Math.trunc(total);
  return ((Math.trunc(i) % t) + t) % t;
}

/**
 * Tính khoảng cách có dấu (số thẻ) từ một thẻ tới thẻ trung tâm theo đường vòng
 * ngắn nhất, nằm trong khoảng `(-total/2, total/2]`. Thuần.
 *
 * Ví dụ với `total = 6`, `centerIndex = 0`: thẻ index 5 có `slotOffset = -1`
 * (nằm ngay bên trái) thay vì `+5`, nhờ chọn đường vòng ngắn nhất.
 */
function signedSlotOffset(cardIndex: number, state: CarouselState): number {
  const total = Math.trunc(state.total);
  if (!Number.isFinite(total) || total <= 0) {
    return 0;
  }
  // Khoảng cách thuận chiều trong [0, total).
  const forward = wrapIndex(cardIndex - state.centerIndex, total);
  // Quy về đường vòng ngắn nhất: nếu vượt nửa vòng thì đi ngược lại.
  return forward > total / 2 ? forward - total : forward;
}

/**
 * Tính `CardPlacement` cho một thẻ theo trạng thái băng chuyền hiện tại.
 *
 * - Thẻ trung tâm (`slotOffset === 0`): `scale` trong `[1.1, 1.3]` và là thẻ có
 *   `scale` lớn nhất, `opacity = 1.0`.
 * - Thẻ hai bên: `scale = sideScale` (nhỏ hơn thẻ trung tâm), `opacity` trong
 *   `[0.4, 0.6]` giảm dần theo khoảng cách tới trung tâm (Req 8.3).
 *
 * Thuần, tất định theo `(state, cardIndex)`.
 *
 * _Requirements: 8.3_
 */
export function computeCardPlacement(
  state: CarouselState,
  cardIndex: number,
): CardPlacement {
  const slotOffset = signedSlotOffset(cardIndex, state);
  const distance = Math.abs(slotOffset);

  if (distance === 0) {
    return {
      slotOffset,
      scale: CAROUSEL_PLACEMENT.centerScale,
      opacity: CAROUSEL_PLACEMENT.centerOpacity,
      translateX: 0,
    };
  }

  // Độ mờ giảm dần theo khoảng cách nhưng luôn nằm trong [0.4, 0.6].
  const opacity = Math.min(
    CAROUSEL_PLACEMENT.sideOpacityMax,
    Math.max(
      CAROUSEL_PLACEMENT.sideOpacityMin,
      CAROUSEL_PLACEMENT.sideOpacityMax - (distance - 1) * 0.1,
    ),
  );

  return {
    slotOffset,
    scale: CAROUSEL_PLACEMENT.sideScale,
    opacity,
    translateX: slotOffset * CAROUSEL_PLACEMENT.spacing,
  };
}

/**
 * Điều hướng băng chuyền sang thẻ kế tiếp (`"next"`) hoặc thẻ trước (`"prev"`).
 *
 * Trả về một `CarouselState` mới với `centerIndex` đã dịch và bao vòng về
 * `[0, total)`. Hàm thuần: không thay đổi `state` đầu vào.
 *
 * Tính khả nghịch: `navigate(navigate(s, "next"), "prev")` trả về đúng
 * `centerIndex` ban đầu (và ngược lại) khi `total >= 1` (Req 8.5, 8.6).
 *
 * _Requirements: 8.5, 8.6_
 */
export function navigate(
  state: CarouselState,
  dir: CarouselDirection,
): CarouselState {
  const step = dir === "next" ? 1 : -1;
  return {
    total: state.total,
    centerIndex: wrapIndex(state.centerIndex + step, state.total),
  };
}

/**
 * Phân giải ảnh hiển thị cho một Project_Card.
 *
 * Trả về ảnh giữ chỗ (`isPlaceholder = true`) khi và chỉ khi `thumbnail` là
 * `null` **và** `images` rỗng (Req 8.13). Ngược lại trả về một ảnh dự án thực:
 * ưu tiên `thumbnail`, nếu không có thì lấy phần tử đầu của `images`.
 *
 * Thuần, tất định.
 *
 * _Requirements: 8.13_
 */
export function resolveProjectImage(
  project: Pick<Project, "thumbnail" | "images">,
): ResolvedProjectImage {
  if (project.thumbnail !== null) {
    return { src: project.thumbnail, isPlaceholder: false };
  }
  if (project.images.length > 0) {
    return { src: project.images[0], isPlaceholder: false };
  }
  return { src: PROJECT_IMAGE_PLACEHOLDER, isPlaceholder: true };
}

/**
 * Quyết định hiển thị một nút liên kết: chỉ hiển thị khi URL khác `null`.
 *
 * Thuần, tất định.
 *
 * _Requirements: 8.7_
 */
export function isLinkVisible(url: string | null): boolean {
  return url !== null;
}

/**
 * Cờ hiển thị nút GitHub/Demo của một Project_Card theo dữ liệu dự án.
 *
 * Nút GitHub hiển thị khi và chỉ khi `githubUrl != null`; nút Demo hiển thị khi
 * và chỉ khi `demoUrl != null` (Req 8.7). Thuần, tất định.
 *
 * _Requirements: 8.7_
 */
export function resolveProjectLinkVisibility(
  project: Pick<Project, "githubUrl" | "demoUrl">,
): ProjectLinkVisibility {
  return {
    github: isLinkVisible(project.githubUrl),
    demo: isLinkVisible(project.demoUrl),
  };
}
