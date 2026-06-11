"use client";

/**
 * CubeLogo — khối lập phương logo 3D dựng-bằng-mã (code-built).
 *
 * Component R3F (sub-scene) này render BÊN TRONG một `<Canvas>` (ví dụ qua
 * `SceneCanvas`/`HeroScene`) chứ KHÔNG tự tạo `<Canvas>` riêng. Nó dựng một
 * khối hộp (`boxGeometry`) với vật liệu kính/kim loại nhẹ
 * (`meshPhysicalMaterial`), tô gradient chuyển màu giữa cyan (#22d3ee) và
 * violet (#a855f7) thuộc Accent_Palette bằng **vertex colors** dọc theo trục
 * đứng, và in chữ cái cá nhân "T" lên một mặt hướng về camera bằng drei
 * `<Text>`.
 *
 * Chuyển động: khối xoay liên tục quanh **trục đứng (Y)**, cập nhật theo
 * delta-time bằng `advanceRotation` (độc lập FPS — Req 1.6). Tốc độ quay lấy
 * qua `effectiveRotationSpeed` nên bị kẹp ≤ `MOTION_LIMITS.maxRotationRevPerSec`
 * (0.1 vòng/giây) — tức một vòng quay hoàn chỉnh kéo dài ≥ 10 giây (≥ 8s theo
 * Req 6.4) — và bằng 0 khi Reduced_Motion_Mode bật (khối đứng yên — Req 6.7).
 *
 * Glow: dùng `emissive` + `emissiveIntensity` nằm trong giới hạn cấu hình
 * (`GLOW`) (Req 6.5); ở Graphics_Tier `low`, cường độ glow bị giảm theo preset
 * của tier (Req 6.8).
 *
 * Vai trò tích hợp (Req 6.6): prop `role` cho phép dùng khối làm nền Hero
 * Section (`"hero-bg"`), chỉ báo trạng thái tải (`"loading"`), hoặc logo nhận
 * diện (`"brand"`).
 *
 * _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_
 */

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import {
  BoxGeometry,
  BufferAttribute,
  Color,
  DoubleSide,
  type Group,
} from "three";

import { advanceRotation } from "@/lib/three/animation";
import { effectiveRotationSpeed } from "@/lib/three/motionConfig";
import { PALETTE } from "@/lib/three/palette";
import type { GraphicsTier } from "@/lib/three/graphicsTier";

/** Cạnh của khối lập phương (đơn vị thế giới). */
const CUBE_SIZE = 1;

/**
 * Tốc độ quay cơ sở quanh trục đứng (vòng/giây).
 *
 * Bằng đúng trần `MOTION_LIMITS.maxRotationRevPerSec` (0.1 rev/s) → một vòng
 * quay hoàn chỉnh kéo dài 10 giây (≥ 8s theo Req 6.4). Giá trị này được đưa qua
 * `effectiveRotationSpeed` nên luôn được kẹp về giới hạn an toàn.
 */
const BASE_ROTATION_REV_PER_SEC = 0.1;

/**
 * Giới hạn cấu hình cho hiệu ứng phát sáng (glow) của khối (Req 6.5, 6.8).
 *
 * - `default`: cường độ emissive ở tier `high`/`medium`.
 * - `low`: cường độ giảm cho tier `low`.
 * - `max`: trần cứng để kẹp giá trị, đảm bảo glow luôn "trong giới hạn cấu hình".
 */
const GLOW = {
  default: 0.6,
  low: 0.15,
  max: 1.0,
} as const;

/**
 * Tỉ lệ khối theo vai trò tích hợp (Req 6.6).
 *
 * Nền Hero lớn hơn để tạo điểm nhấn nền; chỉ báo loading nhỏ gọn; logo nhận
 * diện ở kích thước trung bình.
 */
const ROLE_SCALE: Record<NonNullable<CubeLogoProps["role"]>, number> = {
  "hero-bg": 2.4,
  loading: 0.8,
  brand: 1.2,
};

export interface CubeLogoProps {
  /** Chữ cái cá nhân hiển thị trên mặt khối. Mặc định "T". */
  letter?: string;
  /** Khi Reduced_Motion_Mode bật, khối dừng xoay và giữ trạng thái tĩnh. */
  reducedMotion: boolean;
  /** Graphics_Tier hiện tại; ở `low` glow bị giảm. */
  tier: GraphicsTier;
  /** Vai trò tích hợp của khối. Mặc định `"brand"`. */
  role?: "hero-bg" | "loading" | "brand";
}

export function CubeLogo({
  letter = "T",
  reducedMotion,
  tier,
  role = "brand",
}: CubeLogoProps) {
  const groupRef = useRef<Group>(null);
  /** Góc xoay tích lũy quanh trục Y theo delta-time (độc lập FPS). */
  const angleRef = useRef(0);

  // Hình hộp dựng-bằng-mã (Req 6.1) kèm gradient cyan→violet bằng vertex colors
  // dọc theo trục đứng (Req 6.2). Tạo một lần và dọn dẹp khi unmount.
  const geometry = useMemo(() => {
    const geo = new BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
    const position = geo.attributes.position;
    const colors = new Float32Array(position.count * 3);

    const cyan = new Color(PALETTE.cyan);
    const violet = new Color(PALETTE.violet);
    const mixed = new Color();

    const half = CUBE_SIZE / 2;
    for (let i = 0; i < position.count; i += 1) {
      // Chuẩn hóa y trong [-half, half] → t trong [0, 1] (dưới = cyan, trên = violet).
      const y = position.getY(i);
      const t = (y + half) / CUBE_SIZE;
      mixed.copy(cyan).lerp(violet, t);
      colors[i * 3] = mixed.r;
      colors[i * 3 + 1] = mixed.g;
      colors[i * 3 + 2] = mixed.b;
    }

    geo.setAttribute("color", new BufferAttribute(colors, 3));
    return geo;
  }, []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  // Tốc độ quay hiệu dụng (vòng/giây): bằng 0 khi reduced motion (Req 6.7),
  // ngược lại bị kẹp về trần Motion_Config (Req 6.4). Đổi sang rad/s cho three.
  const speedRadPerSec = useMemo(
    () => effectiveRotationSpeed(BASE_ROTATION_REV_PER_SEC, reducedMotion) * 2 * Math.PI,
    [reducedMotion],
  );

  // Cường độ glow trong giới hạn cấu hình; giảm ở tier `low` (Req 6.5, 6.8).
  const glowIntensity = useMemo(
    () => Math.min(tier === "low" ? GLOW.low : GLOW.default, GLOW.max),
    [tier],
  );

  const scale = ROLE_SCALE[role];

  useFrame((_state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    // Xoay tích lũy quanh trục đứng (Y) theo delta-time (độc lập FPS — Req 6.4).
    // Khi reduced motion, `speedRadPerSec === 0` nên góc giữ nguyên (Req 6.7).
    angleRef.current = advanceRotation(angleRef.current, delta, speedRadPerSec);
    group.rotation.y = angleRef.current;
  });

  return (
    <group ref={groupRef} scale={scale}>
      <mesh geometry={geometry}>
        {/* Vật liệu kính/kim loại nhẹ (Req 6.1): transmission cho cảm giác kính,
            metalness/roughness cho ánh kim; vertexColors bật gradient cyan→violet
            (Req 6.2); emissive tạo glow trong giới hạn cấu hình (Req 6.5, 6.8). */}
        <meshPhysicalMaterial
          vertexColors
          metalness={0.6}
          roughness={0.1}
          transmission={0.5}
          thickness={0.5}
          ior={1.4}
          clearcoat={1}
          clearcoatRoughness={0.1}
          emissive={PALETTE.violet}
          emissiveIntensity={glowIntensity}
          envMapIntensity={1}
        />
      </mesh>

      {/* Chữ cái cá nhân "T" trên mặt +Z của khối, hướng về camera ở trạng thái
          ban đầu và quay cùng khối (Req 6.3). Đặt hơi nhô ra trước bề mặt. */}
      <Text
        position={[0, 0, CUBE_SIZE / 2 + 0.01]}
        fontSize={CUBE_SIZE * 0.6}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        // Mặt trang trí — không tương tác.
        renderOrder={1}
      >
        {letter}
        <meshBasicMaterial color="#ffffff" toneMapped={false} side={DoubleSide} />
      </Text>
    </group>
  );
}

export default CubeLogo;
