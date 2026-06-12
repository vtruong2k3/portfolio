"use client";

/**
 * SkillsOrbitScene — điểm vào (entry) phía client cho cảnh Tech_Icon_Orbit của
 * Skills Section.
 *
 * Component này là CONSUMER mỏng của `SceneCanvas` (khung an toàn dùng chung:
 * WebGL guard, error boundary, QualityProvider, FPS monitor, nền trong suốt +
 * aria-hidden — Req 3.1–3.7, 13.3, 13.4). Nó:
 *
 * 1. Lấy dữ liệu kỹ năng thật từ `useSkills()` (React Query) ở tầng DOM và
 *    truyền vào `TechIconOrbit` (Req 7.1).
 * 2. Đọc `prefers-reduced-motion` ở tầng DOM qua `usePrefersReducedMotion` — đây
 *    là mối quan tâm cấp tài liệu nên phải đọc NGOÀI `<Canvas>` (Req 7.9).
 * 3. Đọc Graphics_Tier qua `useQualityTier` BÊN TRONG `<Canvas>` (chỉ hợp lệ
 *    trong `<QualityProvider>` do `SceneCanvas` dựng) và truyền xuống
 *    `TechIconOrbit` để giới hạn số thẻ theo tier (Req 7.10, 13.x).
 *
 * Cảnh mang tính trang trí: `SceneCanvas` đã đặt `aria-hidden="true"` cho
 * container nên nội dung 3D nằm ngoài luồng tab và không cần nhãn truy cập.
 *
 * _Requirements: 7.1, 7.9, 7.10, 13.1_
 */

import { SceneCanvas, type SceneCameraConfig } from "@/components/three/SceneCanvas";
import { TechIconOrbit } from "@/components/three/skills/TechIconOrbit";
import { useQualityTier } from "@/hooks/useQualityTier";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useSkills } from "@/hooks/queries/use-skills";
import type { Skill } from "@/types/skill";

/**
 * Camera của cảnh Skills — khung hình đủ rộng để bao trọn quỹ đạo bán kính
 * `ORBIT_RADIUS` (2.6) mà không cắt thẻ ở rìa.
 */
const SKILLS_CAMERA: SceneCameraConfig = { position: [0, 0, 7], fov: 55 };

/**
 * SkillsOrbitContent — render BÊN TRONG `<Canvas>` (và `<QualityProvider>`).
 *
 * Tách riêng để được phép gọi `useQualityTier` (hook này ném lỗi nếu nằm ngoài
 * `<QualityProvider>`). Nhận `skills`/`reducedMotion` từ tầng DOM và bổ sung
 * `tier` từ Quality_Manager.
 */
function SkillsOrbitContent({
  skills,
  reducedMotion,
}: {
  skills: Skill[];
  reducedMotion: boolean;
}) {
  const { tier } = useQualityTier();

  return (
    <>
      {/* Ánh sáng tối thiểu để vật liệu thẻ hiển thị (Billboard + texture). */}
      <ambientLight intensity={0.8} />
      <pointLight position={[5, 5, 5]} color="#22d3ee" intensity={2} />
      <pointLight position={[-5, -5, 5]} color="#a855f7" intensity={1.5} />
      <TechIconOrbit skills={skills} reducedMotion={reducedMotion} tier={tier} />
    </>
  );
}

/**
 * SkillsOrbitScene — bọc `TechIconOrbit` trong `SceneCanvas`, nạp dữ liệu kỹ
 * năng và cờ giảm chuyển động ở tầng DOM.
 */
export function SkillsOrbitScene() {
  const { data: skills } = useSkills();
  const reducedMotion = usePrefersReducedMotion();

  return (
    <SceneCanvas cameraConfig={SKILLS_CAMERA}>
      <SkillsOrbitContent skills={skills ?? []} reducedMotion={reducedMotion} />
    </SceneCanvas>
  );
}

export default SkillsOrbitScene;
