/**
 * Logic thuần phân giải đường dẫn tài sản 3D (model GLB).
 *
 * Quy tắc: luôn ưu tiên nạp biến thể đã tối ưu (`*.optimized.glb`). Khi biến
 * thể tối ưu không tồn tại tại đường dẫn dự kiến, lùi về tệp nguồn chưa tối ưu
 * và đặt cờ cảnh báo `optimizedMissing = true` để lớp gọi ghi nhận cảnh báo.
 *
 * Hàm ở đây không phụ thuộc hệ thống tệp hay WebGL — sự tồn tại của biến thể
 * tối ưu được truyền vào dưới dạng tham số (`optimizedExists`) để giữ tính
 * thuần, tất định và kiểm thử được bằng property-based testing.
 *
 * _Requirements: 2.5, 2.8_
 */

/** Cặp đường dẫn của một mô hình: biến thể đã tối ưu và tệp nguồn. */
export interface AssetPaths {
  /** Đường dẫn biến thể đã tối ưu (`/models/<name>.optimized.glb`). */
  optimized: string;
  /** Đường dẫn tệp nguồn chưa tối ưu. */
  source: string;
}

/** Kết quả phân giải đường dẫn mô hình để nạp vào cảnh. */
export interface ResolvedModelPath {
  /** Đường dẫn được chọn để nạp (ưu tiên biến thể đã tối ưu). */
  path: string;
  /**
   * Cờ cảnh báo: `true` khi biến thể đã tối ưu bị thiếu và phải lùi về nguồn.
   * `false` khi nạp được biến thể đã tối ưu như mong đợi.
   */
  optimizedMissing: boolean;
}

/** Thư mục chứa các mô hình 3D dưới `public/` (Public_Asset_Layout). */
export const MODELS_DIR = "/models";

/**
 * Đăng ký đường dẫn tệp nguồn cho các mô hình có tên tệp nguồn KHÔNG theo quy
 * ước đặt tên chung (`/models/<name>.glb`).
 *
 * Ví dụ: Desktop_Model có tệp nguồn `programmer_desktop_3d_pc.glb` trong khi
 * biến thể tối ưu là `programmer-desktop.optimized.glb`.
 */
export const MODEL_SOURCE_OVERRIDES: Readonly<Record<string, string>> = {
  "programmer-desktop": `${MODELS_DIR}/programmer_desktop_3d_pc.glb`,
};

/**
 * Suy ra cặp đường dẫn (tối ưu, nguồn) cho một mô hình theo tên logic.
 *
 * - Biến thể tối ưu luôn theo quy ước `/models/<name>.optimized.glb`.
 * - Tệp nguồn theo quy ước `/models/<name>.glb`, trừ khi có khai báo trong
 *   `MODEL_SOURCE_OVERRIDES`.
 *
 * Thuần và tất định.
 */
export function getModelPaths(name: string): AssetPaths {
  return {
    optimized: `${MODELS_DIR}/${name}.optimized.glb`,
    source: MODEL_SOURCE_OVERRIDES[name] ?? `${MODELS_DIR}/${name}.glb`,
  };
}

/**
 * Phân giải đường dẫn mô hình để nạp vào cảnh 3D.
 *
 * Khi biến thể đã tối ưu tồn tại (`optimizedExists === true`), trả về đường dẫn
 * biến thể tối ưu với `optimizedMissing = false` (Req 2.5). Ngược lại, trả về
 * đường dẫn tệp nguồn với `optimizedMissing = true` để lớp gọi ghi nhận cảnh
 * báo "biến thể tối ưu bị thiếu" (Req 2.8).
 *
 * Thuần và tất định: cùng đầu vào luôn cho cùng đầu ra, không phụ thuộc tác
 * động phụ.
 *
 * _Requirements: 2.5, 2.8_
 */
export function resolveModelPath(
  name: string,
  optimizedExists: boolean,
): ResolvedModelPath {
  const { optimized, source } = getModelPaths(name);

  if (optimizedExists) {
    return { path: optimized, optimizedMissing: false };
  }

  return { path: source, optimizedMissing: true };
}
