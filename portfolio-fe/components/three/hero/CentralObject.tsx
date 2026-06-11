"use client";

/**
 * CentralObject — vật thể trung tâm của cảnh 3D Hero.
 *
 * Render một TorusKnot dùng vật liệu PBR (`meshStandardMaterial`) có
 * `metalness`/`roughness` rõ ràng; vì là vật liệu PBR nên nó tự phản chiếu
 * Environment của cảnh (environment reflection). Màu chủ đạo lấy từ `PALETTE`
 * (cyan) kèm điểm nhấn phát sáng (emissive).
 *
 * Bố cục: đọc `size` + `camera` từ `useThree()` và gọi `computeFitScale` (logic
 * thuần trong `lib/three/composition`) để giữ vật thể nằm trọn trong khung hình;
 * tỉ lệ được tính lại khi viewport đổi (Req 4.3, 4.4, 4.5).
 *
 * Chuyển động: dao động trôi theo `floatOffset` (dựa trên thời gian tuyệt đối)
 * cho `position.y`, và xoay tích lũy theo delta-time bằng `advanceRotation`
 * (độc lập FPS — Req 5.2). Khi `reducedMotion` bật, biên độ trôi bị giảm qua
 * `reducedAmplitude`.
 *
 * _Requirements: 1.1, 1.2, 4.3, 4.4, 4.5, 5.1, 5.2_
 */

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { TorusKnot } from "@react-three/drei";
import type { Mesh, PerspectiveCamera } from "three";

import {
  computeFitScale,
  type ViewportInfo,
} from "@/lib/three/composition";
import {
  advanceRotation,
  floatOffset,
  reducedAmplitude,
  type FloatConfig,
  type RotationConfig,
} from "@/lib/three/animation";
import { PALETTE } from "@/lib/three/palette";

/** Tham số hình học của TorusKnot: [radius, tube, tubularSegments, radialSegments]. */
const TORUS_KNOT_ARGS: [number, number, number, number] = [1, 0.32, 128, 32];

/**
 * Bán kính bao (bounding radius) xấp xỉ của TorusKnot.
 *
 * Bán kính vòng ~1 cộng bán kính ống ~0.32 cho bán kính hiệu dụng ~1.32; chọn
 * ~1.4 để bao trọn phần nhô ra của knot khi tính tỉ lệ vừa khung hình.
 */
const OBJECT_RADIUS = 1.4;

/** Cấu hình dao động trôi theo phương Y của vật thể trung tâm. */
const FLOAT_CONFIG: FloatConfig = {
  amplitude: 0.3,
  frequency: 0.8,
  phase: 0,
};

/** Cấu hình tốc độ xoay liên tục (rad/s). */
const ROTATION_CONFIG: RotationConfig = {
  speedX: 0.15,
  speedY: 0.2,
};

export interface CentralObjectProps {
  /** Khi bật Reduced_Motion_Mode, giảm biên độ dao động trôi. */
  reducedMotion: boolean;
}

export function CentralObject({ reducedMotion }: CentralObjectProps) {
  const meshRef = useRef<Mesh>(null);
  /** Góc xoay tích lũy theo delta-time (độc lập FPS). */
  const angleRef = useRef({ x: 0, y: 0 });

  const { size, camera } = useThree();

  // Tỉ lệ vừa khung hình — tính lại khi kích thước viewport hoặc camera đổi.
  const fitScale = useMemo(() => {
    const perspective = camera as PerspectiveCamera;
    const viewport: ViewportInfo = {
      width: size.width,
      height: size.height,
      fovDeg: perspective.fov,
      // Khoảng cách camera tới gốc toạ độ (vật thể đặt tại origin).
      cameraZ: Math.abs(camera.position.z),
    };
    return computeFitScale(OBJECT_RADIUS, viewport);
  }, [size.width, size.height, camera]);

  // Biên độ trôi đã điều chỉnh theo Reduced_Motion_Mode.
  const floatConfig = useMemo(
    () => reducedAmplitude(FLOAT_CONFIG, reducedMotion),
    [reducedMotion],
  );

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    // Dao động trôi theo phương Y dựa trên thời gian tuyệt đối (bị chặn bởi amplitude).
    mesh.position.y = floatOffset(state.clock.elapsedTime, floatConfig);

    // Xoay tích lũy dựa trên delta-time để độc lập với số khung hình.
    angleRef.current.x = advanceRotation(
      angleRef.current.x,
      delta,
      ROTATION_CONFIG.speedX,
    );
    angleRef.current.y = advanceRotation(
      angleRef.current.y,
      delta,
      ROTATION_CONFIG.speedY,
    );
    mesh.rotation.x = angleRef.current.x;
    mesh.rotation.y = angleRef.current.y;
  });

  return (
    <TorusKnot
      ref={meshRef}
      args={TORUS_KNOT_ARGS}
      position={[0, 0, 0]}
      scale={fitScale}
    >
      <meshStandardMaterial
        color={PALETTE.cyan}
        emissive={PALETTE.cyan}
        emissiveIntensity={0.35}
        metalness={0.9}
        roughness={0.15}
        envMapIntensity={1}
      />
    </TorusKnot>
  );
}

export default CentralObject;
