"use client";

/**
 * HeroScene — điểm vào (entry) của cảnh 3D Hero phía client.
 *
 * Trước đây HeroScene tự dựng toàn bộ "khung an toàn" (WebGL guard, error
 * boundary, QualityProvider, DPR/preset, FPS monitor, nền trong suốt +
 * aria-hidden). Khung này đã được trích xuất thành `SceneCanvas` (Task 9.1) để
 * Hero, Skills Orbit, Earth Globe… cùng dùng, tránh nhân đôi logic (Req 3.1).
 *
 * HeroScene giờ chỉ còn là một CONSUMER mỏng của `SceneCanvas`: nó cung cấp nội
 * dung cảnh (`<Scene/>` — TorusKnot/Desktop, lighting, post-processing… Req 3.9),
 * cấu hình camera của Hero, và fallback. Mọi hành vi an toàn / chất lượng giữ
 * nguyên do `SceneCanvas` đảm nhiệm.
 *
 * _Requirements: 3.1, 3.9_
 */

import { SceneCanvas, type SceneCameraConfig } from "@/components/three/SceneCanvas";
import { HeroFallback } from "@/components/three/HeroFallback";
import { Scene } from "@/components/three/hero/Scene";

/** Camera của Hero — giữ nguyên cấu hình trước khi refactor (vị trí + fov). */
const HERO_CAMERA: SceneCameraConfig = { position: [0, 0, 7], fov: 55 };

export function HeroScene() {
  return (
    <SceneCanvas cameraConfig={HERO_CAMERA} fallback={<HeroFallback />}>
      <Scene />
    </SceneCanvas>
  );
}

export default HeroScene;
