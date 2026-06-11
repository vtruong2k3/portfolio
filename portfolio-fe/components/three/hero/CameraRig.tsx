"use client";

/**
 * CameraRig — hiệu ứng parallax của camera theo con trỏ chuột / điểm chạm.
 *
 * Component R3F mỏng tiêu thụ logic thuần trong `lib/three/cameraRig`:
 * - Đăng ký listener `pointermove` VÀ `touchmove` trên phần tử cha của canvas
 *   (gộp chuột + chạm — Req 6.4), chuẩn hóa toạ độ về `[-1, 1]`. Việc đăng ký
 *   chỉ diễn ra sau khi mount phía client, bên trong `useEffect` kèm guard
 *   `typeof window !== "undefined"` (Req 10.2, 10.3).
 * - Mỗi frame: `pos = lerp(pos, computeParallaxTarget(pointer, bounds), alpha)`,
 *   cập nhật `camera.position.x/y` và `camera.lookAt(0, 0, 0)`, giữ nguyên
 *   `z` gốc của camera (Req 6.1, 6.2).
 * - Khi `reducedMotion` bật: KHÔNG gắn listener và giữ camera tại vị trí gốc
 *   (Req 6.3).
 *
 * Không render mesh hiển thị — trả về `null`.
 *
 * _Requirements: 6.1, 6.2, 6.3, 6.4, 10.2, 10.3_
 */

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";

import {
  computeParallaxTarget,
  lerp,
  type RigBounds,
} from "@/lib/three/cameraRig";

/** Biên độ dịch chuyển camera tối đa (theo mặc định thiết kế). */
const RIG_BOUNDS: RigBounds = { maxOffsetX: 1.2, maxOffsetY: 0.8 };

/** Hệ số nội suy mượt mỗi frame (theo mặc định thiết kế). */
const RIG_LERP_ALPHA = 0.05;

export interface CameraRigProps {
  /**
   * Khi bật Reduced_Motion_Mode: không đăng ký listener và giữ camera ở vị trí
   * gốc, không phản hồi theo con trỏ (Req 6.3).
   */
  reducedMotion: boolean;
}

export function CameraRig({ reducedMotion }: CameraRigProps) {
  const { camera, gl } = useThree();

  /** Vị trí con trỏ chuẩn hóa về `[-1, 1]`. */
  const pointerRef = useRef({ x: 0, y: 0 });
  /** Vị trí camera đang nội suy (offset quanh gốc). */
  const posRef = useRef({ x: 0, y: 0 });

  // Đăng ký listener chuột + chạm trên phần tử cha của canvas, chỉ sau mount
  // client. Bỏ qua hoàn toàn khi Reduced_Motion_Mode bật (Req 6.3).
  useEffect(() => {
    if (reducedMotion) return;
    if (typeof window === "undefined") return;

    const parent = gl.domElement.parentElement;
    if (!parent) return;

    // Chuẩn hóa toạ độ client về `[-1, 1]` dựa trên khung của phần tử cha.
    const normalize = (clientX: number, clientY: number) => {
      const rect = parent.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      pointerRef.current.x = ((clientX - rect.left) / rect.width - 0.5) * 2;
      pointerRef.current.y = -((clientY - rect.top) / rect.height - 0.5) * 2;
    };

    const onPointerMove = (e: PointerEvent) => {
      normalize(e.clientX, e.clientY);
    };

    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      normalize(touch.clientX, touch.clientY);
    };

    parent.addEventListener("pointermove", onPointerMove);
    parent.addEventListener("touchmove", onTouchMove);

    return () => {
      parent.removeEventListener("pointermove", onPointerMove);
      parent.removeEventListener("touchmove", onTouchMove);
    };
  }, [gl, reducedMotion]);

  useFrame(() => {
    // Khi giảm chuyển động: giữ camera tại vị trí gốc (offset 0), không phản hồi.
    if (reducedMotion) return;

    const target = computeParallaxTarget(pointerRef.current, RIG_BOUNDS);
    posRef.current.x = lerp(posRef.current.x, target.x, RIG_LERP_ALPHA);
    posRef.current.y = lerp(posRef.current.y, target.y, RIG_LERP_ALPHA);

    // Cập nhật vị trí camera, giữ nguyên khoảng cách z gốc.
    camera.position.x = posRef.current.x;
    camera.position.y = posRef.current.y;
    camera.lookAt(0, 0, 0);
  });

  return null;
}

export default CameraRig;
