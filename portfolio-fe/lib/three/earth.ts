/**
 * Hàm thuần cho Earth_Globe (quả Địa Cầu 3D tùy chọn).
 *
 * Logic quyết định bật/tắt Earth_Globe và hằng số tốc độ xoay được tách thành
 * **logic thuần, tất định** để kiểm thử dựa trên thuộc tính (property-based
 * testing) mà không cần WebGL context. Component R3F chỉ là lớp mỏng tiêu thụ
 * các giá trị này.
 *
 * _Requirements: 11.1, 11.5_
 */

import type { GraphicsTier } from "./graphicsTier";

/**
 * Tốc độ xoay liên tục của Earth_Globe, tính bằng **độ mỗi giây**.
 *
 * Theo Req 11.1, Earth_Globe xoay chậm liên tục với tốc độ trong khoảng
 * `[0.5, 2]` độ/giây. Giá trị `1` nằm gọn trong dải này, cho cảm giác xoay chậm
 * và mượt đúng Art_Direction.
 *
 * _Requirements: 11.1_
 */
export const EARTH_ROTATION_DEG_PER_SEC = 1 as const;

/**
 * Xác định Earth_Globe có được bật hay không. Thuần, tất định.
 *
 * Earth_Globe chỉ được bật khi **cả hai** điều kiện thỏa mãn:
 * - feature flag `flag` đang bật (`true`), và
 * - Graphics_Tier hiện tại **không phải** `low` (Req 11.5: tier `low` tắt
 *   Earth_Globe để giảm tải).
 *
 * Nói cách khác, hàm trả về `true` khi và chỉ khi `tier !== "low" && flag`.
 *
 * _Requirements: 11.1, 11.5_
 */
export function isEarthEnabled(tier: GraphicsTier, flag: boolean): boolean {
  return flag && tier !== "low";
}
