"use client";

/**
 * EarthGlobeScene — consumer mỏng nối `EarthGlobe` (sub-scene R3F) vào "khung an
 * toàn" dùng chung `SceneCanvas`, dùng làm nền phụ trang trí (tùy chọn) cho
 * Contact Section / Footer (Task 18.2).
 *
 * Hành vi tích hợp:
 *
 * - **Cổng bật/tắt qua `isEarthEnabled(tier, flag)`** (Req 11.5): Earth_Globe chỉ
 *   được dựng khi feature flag `NEXT_PUBLIC_ENABLE_EARTH` bật VÀ Graphics_Tier
 *   hiện tại khác `low`. Flag được đọc ở tầng ngoài (ngoài Canvas) để khi tắt thì
 *   KHÔNG mount Canvas chút nào; còn `tier` chỉ có bên trong `QualityProvider`
 *   nên việc kẹp theo tier `low` được làm ở `EarthGlobeGate` bên trong Canvas.
 *
 * - **Trang trí, không nhận con trỏ, ≤ 40% viewport** (Req 11.3, 11.6): container
 *   `SceneCanvas` mang `aria-hidden="true"` sẵn; ở đây ta thêm `pointer-events:
 *   none` và giới hạn kích thước khung (`40vw × 40vh` ⇒ ≈16% diện tích viewport,
 *   luôn ≤ 40%). Đặt `-z-10` để nằm DƯỚI nội dung văn bản, không che/giảm tương
 *   phản (Req 11.2).
 *
 * - **Lỗi ⇒ ẩn, giữ nền tĩnh, không hiện lỗi cho người dùng** (Req 11.7):
 *   `fallback={null}` nên khi WebGL không khả dụng hoặc cây 3D ném lỗi, không có
 *   gì hiển thị (nền tĩnh hiện có được giữ nguyên). Lỗi tải texture được
 *   `EarthGlobe` tự nuốt qua `onError` và render `null`.
 *
 * - **Reduced motion ⇒ tĩnh** (Req 11.4): đọc `usePrefersReducedMotion` và
 *   truyền xuống `EarthGlobe` (tốc độ xoay về 0).
 *
 * _Requirements: 11.3, 11.5_
 */

import { type ReactNode } from "react";

import { SceneCanvas, type SceneCameraConfig } from "@/components/three/SceneCanvas";
import { EarthGlobe } from "@/components/three/earth/EarthGlobe";
import { isEarthEnabled } from "@/lib/three/earth";
import { useQualityTier } from "@/hooks/useQualityTier";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/**
 * Camera khung cho quả cầu: nhìn thẳng, đủ gần để Earth_Globe lấp đầy khung nền
 * phụ mà không bị cắt (bán kính cầu = 1 đơn vị thế giới).
 */
const EARTH_CAMERA: SceneCameraConfig = { position: [0, 0, 3.2], fov: 50 };

/**
 * Lớp container cho cảnh Earth: trang trí, KHÔNG nhận con trỏ (Req 11.3), giới
 * hạn ≤ 40% diện tích viewport (`40vw × 40vh` ≈ 16%), neo góc dưới-phải và nằm
 * DƯỚI nội dung (`-z-10`) để không phá tương phản văn bản (Req 11.2).
 */
const EARTH_CONTAINER_CLASS =
  "pointer-events-none absolute bottom-0 right-0 -z-10 w-[40vw] h-[40vh]";

/**
 * Đọc feature flag `NEXT_PUBLIC_ENABLE_EARTH`. Bật khi giá trị là `"true"` hoặc
 * `"1"` (chuẩn hóa, không phân biệt hoa/thường, đã cắt khoảng trắng).
 */
function readEarthFlag(): boolean {
  const raw = process.env.NEXT_PUBLIC_ENABLE_EARTH;
  if (typeof raw !== "string") return false;
  const value = raw.trim().toLowerCase();
  return value === "true" || value === "1";
}

interface EarthGlobeGateProps {
  /** Feature flag đã đọc ở tầng ngoài (đã chắc chắn bật khi tới đây). */
  flag: boolean;
  /** Reduced_Motion_Mode → quả cầu dừng xoay (Req 11.4). */
  reducedMotion: boolean;
}

/**
 * EarthGlobeGate — chạy BÊN TRONG `QualityProvider` (qua `SceneCanvas`) nên đọc
 * được `tier`. Áp cổng `isEarthEnabled(tier, flag)`: tier `low` ⇒ tắt (render
 * `null`) để giảm tải (Req 11.5).
 */
function EarthGlobeGate({ flag, reducedMotion }: EarthGlobeGateProps) {
  const { tier } = useQualityTier();
  if (!isEarthEnabled(tier, flag)) {
    return null;
  }
  return <EarthGlobe reducedMotion={reducedMotion} tier={tier} />;
}

/**
 * EarthGlobeScene — nền phụ Earth_Globe (tùy chọn) cho Contact/Footer.
 *
 * Trả về `null` ngay khi feature flag tắt để KHÔNG mount Canvas. Khi bật, dựng
 * `SceneCanvas` (decorative, pointer-events none, ≤40% viewport) bọc
 * `EarthGlobeGate` để kẹp thêm theo tier `low`.
 */
export function EarthGlobeScene(): ReactNode {
  const flag = readEarthFlag();
  const reducedMotion = usePrefersReducedMotion();

  // Flag tắt ⇒ không mount gì cả (cũng phủ phần `flag` của isEarthEnabled).
  if (!flag) {
    return null;
  }

  return (
    <SceneCanvas
      className={EARTH_CONTAINER_CLASS}
      cameraConfig={EARTH_CAMERA}
      // Req 11.7: lỗi/không có WebGL ⇒ ẩn, giữ nền tĩnh, không hiện lỗi.
      fallback={null}
    >
      <EarthGlobeGate flag={flag} reducedMotion={reducedMotion} />
    </SceneCanvas>
  );
}

export default EarthGlobeScene;
