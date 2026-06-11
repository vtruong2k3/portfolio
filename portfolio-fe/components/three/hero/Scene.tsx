"use client";

/**
 * Scene — nội dung cảnh 3D Hero, lắp ráp toàn bộ các component con.
 *
 * Component này được render BÊN TRONG `<Canvas>` của @react-three/fiber (thiết
 * lập ở `HeroScene`) và BÊN TRONG `<QualityProvider>` (cung cấp tier/preset).
 * Nó kết nối tất cả các thành phần con của cảnh và nối dây hệ thống quản lý
 * chất lượng động:
 *
 * - Đọc `preset` từ Quality_Manager qua `useQualityTier`.
 * - Đọc trạng thái `prefers-reduced-motion` qua `usePrefersReducedMotion` và
 *   truyền xuống các component con để chúng giảm/tắt chuyển động tương ứng
 *   (Req 5.1, 5.2).
 *
 * Giám sát FPS runtime (hạ Graphics_Tier khi FPS sụt — Req 8.1, 8.2, 8.3) nay do
 * "khung an toàn" dùng chung `SceneCanvas` đảm nhiệm (FpsMonitor chạy bên trong
 * Canvas), nên `Scene` không còn tự gắn `useFpsMonitor` để tránh giám sát đôi.
 *
 * Cây render con:
 * - `CameraRig`     — parallax theo con trỏ/chạm (giữ gốc khi reducedMotion).
 * - `Lighting`      — key/fill/ambient + environment theo `preset`.
 * - `CentralObject` — TorusKnot PBR, fit-scale + chuyển động delta-based.
 * - `Decorations`   — orbs + rings PBR phân bố theo chiều sâu.
 * - `ParticleField` — trường hạt + Stars theo `preset`/reducedMotion.
 * - `PostProcessing`— Bloom + Vignette (tự tắt ở tier `low` qua `preset`).
 *
 * _Requirements: 5.1, 5.2_
 */

import { useQualityTier } from "@/hooks/useQualityTier";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

import { CameraRig } from "./CameraRig";
import { Lighting } from "./Lighting";
import { CentralObject } from "./CentralObject";
import { Decorations } from "./Decorations";
import { ParticleField } from "./ParticleField";
import { PostProcessing } from "./PostProcessing";

export function Scene() {
  const { preset } = useQualityTier();
  const reducedMotion = usePrefersReducedMotion();

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
