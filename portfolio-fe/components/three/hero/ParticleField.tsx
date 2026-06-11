"use client";

/**
 * ParticleField — trường hạt và nền sao của cảnh 3D Hero.
 *
 * Gồm hai phần:
 *
 * 1. Một đám mây điểm (points cloud) tự dựng bằng `bufferGeometry` với hai
 *    attribute `position` + `color`. Mật độ hạt đọc từ `preset.particleCount`
 *    (Req 7.3); mỗi hạt được tô màu ngẫu nhiên cyan/violet lấy từ `PALETTE`
 *    để giữ nhận diện thị giác nhất quán.
 *
 * 2. Nền sao drei `<Stars>` với số sao `preset.starCount`. KHÔNG render Stars
 *    khi `reducedMotion` bật — phần tử Stars hoàn toàn vắng mặt khỏi cây render
 *    để không có nền sao động (Req 5.4).
 *
 * Chuyển động: toàn bộ dựa trên delta-time. Góc xoay của đám mây điểm được tích
 * lũy qua `advanceRotation` (độc lập FPS — Req 5.2) trong một ref, tránh các
 * bước nhảy theo thời gian tuyệt đối.
 *
 * _Requirements: 5.4, 7.3_
 */

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import { Color, type Points } from "three";

import { advanceRotation } from "@/lib/three/animation";
import { PALETTE } from "@/lib/three/palette";
import type { TierPreset } from "@/lib/three/graphicsTier";

/** Nửa cạnh khối lập phương phân bố hạt (đơn vị thế giới). */
const FIELD_SPREAD = 20;

/** Tốc độ xoay (rad/s) của đám mây điểm quanh trục Y và X — rất chậm, tinh tế. */
const SPIN_SPEED_Y = 0.03;
const SPIN_SPEED_X = 0.01;

export interface ParticleFieldProps {
  /** Preset của tier hiện tại; cung cấp `particleCount` và `starCount`. */
  preset: TierPreset;
  /** Khi bật Reduced_Motion_Mode, không render nền sao động (Stars). */
  reducedMotion: boolean;
}

export function ParticleField({ preset, reducedMotion }: ParticleFieldProps) {
  const pointsRef = useRef<Points>(null);
  /** Góc xoay tích lũy theo delta-time (độc lập FPS). */
  const angleRef = useRef({ x: 0, y: 0 });

  const count = preset.particleCount;

  // Dựng vị trí + màu của các hạt một lần theo `count`.
  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const cyan = new Color(PALETTE.cyan);
    const violet = new Color(PALETTE.violet);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * FIELD_SPREAD;
      positions[i * 3 + 1] = (Math.random() - 0.5) * FIELD_SPREAD;
      positions[i * 3 + 2] = (Math.random() - 0.5) * FIELD_SPREAD;

      const c = Math.random() > 0.5 ? cyan : violet;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    return { positions, colors };
  }, [count]);

  useFrame((_, delta) => {
    const points = pointsRef.current;
    if (!points) return;

    // Xoay tích lũy dựa trên delta-time để độc lập với số khung hình.
    angleRef.current.y = advanceRotation(angleRef.current.y, delta, SPIN_SPEED_Y);
    angleRef.current.x = advanceRotation(angleRef.current.x, delta, SPIN_SPEED_X);
    points.rotation.y = angleRef.current.y;
    points.rotation.x = angleRef.current.x;
  });

  return (
    <>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.04}
          vertexColors
          transparent
          opacity={0.7}
          sizeAttenuation
        />
      </points>

      {/* Nền sao chỉ render khi KHÔNG ở Reduced_Motion_Mode (Req 5.4). */}
      {!reducedMotion && (
        <Stars
          radius={30}
          depth={30}
          count={preset.starCount}
          factor={2}
          fade
          speed={0.5}
        />
      )}
    </>
  );
}

export default ParticleField;
