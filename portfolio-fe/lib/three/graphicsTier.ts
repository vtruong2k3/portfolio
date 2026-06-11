/**
 * Quản lý chất lượng đồ họa (Quality_Manager) cho cảnh 3D Hero.
 *
 * Module này chứa toàn bộ **logic thuần** (pure, tất định) để:
 * - Chọn graphics tier ban đầu từ tín hiệu thiết bị (`selectInitialTier`).
 * - Giới hạn DPR theo trần của tier (`clampDpr`).
 * - Hạ tier theo từng bậc (`downgradeTier`).
 * - Tra cứu preset của một tier (`getPreset`).
 *
 * Các hàm ở đây không truy cập browser API và không có side-effect, nhờ vậy có
 * thể kiểm thử bằng property-based testing mà không cần WebGL context.
 *
 * _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 8.4, 1.4, 2.4, 3.4, 3.5_
 */

/** Một trong các mức chất lượng đồ họa rời rạc. */
export type GraphicsTier = "high" | "medium" | "low";

/** Tín hiệu năng lực thiết bị dùng để chọn tier ban đầu. */
export interface DeviceSignals {
  /** Chiều rộng màn hình (px CSS), ví dụ `window.innerWidth`. */
  screenWidth: number;
  /** Chiều cao màn hình (px CSS), ví dụ `window.innerHeight`. */
  screenHeight: number;
  /** Tỉ lệ điểm ảnh thiết bị, ví dụ `window.devicePixelRatio`. */
  devicePixelRatio: number;
  /**
   * Số lõi CPU logic, ví dụ `navigator.hardwareConcurrency`.
   * Có thể `undefined` khi trình duyệt không cung cấp.
   */
  logicalCores: number | undefined;
}

/** Tập tham số chất lượng tương ứng một tier. */
export interface TierPreset {
  tier: GraphicsTier;
  /** Số hạt của ParticleField. */
  particleCount: number;
  /** Trần DPR cho Canvas. */
  maxDpr: number;
  /** Bật khử răng cưa. */
  antialias: boolean;
  /** Bật đổ bóng cho key light. */
  shadows: boolean;
  /** Bật pipeline hậu kỳ. */
  postProcessing: boolean;
  /** Độ phân giải environment map. */
  envMapResolution: "high" | "low" | "color";
  /** Số sao nền (0 khi tier thấp / reduced motion). */
  starCount: number;
}

/** Thứ tự giảm dần (cao -> thấp) để hạ tier theo từng bậc. */
export const TIER_ORDER: readonly GraphicsTier[] = ["high", "medium", "low"];

/** Bảng preset cho từng tier. */
export const TIER_PRESETS: Record<GraphicsTier, TierPreset> = {
  high: {
    tier: "high",
    particleCount: 500,
    maxDpr: 2.0,
    antialias: true,
    shadows: true,
    postProcessing: true,
    envMapResolution: "high",
    starCount: 800,
  },
  medium: {
    tier: "medium",
    particleCount: 300,
    maxDpr: 1.5,
    antialias: true,
    shadows: false,
    postProcessing: true,
    envMapResolution: "low",
    starCount: 400,
  },
  low: {
    tier: "low",
    particleCount: 100,
    maxDpr: 1.0,
    antialias: false,
    shadows: false,
    postProcessing: false,
    envMapResolution: "color",
    starCount: 0,
  },
};

/**
 * Ngưỡng tối thiểu để KHÔNG bị ép xuống `low`.
 *
 * Đây là điều kiện cần (sàn) cho tier `medium`: dưới bất kỳ ngưỡng nào trong
 * đây thì thiết bị bị ép về `low` (Req 7.2).
 */
export const TIER_THRESHOLDS: {
  minScreenWidth: number;
  maxDpr: number;
  minLogicalCores: number;
} = {
  minScreenWidth: 768,
  maxDpr: 2,
  minLogicalCores: 4,
};

/**
 * Số lõi logic mặc định thận trọng khi `logicalCores` không xác định.
 *
 * Đủ để không bị ép `low` (đạt sàn `medium`) nhưng KHÔNG đủ để đạt `high`,
 * tránh nâng tier quá đà trên thiết bị không khai báo năng lực (Req 7.1).
 */
const CONSERVATIVE_CORES = TIER_THRESHOLDS.minLogicalCores;

/**
 * Chọn tier ban đầu từ tín hiệu thiết bị. Thuần, tất định. (Req 7.1, 7.2)
 *
 * - `high`: `screenWidth >= 1280` và `devicePixelRatio <= 2` và `logicalCores >= 8`.
 * - `medium`: `screenWidth >= 768` và `logicalCores >= 4`.
 * - ngược lại (bất kỳ tín hiệu nào dưới ngưỡng): `low`.
 *
 * Khi `logicalCores` thiếu/undefined, dùng mặc định thận trọng: coi như đủ cho
 * `medium` nhưng không bao giờ đạt `high`.
 */
export function selectInitialTier(signals: DeviceSignals): GraphicsTier {
  const { screenWidth, devicePixelRatio } = signals;
  const coresKnown = typeof signals.logicalCores === "number";
  const cores = coresKnown
    ? (signals.logicalCores as number)
    : CONSERVATIVE_CORES;

  // `high` chỉ khi số lõi được khai báo rõ ràng và đạt ngưỡng cao.
  if (
    coresKnown &&
    screenWidth >= 1280 &&
    devicePixelRatio <= 2 &&
    cores >= 8
  ) {
    return "high";
  }

  // `medium` khi đạt sàn tối thiểu; ngược lại bị ép `low`.
  if (screenWidth >= TIER_THRESHOLDS.minScreenWidth && cores >= TIER_THRESHOLDS.minLogicalCores) {
    return "medium";
  }

  return "low";
}

/**
 * Giới hạn DPR theo trần của tier hiện tại. (Req 7.4)
 *
 * Kết quả luôn `> 0`, `<= maxDpr` của tier, và `<= rawDpr`.
 */
export function clampDpr(rawDpr: number, tier: GraphicsTier): number {
  const max = TIER_PRESETS[tier].maxDpr;
  // Giữ giá trị dương: nếu rawDpr không hợp lệ (<=0) thì dùng cận dưới rất nhỏ.
  const safeRaw = rawDpr > 0 ? rawDpr : Number.MIN_VALUE;
  return Math.min(safeRaw, max);
}

/**
 * Trả về tier thấp hơn kế tiếp, hoặc cùng tier nếu đã ở `low`. (Req 8.4)
 */
export function downgradeTier(current: GraphicsTier): GraphicsTier {
  const index = TIER_ORDER.indexOf(current);
  // Tier không xác định: coi như đã ở mức thấp nhất an toàn.
  if (index === -1) {
    return "low";
  }
  const nextIndex = Math.min(index + 1, TIER_ORDER.length - 1);
  return TIER_ORDER[nextIndex];
}

/** Lấy preset cho một tier. */
export function getPreset(tier: GraphicsTier): TierPreset {
  return TIER_PRESETS[tier];
}
