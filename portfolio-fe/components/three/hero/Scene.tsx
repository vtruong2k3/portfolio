"use client";

/**
 * Scene — nội dung cảnh 3D Hero, lắp ráp toàn bộ các component con.
 *
 * Component này được render BÊN TRONG `<Canvas>` của @react-three/fiber (thiết
 * lập ở `HeroScene`) và BÊN TRONG `<QualityProvider>` (cung cấp tier/preset).
 * Nó kết nối tất cả các thành phần con của cảnh và nối dây hệ thống quản lý
 * chất lượng động:
 *
 * - Đọc `preset` và `requestDowngrade` từ Quality_Manager qua `useQualityTier`.
 * - Đọc trạng thái `prefers-reduced-motion` qua `usePrefersReducedMotion` và
 *   truyền xuống các component con để chúng giảm/tắt chuyển động tương ứng
 *   (Req 5.1, 5.2).
 * - Gắn `useFpsMonitor(FPS_CONFIG, requestDowngrade)`: hook chạy bên trong
 *   Canvas (dựa vào `useFrame`), theo dõi FPS trung bình và khi FPS sụt liên
 *   tục đủ lâu sẽ gọi `requestDowngrade` để hạ Graphics_Tier mà không reload
 *   (Req 8.1, 8.2, 8.3).
 *
 * Cây render con:
 * - `CameraRig`     — parallax theo con trỏ/chạm (giữ gốc khi reducedMotion).
 * - `Lighting`      — key/fill/ambient + environment theo `preset`.
 * - `CentralObject` — TorusKnot PBR, fit-scale + chuyển động delta-based.
 * - `Decorations`   — orbs + rings PBR phân bố theo chiều sâu.
 * - `ParticleField` — trường hạt + Stars theo `preset`/reducedMotion.
 * - `PostProcessing`— Bloom + Vignette (tự tắt ở tier `low` qua `preset`).
 *
 * _Requirements: 5.1, 5.2, 8.1, 8.2, 8.3_
 */

import { useQualityTier } from "@/hooks/useQualityTier";
import { useFpsMonitor } from "@/hooks/useFpsMonitor";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import type { FpsMonitorConfig } from "@/lib/three/fpsMonitor";

import { CameraRig } from "./CameraRig";
import { Lighting } from "./Lighting";
import { CentralObject } from "./CentralObject";
import { Decorations } from "./Decorations";
import { ParticleField } from "./ParticleField";
import { PostProcessing } from "./PostProcessing";

/**
 * Cấu hình giám sát FPS (mặc định thiết kế): tính trung bình trong cửa sổ 1s,
 * ngưỡng tối thiểu 40 FPS, hạ tier khi sụt liên tục 2s.
 */
const FPS_CONFIG: FpsMonitorConfig = {
  windowMs: 1000,
  minFps: 40,
  sustainedMs: 2000,
};

export function Scene() {
  const { preset, requestDowngrade } = useQualityTier();
  const reducedMotion = usePrefersReducedMotion();

  // Giám sát FPS runtime; đẩy yêu cầu hạ tier khi FPS sụt kéo dài (Req 8.1–8.3).
  // Hook dựa vào `useFrame` nên CHỈ hợp lệ bên trong <Canvas>.
  useFpsMonitor(FPS_CONFIG, requestDowngrade);

  return (
    <>
      <CameraRig reducedMotion={reducedMotion} />
      <Lighting preset={preset} />
      <CentralObject reducedMotion={reducedMotion} />
      <Decorations reducedMotion={reducedMotion} />
      <ParticleField preset={preset} reducedMotion={reducedMotion} />
      <PostProcessing
        preset={preset}
        enableBloom
        enableVignette
        reducedMotion={reducedMotion}
      />
    </>
  );
}

export default Scene;
