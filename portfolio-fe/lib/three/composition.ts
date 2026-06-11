/**
 * Logic thuần tính tỉ lệ vừa khung hình cho vật thể trung tâm của cảnh 3D Hero.
 *
 * Các hàm ở đây không phụ thuộc WebGL/Three.js để có thể kiểm thử dựa trên
 * thuộc tính (property-based testing) mà không cần một render context thực.
 *
 * _Requirements: 4.3, 4.4, 4.5_
 */

/** Thông tin khung hình dùng để tính vùng nhìn thấy tại mặt phẳng z = 0. */
export interface ViewportInfo {
  /** Chiều rộng viewport (px). */
  width: number;
  /** Chiều cao viewport (px). */
  height: number;
  /** FOV dọc của camera (độ). */
  fovDeg: number;
  /** Khoảng cách từ camera tới gốc toạ độ (đơn vị thế giới). */
  cameraZ: number;
}

/** Chuyển độ sang radian. */
function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Nửa chiều cao thế giới nhìn thấy tại mặt phẳng z = 0.
 *
 * Với camera phối cảnh nhìn về gốc toạ độ, nửa chiều cao vùng nhìn thấy tại
 * khoảng cách `cameraZ` là `cameraZ * tan(fovDeg / 2)`.
 */
export function visibleHalfHeight(viewport: ViewportInfo): number {
  const { fovDeg, cameraZ } = viewport;
  return cameraZ * Math.tan(degToRad(fovDeg) / 2);
}

/**
 * Nửa chiều rộng thế giới nhìn thấy tại mặt phẳng z = 0.
 *
 * Bằng nửa chiều cao nhân với tỉ lệ khung hình (aspect = width / height).
 */
export function visibleHalfWidth(viewport: ViewportInfo): number {
  const { width, height } = viewport;
  const aspect = width / height;
  return visibleHalfHeight(viewport) * aspect;
}

/**
 * Tính tỉ lệ để vật thể bán kính `objectRadius` vừa trọn khung hình.
 *
 * Trả về giá trị trong khoảng `(0, 1]`: chỉ thu nhỏ, không bao giờ phóng to.
 * Bán kính sau khi nhân tỉ lệ phải vừa trọn CẢ nửa chiều cao LẪN nửa chiều rộng
 * vùng nhìn thấy, nên ta lấy theo cạnh hẹp hơn để không bị cắt ở bất kỳ cạnh nào:
 *
 *   scale = min(1, min(halfHeight, halfWidth) / objectRadius)
 *
 * Bất biến đảm bảo (Property 5): `objectRadius * scale <= halfHeight` VÀ
 * `objectRadius * scale <= halfWidth` với mọi kích thước viewport. Vì phép
 * chia rồi nhân số thực có thể tràn ~1 ULP khiến vật thể bị cắt sát cạnh, ta
 * kẹp lại tỉ lệ một cách thận trọng để bất biến luôn đúng nghiêm ngặt.
 *
 * Các đầu vào không hợp lệ (bán kính <= 0, kích thước/FOV/khoảng cách không
 * dương hoặc không hữu hạn) được xử lý thận trọng bằng cách trả về `1`
 * (không thay đổi tỉ lệ) thay vì ném lỗi.
 *
 * _Requirements: 4.3, 4.4, 4.5_
 */
export function computeFitScale(
  objectRadius: number,
  viewport: ViewportInfo,
): number {
  // Guard: bán kính không hợp lệ -> không thay đổi tỉ lệ.
  if (!Number.isFinite(objectRadius) || objectRadius <= 0) {
    return 1;
  }

  const halfHeight = visibleHalfHeight(viewport);
  const halfWidth = visibleHalfWidth(viewport);

  // Guard: vùng nhìn thấy không hợp lệ (viewport suy biến) -> không đổi tỉ lệ.
  if (
    !Number.isFinite(halfHeight) ||
    !Number.isFinite(halfWidth) ||
    halfHeight <= 0 ||
    halfWidth <= 0
  ) {
    return 1;
  }

  // Cạnh hẹp hơn quyết định tỉ lệ: vừa cạnh này thì cũng vừa cạnh còn lại.
  const minHalfExtent = Math.min(halfHeight, halfWidth);

  // Chỉ thu nhỏ (<= 1), không phóng to.
  let scale = Math.min(1, minHalfExtent / objectRadius);

  // An toàn số thực: bảo đảm `objectRadius * scale` không vượt quá nửa kích
  // thước nhìn thấy (tránh tràn ~1 ULP từ phép chia rồi nhân), giữ vững bất
  // biến "không bị cắt ở bất kỳ cạnh nào".
  while (scale > 0 && objectRadius * scale > minHalfExtent) {
    scale *= 1 - Number.EPSILON;
  }

  return scale;
}
