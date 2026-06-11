"use client";

/**
 * Decorations.tsx — các vật thể trang trí phụ (orbs + rings) của cảnh 3D Hero.
 *
 * Orbs là các hình cầu (sphere), rings là các vòng xuyến (torus), đều dùng vật
 * liệu PBR (`meshStandardMaterial`/`meshPhysicalMaterial`) với `metalness`/
 * `roughness` rõ ràng, tô màu từ `PALETTE`. Các vật thể được phân bố trên nhiều
 * độ sâu trục Z (spanning ~ -3..0) để tạo cảm giác chiều sâu, đồng thời giữ về
 * phía hai bên / lệch tâm để không che vùng văn bản chính ở trung tâm.
 *
 * Chuyển động trôi (float) và xoay (rotation) đều dựa trên delta-time thông qua
 * các hàm thuần trong `lib/three/animation`:
 * - `floatOffset(elapsed, config)` cho lệch vị trí theo trục Y
 * - `advanceRotation(prevAngle, delta, speed)` cho góc xoay tích lũy
 * Khi `reducedMotion` bật, biên độ dao động bị kẹp qua `reducedAmplitude`.
 *
 * _Requirements: 1.1, 1.3, 4.1, 4.2, 5.1, 5.2_
 */

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";

import { PALETTE, type PaletteColor } from "@/lib/three/palette";
import {
  advanceRotation,
  floatOffset,
  reducedAmplitude,
  type FloatConfig,
  type RotationConfig,
} from "@/lib/three/animation";

/** Loại vật thể trang trí. */
export type DecorationKind = "orb" | "ring";

/** Mô tả một vật thể trang trí có thể kiểm thử và điều khiển render. */
export interface DecorationItem {
  /** Khóa ổn định để React reconcile. */
  id: string;
  /** Loại vật thể: orb (sphere) hoặc ring (torus). */
  kind: DecorationKind;
  /** Vị trí gốc [x, y, z] trong không gian thế giới. */
  position: [number, number, number];
  /** Màu PBR lấy từ `PALETTE`. */
  color: PaletteColor;
  /** Tỉ lệ kích thước tương đối (mặc định 1). */
  scale: number;
  /** Cấu hình dao động trôi theo trục Y. */
  float: FloatConfig;
  /** Cấu hình tốc độ xoay quanh trục X/Y. */
  rotation: RotationConfig;
}

/**
 * Bố cục trang trí khai báo. Vị trí mô phỏng phong cách đặt vật thể trong
 * `HeroScene.tsx` cũ (orbs ở các góc, rings lệch hai bên) và trải trên nhiều
 * giá trị Z khác nhau (0, -1, -2, -3) để tạo chiều sâu. Render được điều khiển
 * hoàn toàn bởi mảng này nên có thể kiểm thử trực tiếp (task 12.3).
 */
export const DECORATION_LAYOUT: readonly DecorationItem[] = [
  // ── Orbs (spheres) ────────────────────────────────────────────────────────
  {
    id: "orb-cyan",
    kind: "orb",
    position: [-3.5, 1, -1],
    color: PALETTE.cyan,
    scale: 0.6,
    float: { amplitude: 0.3, frequency: 1.0, phase: 0 },
    rotation: { speedX: 0.1, speedY: 0.15 },
  },
  {
    id: "orb-violet",
    kind: "orb",
    position: [3.2, -1.5, -2],
    color: PALETTE.violet,
    scale: 0.5,
    float: { amplitude: 0.25, frequency: 0.9, phase: 1.2 },
    rotation: { speedX: 0.08, speedY: 0.12 },
  },
  {
    id: "orb-blue",
    kind: "orb",
    position: [-2, -2.5, 0],
    color: PALETTE.blue,
    scale: 0.4,
    float: { amplitude: 0.2, frequency: 1.1, phase: 2.4 },
    rotation: { speedX: 0.12, speedY: 0.1 },
  },
  {
    id: "orb-pink",
    kind: "orb",
    position: [4, 2.5, -3],
    color: PALETTE.pink,
    scale: 0.35,
    float: { amplitude: 0.22, frequency: 0.8, phase: 3.6 },
    rotation: { speedX: 0.09, speedY: 0.14 },
  },
  // ── Rings (torus) ───────────────────────────────────────────────────────────
  {
    id: "ring-cyan",
    kind: "ring",
    position: [-4, 0, -2],
    color: PALETTE.cyan,
    scale: 1,
    float: { amplitude: 0.18, frequency: 0.7, phase: 0.6 },
    rotation: { speedX: 0.3, speedY: 0.05 },
  },
  {
    id: "ring-violet",
    kind: "ring",
    position: [3.5, 2, -1],
    color: PALETTE.violet,
    scale: 1,
    float: { amplitude: 0.16, frequency: 0.75, phase: 1.8 },
    rotation: { speedX: 0.15, speedY: 0.3 },
  },
] as const;

interface DecorationProps {
  item: DecorationItem;
  reducedMotion: boolean;
}

/**
 * Một orb (sphere) PBR. Trôi theo trục Y (delta-time qua `floatOffset` dựa trên
 * `elapsedTime`) và xoay tích lũy theo delta (`advanceRotation`).
 */
function Orb({ item, reducedMotion }: DecorationProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const floatCfg = reducedAmplitude(item.float, reducedMotion);

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.position.y = item.position[1] + floatOffset(state.clock.elapsedTime, floatCfg);
    mesh.rotation.x = advanceRotation(mesh.rotation.x, delta, item.rotation.speedX);
    mesh.rotation.y = advanceRotation(mesh.rotation.y, delta, item.rotation.speedY);
  });

  const radius = 0.5 * item.scale;

  return (
    <mesh ref={meshRef} position={item.position}>
      <sphereGeometry args={[radius, 32, 32]} />
      <meshStandardMaterial
        color={item.color}
        emissive={item.color}
        emissiveIntensity={0.4}
        metalness={0.6}
        roughness={0.2}
        transparent
        opacity={0.85}
      />
    </mesh>
  );
}

/**
 * Một ring (torus) PBR kim loại bóng. Trôi theo trục Y và xoay tích lũy theo
 * delta-time.
 */
function Ring({ item, reducedMotion }: DecorationProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const floatCfg = reducedAmplitude(item.float, reducedMotion);

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.position.y = item.position[1] + floatOffset(state.clock.elapsedTime, floatCfg);
    mesh.rotation.x = advanceRotation(mesh.rotation.x, delta, item.rotation.speedX);
    mesh.rotation.y = advanceRotation(mesh.rotation.y, delta, item.rotation.speedY);
  });

  return (
    <mesh ref={meshRef} position={item.position} scale={item.scale}>
      <torusGeometry args={[0.7, 0.06, 16, 64]} />
      <meshPhysicalMaterial
        color={item.color}
        emissive={item.color}
        emissiveIntensity={0.6}
        metalness={0.9}
        roughness={0.05}
        clearcoat={0.6}
        clearcoatRoughness={0.1}
        transparent
        opacity={0.9}
      />
    </mesh>
  );
}

/**
 * Trang trí cảnh Hero: render toàn bộ orbs + rings từ `DECORATION_LAYOUT`.
 *
 * @param reducedMotion - Khi bật, biên độ dao động bị giảm qua `reducedAmplitude`.
 */
export function Decorations({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <>
      {DECORATION_LAYOUT.map((item) =>
        item.kind === "orb" ? (
          <Orb key={item.id} item={item} reducedMotion={reducedMotion} />
        ) : (
          <Ring key={item.id} item={item} reducedMotion={reducedMotion} />
        ),
      )}
    </>
  );
}

export default Decorations;
