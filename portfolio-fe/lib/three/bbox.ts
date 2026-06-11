/**
 * Logic thuần chuẩn hóa hộp bao (bounding box) của một mô hình 3D.
 *
 * Các hàm ở đây không phụ thuộc WebGL/Three.js để có thể kiểm thử dựa trên
 * thuộc tính (property-based testing) mà không cần một render context thực.
 * Kết quả được dùng bởi Asset_Pipeline (chuẩn hóa GLB) và Desktop_Model (căn
 * giữa + thu tỉ lệ vật thể trung tâm của Hero).
 *
 * _Requirements: 2.4_
 */

/** Hộp bao trục-thẳng (axis-aligned) định nghĩa bởi hai góc đối diện. */
export interface BoundingBox {
  /** Góc nhỏ nhất theo từng trục (x, y, z). */
  min: [number, number, number];
  /** Góc lớn nhất theo từng trục (x, y, z). */
  max: [number, number, number];
}

/**
 * Phép biến đổi chuẩn hóa: dịch chuyển rồi thu tỉ lệ quanh gốc toạ độ.
 *
 * Cách áp dụng cho một điểm `p`: `pNew = (p + translate) * scale`.
 * - `translate` đưa tâm hộp bao về gốc toạ độ.
 * - `scale` chuẩn hóa cạnh lớn nhất của hộp bao về `1.0`.
 */
export interface NormalizationTransform {
  /** Vector dịch chuyển áp dụng trước khi thu tỉ lệ (đơn vị thế giới). */
  translate: [number, number, number];
  /** Hệ số tỉ lệ đồng nhất áp dụng quanh gốc toạ độ. */
  scale: number;
}

/** Phép biến đổi đồng nhất (không thay đổi gì) dùng cho đầu vào suy biến. */
const IDENTITY_TRANSFORM: NormalizationTransform = {
  translate: [0, 0, 0],
  scale: 1,
};

/**
 * Tính `NormalizationTransform` đưa tâm hộp bao về gốc toạ độ và chuẩn hóa cạnh
 * lớn nhất về `1.0`.
 *
 * Sau khi áp dụng `pNew = (p + translate) * scale` cho mọi điểm của hộp bao:
 * - Tâm hộp bao mới nằm tại gốc toạ độ (trong sai số dấu phẩy động).
 * - Cạnh dài nhất của hộp bao mới bằng `1.0`.
 *
 * Đầu vào suy biến hoặc không hợp lệ (toạ độ không hữu hạn, hoặc cả ba cạnh đều
 * bằng 0 khiến không thể chuẩn hóa) được xử lý thận trọng bằng cách trả về phép
 * biến đổi đồng nhất thay vì ném lỗi hay tạo ra `Infinity`.
 *
 * _Requirements: 2.4_
 */
export function computeNormalizationTransform(
  bbox: BoundingBox,
): NormalizationTransform {
  const { min, max } = bbox;

  // Guard: mọi toạ độ phải hữu hạn.
  const allFinite = [...min, ...max].every((v) => Number.isFinite(v));
  if (!allFinite) {
    return IDENTITY_TRANSFORM;
  }

  // Tâm hộp bao = trung điểm của min và max theo từng trục.
  const center: [number, number, number] = [
    (min[0] + max[0]) / 2,
    (min[1] + max[1]) / 2,
    (min[2] + max[2]) / 2,
  ];

  // Kích thước cạnh theo từng trục (giá trị tuyệt đối để chống min > max).
  const sizeX = Math.abs(max[0] - min[0]);
  const sizeY = Math.abs(max[1] - min[1]);
  const sizeZ = Math.abs(max[2] - min[2]);

  const maxEdge = Math.max(sizeX, sizeY, sizeZ);

  // Guard: hộp bao suy biến (mọi cạnh = 0) -> không thể chuẩn hóa tỉ lệ.
  if (maxEdge <= 0 || !Number.isFinite(maxEdge)) {
    return {
      translate: [-center[0], -center[1], -center[2]],
      scale: 1,
    };
  }

  return {
    // Dịch tâm về gốc toạ độ: cộng vào điểm rồi sẽ thu tỉ lệ quanh gốc.
    translate: [-center[0], -center[1], -center[2]],
    // Chuẩn hóa cạnh lớn nhất về 1.0.
    scale: 1 / maxEdge,
  };
}
