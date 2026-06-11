/**
 * Logic thuần cho quỹ đạo của Tech_Icon_Orbit (các thẻ biểu tượng công nghệ bay
 * quanh Desktop_Model trong Skills Section).
 *
 * Toàn bộ toán học định vị quỹ đạo, chọn số lượng thẻ và định hướng billboard
 * được tách thành **hàm thuần, tất định** (không truy cập browser API, không
 * side-effect, không phụ thuộc WebGL/Three.js) để kiểm thử dựa trên thuộc tính
 * (property-based testing). Các component R3F chỉ là lớp mỏng tiêu thụ các hàm
 * này trong `useFrame`/`useMemo`.
 *
 * Orbit_Motion_Config (Req 7.6) quy định:
 * - tốc độ xoay quỹ đạo = 6°/giây (một vòng 360° mỗi 60 giây),
 * - biên độ bay lên/xuống = ±0.05 đơn vị thế giới quanh vị trí gốc,
 * - chu kỳ bay = 4 giây.
 *
 * Các giá trị này nằm trong `MOTION_LIMITS`: 6°/s = 1/60 rev/s ≤ 0.1 rev/s;
 * biên độ 0.05 ≤ 0.5; chu kỳ 4s ≥ 4s.
 *
 * _Requirements: 7.2, 7.3, 7.4, 7.5, 7.6, 7.9, 7.10, 7.13_
 */

import type { GraphicsTier } from "./graphicsTier";

/** Vector 3 chiều (x, y, z) trong không gian thế giới. */
export type Vec3 = [number, number, number];

/** Tham số đầu vào tất định để tính vị trí quỹ đạo của một Tech_Icon_Card. */
export interface OrbitParams {
  /** Chỉ số thẻ (0-based) trong khoảng `[0, total)`. */
  index: number;
  /** Tổng số thẻ trên quỹ đạo (6..8). */
  total: number;
  /** Bán kính quỹ đạo (đơn vị thế giới), `> 0`. */
  radius: number;
  /** Thời gian trôi qua kể từ khi cảnh khởi tạo (giây). */
  elapsedSec: number;
  /** Reduced_Motion_Mode: khi bật, thẻ đứng yên tại vị trí gốc. */
  reduced: boolean;
}

/** Kết quả định vị một Tech_Icon_Card trên quỹ đạo. */
export interface OrbitTransform {
  /** Vị trí (x, y, z): điểm trên đường tròn bán kính `radius` cộng độ bay. */
  position: Vec3;
  /** Góc gốc (độ) = `index * 360 / total` — khoảng cách góc đều nhau. */
  baseAngleDeg: number;
}

/**
 * Orbit_Motion_Config — cấu hình chuyển động quỹ đạo dùng chung (Req 7.6).
 *
 * Là nguồn chân lý cho tốc độ xoay quỹ đạo, biên độ bay và chu kỳ bay của
 * Tech_Icon_Orbit. Mọi giá trị đã được chọn để nằm trong `MOTION_LIMITS`.
 */
export const ORBIT_MOTION_CONFIG = {
  /** Tốc độ xoay quỹ đạo: 6°/giây (360° mỗi 60 giây). */
  rotationDegPerSec: 6,
  /** Biên độ bay lên/xuống: ±0.05 đơn vị thế giới. */
  floatAmplitude: 0.05,
  /** Chu kỳ bay lên/xuống: 4 giây. */
  floatPeriodSec: 4,
} as const;

const DEG_TO_RAD = Math.PI / 180;
const TWO_PI = Math.PI * 2;

/**
 * Tính vị trí quỹ đạo của một Tech_Icon_Card tại thời điểm `elapsedSec`. Thuần.
 *
 * - Góc gốc `baseAngleDeg = index * 360 / total` đảm bảo các thẻ cách đều nhau
 *   trên vòng tròn (Req 7.3).
 * - Khi `reduced === true`: trả về **vị trí gốc tĩnh** — không xoay quỹ đạo,
 *   không bay lên/xuống, độc lập với `elapsedSec` (Req 7.9). Toạ độ phẳng nằm ở
 *   góc gốc, độ cao `y = 0`.
 * - Khi `reduced === false`: góc hiện tại quay thêm theo
 *   `ORBIT_MOTION_CONFIG.rotationDegPerSec * elapsedSec`; độ cao dao động hình
 *   sin với biên độ `floatAmplitude` (±0.05) và chu kỳ `floatPeriodSec`
 *   (Req 7.5, 7.6). Lệch pha theo chỉ số thẻ để các thẻ bay lệch nhau.
 *
 * Bất biến: với mọi đầu vào, toạ độ phẳng luôn nằm trên đường tròn bán kính
 * `radius` (`x² + z² === radius²`), và `|y| <= 0.05` (Req 7.13).
 *
 * Đầu vào suy biến (`total <= 0`, toạ độ không hữu hạn) được xử lý thận trọng:
 * `total <= 0` coi như chỉ có một vị trí ở góc 0.
 *
 * _Requirements: 7.3, 7.5, 7.6, 7.9, 7.13_
 */
export function computeOrbitPosition(params: OrbitParams): OrbitTransform {
  const { index, total, radius, elapsedSec, reduced } = params;

  // Guard: tổng số thẻ phải dương để chia khoảng cách góc.
  const safeTotal = total > 0 ? total : 1;
  const baseAngleDeg = (index * 360) / safeTotal;

  // Bán kính không hữu hạn/âm → coi như 0 để tránh NaN/Infinity.
  const safeRadius = Number.isFinite(radius) && radius > 0 ? radius : 0;

  // Reduced_Motion_Mode: vị trí gốc tĩnh, không phụ thuộc thời gian.
  if (reduced || !Number.isFinite(elapsedSec)) {
    const baseRad = baseAngleDeg * DEG_TO_RAD;
    return {
      position: [
        safeRadius * Math.cos(baseRad),
        0,
        safeRadius * Math.sin(baseRad),
      ],
      baseAngleDeg,
    };
  }

  // Góc hiện tại: góc gốc + quay quỹ đạo theo thời gian.
  const currentAngleDeg =
    baseAngleDeg + ORBIT_MOTION_CONFIG.rotationDegPerSec * elapsedSec;
  const currentRad = currentAngleDeg * DEG_TO_RAD;

  // Độ bay lên/xuống: dao động hình sin trong biên ±floatAmplitude.
  // Lệch pha theo chỉ số thẻ (dùng góc gốc) để các thẻ không bay đồng pha.
  const floatPhase = baseAngleDeg * DEG_TO_RAD;
  const y =
    ORBIT_MOTION_CONFIG.floatAmplitude *
    Math.sin(
      (TWO_PI * elapsedSec) / ORBIT_MOTION_CONFIG.floatPeriodSec + floatPhase,
    );

  return {
    position: [
      safeRadius * Math.cos(currentRad),
      y,
      safeRadius * Math.sin(currentRad),
    ],
    baseAngleDeg,
  };
}

/**
 * Chọn số lượng Tech_Icon_Card hiển thị từ số kỹ năng khả dụng và Graphics_Tier.
 * Thuần, tất định.
 *
 * Quy tắc (Req 7.2, 7.10):
 * - Khoảng mục tiêu là `[6, 8]` thẻ.
 * - Không vượt quá số kỹ năng khả dụng.
 * - Khi tier là `low`, không vượt quá 6 thẻ.
 *
 * Khi số kỹ năng khả dụng nhỏ hơn 6, trả về đúng số khả dụng (không thể đạt sàn
 * 6). Đầu vào không hữu hạn/âm được đưa về 0.
 *
 * _Requirements: 7.2, 7.10_
 */
export function selectCardCount(available: number, tier: GraphicsTier): number {
  // Chuẩn hóa số khả dụng về số nguyên không âm.
  const safeAvailable =
    Number.isFinite(available) && available > 0 ? Math.floor(available) : 0;

  // Trần theo tier: `low` tối đa 6, còn lại tối đa 8.
  const tierCap = tier === "low" ? 6 : 8;

  // Không vượt quá trần tier và không vượt quá số khả dụng.
  return Math.min(tierCap, safeAvailable);
}

/**
 * Vector pháp tuyến billboard: hướng đơn vị từ vị trí thẻ tới camera. Thuần.
 *
 * Một billboard luôn quay mặt về phía camera, nên pháp tuyến của thẻ trùng với
 * vector (camera − card) đã chuẩn hóa. Khi thẻ trùng vị trí camera (vector
 * không xác định), trả về pháp tuyến mặc định `[0, 0, 1]`.
 *
 * _Requirements: 7.4_
 */
export function billboardNormal(cardPosition: Vec3, cameraPosition: Vec3): Vec3 {
  const dir: Vec3 = [
    cameraPosition[0] - cardPosition[0],
    cameraPosition[1] - cardPosition[1],
    cameraPosition[2] - cardPosition[2],
  ];
  const length = Math.hypot(dir[0], dir[1], dir[2]);
  if (!(length > 0) || !Number.isFinite(length)) {
    return [0, 0, 1];
  }
  return [dir[0] / length, dir[1] / length, dir[2] / length];
}

/**
 * Độ lệch góc (độ) giữa hai vector trong không gian. Thuần.
 *
 * Trả về góc trong khoảng `[0, 180]`. Dùng để kiểm tra pháp tuyến billboard lệch
 * không quá 1° so với hướng tới camera (Req 7.4). Vector suy biến (độ dài 0)
 * trả về 0.
 *
 * _Requirements: 7.4_
 */
export function angleBetweenDeg(a: Vec3, b: Vec3): number {
  const lenA = Math.hypot(a[0], a[1], a[2]);
  const lenB = Math.hypot(b[0], b[1], b[2]);
  if (!(lenA > 0) || !(lenB > 0)) {
    return 0;
  }
  const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  // Kẹp cosin về [-1, 1] để tránh NaN do sai số dấu phẩy động.
  const cos = Math.min(1, Math.max(-1, dot / (lenA * lenB)));
  return Math.acos(cos) / DEG_TO_RAD;
}
