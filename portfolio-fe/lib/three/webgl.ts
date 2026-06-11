/**
 * Phát hiện khả dụng WebGL một cách an toàn cho SSR.
 *
 * Hàm `isWebGLAvailable` được thiết kế để KHÔNG bao giờ ném lỗi: khi chạy
 * phía server (không có `window`/`document`) nó trả về `false` thay vì truy
 * cập API trình duyệt không tồn tại. Điều này cho phép guard kiểm tra WebGL
 * trước khi dựng `<Canvas>` mà vẫn an toàn trong môi trường render phía server.
 *
 * _Requirements: 12.1, 10.2, 10.3_
 */

/**
 * Kiểm tra xem WebGL có khả dụng trong môi trường hiện tại hay không.
 *
 * - Trả về `false` ngay lập tức khi `window` hoặc `document` không tồn tại
 *   (ví dụ trong lúc render phía server), không truy cập bất kỳ API trình
 *   duyệt nào trong trường hợp đó (Req 10.2, 10.3).
 * - Tạo một `<canvas>` tạm và thử lấy context `"webgl"` hoặc
 *   `"experimental-webgl"` bên trong `try/catch`; chỉ trả về `true` khi lấy
 *   được context, ngược lại trả về `false` (Req 12.1).
 *
 * @returns `true` nếu có thể tạo một WebGL context, ngược lại `false`.
 */
export function isWebGLAvailable(): boolean {
  // Guard SSR: không có môi trường client -> coi như WebGL không khả dụng.
  if (typeof window === "undefined" || typeof document === "undefined") {
    return false;
  }

  try {
    const canvas = document.createElement("canvas");
    const context =
      canvas.getContext("webgl") ??
      canvas.getContext("experimental-webgl");
    const available = context !== null && context !== undefined;

    // Giải phóng NGAY context thăm dò: nếu không, mỗi lần gọi sẽ rò rỉ một
    // WebGL context. Trình duyệt giới hạn số context đồng thời (~16); khi vượt
    // ngưỡng, trình duyệt huỷ context cũ nhất — kể cả context của <Canvas>
    // chính — gây "WebGLRenderer: Context Lost" và làm banner trắng/đơ.
    // Best-effort + optional chaining để không ảnh hưởng giá trị trả về và
    // không ném với context giả lập trong test.
    if (available) {
      try {
        const ctx = context as WebGLRenderingContext;
        ctx.getExtension?.("WEBGL_lose_context")?.loseContext();
      } catch {
        // Bỏ qua: giải phóng context thăm dò chỉ là tối ưu, không bắt buộc.
      }
    }

    return available;
  } catch {
    // Bất kỳ lỗi nào trong lúc thăm dò context đều coi như không khả dụng.
    return false;
  }
}
