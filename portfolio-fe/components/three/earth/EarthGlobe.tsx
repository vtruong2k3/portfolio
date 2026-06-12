"use client";

/**
 * EarthGlobe — quả Địa Cầu 3D dựng-bằng-mã, nền phụ trang trí (tùy chọn) cho
 * Contact Section / Footer.
 *
 * Component R3F (sub-scene) này render BÊN TRONG một `<Canvas>` (qua
 * `SceneCanvas`) chứ KHÔNG tự tạo `<Canvas>` riêng — giống `CubeLogo`,
 * `DesktopModel`, `TechIconCard`. Hành vi chính:
 *
 * - **Hình cầu dựng-bằng-mã + texture**: dùng `sphereGeometry` và texture Địa
 *   Cầu nạp từ `textures/earth.jpg` (Req 11.1). Texture được nạp bằng
 *   `TextureLoader` qua effect (KHÔNG Suspense) để lỗi tải không ném ra ngoài.
 *
 * - **Xoay chậm theo delta-time (độc lập FPS)**: xoay quanh trục đứng (Y) bằng
 *   `advanceRotation` với tốc độ `EARTH_ROTATION_DEG_PER_SEC` (1°/giây, nằm
 *   trong dải [0.5, 2]°/s — Req 11.1). Khi Reduced_Motion_Mode bật, tốc độ về 0
 *   nên quả cầu đứng yên (Req 11.4).
 *
 * - **Glow xanh nhẹ**: một lớp cầu glow phía sau dùng màu blue thuộc PALETTE với
 *   `emissive`/độ mờ thấp + hòa trộn cộng, đủ tinh tế để KHÔNG kéo tương phản
 *   văn bản phía trên/liền kề xuống dưới ngưỡng WCAG AA (Req 11.2). Cường độ
 *   glow được giữ thấp và có thể giảm thêm ở tier `low`.
 *
 * - **Trang trí, không nhận con trỏ**: component không gắn bất kỳ handler con
 *   trỏ nào (decorative). Thuộc tính `aria-hidden`, `pointer-events: none` và
 *   giới hạn kích thước ≤ 40% viewport được áp ở tầng container `SceneCanvas`
 *   khi tích hợp (Task 18.2 — Req 11.3, 11.6), giống cách `DesktopModel` dựa vào
 *   `aria-hidden` của `SceneCanvas`.
 *
 * - **Ẩn khi lỗi**: nếu texture Địa Cầu tải thất bại, component render `null`
 *   (ẩn quả cầu) và gọi `onError` để tầng tích hợp giữ nguyên nền tĩnh hiện có,
 *   KHÔNG hiển thị lỗi cho người dùng (Req 11.7). Trường hợp WebGL không khả
 *   dụng được `SceneCanvas` xử lý sẵn (fallback `null` khi tích hợp).
 *
 * _Requirements: 11.1, 11.2, 11.3, 11.4, 11.6, 11.7_
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BackSide,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  type Group,
} from "three";

import { advanceRotation } from "@/lib/three/animation";
import { EARTH_ROTATION_DEG_PER_SEC } from "@/lib/three/earth";
import { PALETTE } from "@/lib/three/palette";
import type { GraphicsTier } from "@/lib/three/graphicsTier";

/** Đường dẫn texture Địa Cầu mặc định (Req 11.1). */
const DEFAULT_TEXTURE_URL = "/textures/earth.jpg";

/** Bán kính quả cầu (đơn vị thế giới). Tỉ lệ tổng thể do `scale` điều chỉnh. */
const SPHERE_RADIUS = 1;

/** Số phân đoạn lưới cầu — đủ mượt nhưng vẫn nhẹ cho nền phụ trang trí. */
const SPHERE_SEGMENTS = 48;

/**
 * Giới hạn cấu hình cho glow xanh nhẹ (Req 11.2).
 *
 * - `default`: độ mờ lớp glow ở tier `high`/`medium` — giữ THẤP để không phá
 *   tương phản WCAG AA của văn bản phía trên/liền kề.
 * - `low`: giảm thêm ở tier `low`.
 * - `scale`: lớp cầu glow lớn hơn quả cầu một chút để tạo quầng sáng quanh viền.
 */
const GLOW = {
  default: 0.18,
  low: 0.1,
  scale: 1.08,
} as const;

export interface EarthGlobeProps {
  /** Khi Reduced_Motion_Mode bật, quả cầu dừng xoay và giữ trạng thái tĩnh. */
  reducedMotion: boolean;
  /** Graphics_Tier hiện tại; ở `low` glow bị giảm thêm. */
  tier: GraphicsTier;
  /** Tỉ lệ tổng thể của quả cầu (đơn vị thế giới). Mặc định `1`. */
  scale?: number;
  /** Đường dẫn texture Địa Cầu. Mặc định `/textures/earth.jpg`. */
  textureUrl?: string;
  /** Báo lỗi tải texture để tầng tích hợp ẩn quả cầu, giữ nền tĩnh (Req 11.7). */
  onError?: (error: unknown) => void;
}

export function EarthGlobe({
  reducedMotion,
  tier,
  scale = 1,
  textureUrl = DEFAULT_TEXTURE_URL,
  onError,
}: EarthGlobeProps) {
  const groupRef = useRef<Group>(null);
  /** Góc xoay tích lũy quanh trục Y theo delta-time (độc lập FPS). */
  const angleRef = useRef(0);

  /** Texture Địa Cầu đã nạp, hoặc `null` khi chưa nạp xong/thất bại. */
  const [texture, setTexture] = useState<Texture | null>(null);
  /** Cờ tải texture thất bại → ẩn quả cầu (Req 11.7). */
  const [failed, setFailed] = useState(false);

  // Nạp texture bằng TextureLoader với xử lý lỗi tường minh (Req 11.1, 11.7).
  // Dùng effect (không Suspense) để lỗi tải không ném ra ngoài làm sập cảnh.
  useEffect(() => {
    let cancelled = false;
    let loaded: Texture | null = null;
    setTexture(null);
    setFailed(false);

    const loader = new TextureLoader();
    loader.load(
      textureUrl,
      (tex) => {
        if (cancelled) {
          tex.dispose();
          return;
        }
        tex.colorSpace = SRGBColorSpace;
        loaded = tex;
        setTexture(tex);
      },
      undefined,
      (error) => {
        if (cancelled) return;
        setFailed(true);
        onError?.(error);
      },
    );

    return () => {
      cancelled = true;
      loaded?.dispose();
    };
  }, [textureUrl, onError]);

  // Tốc độ xoay (rad/s): bằng 0 khi reduced motion (Req 11.4); ngược lại đổi từ
  // EARTH_ROTATION_DEG_PER_SEC (°/s, trong dải [0.5, 2]) sang rad/s (Req 11.1).
  const speedRadPerSec = useMemo(
    () =>
      reducedMotion ? 0 : EARTH_ROTATION_DEG_PER_SEC * (Math.PI / 180),
    [reducedMotion],
  );

  // Độ mờ lớp glow trong giới hạn cấu hình; giảm thêm ở tier `low` (Req 11.2).
  const glowOpacity = useMemo(
    () => (tier === "low" ? GLOW.low : GLOW.default),
    [tier],
  );

  useFrame((_state, delta) => {
    const group = groupRef.current;
    if (!group) return;
    // Xoay tích lũy quanh trục đứng (Y) theo delta-time (độc lập FPS — Req 11.1).
    // Khi reduced motion, `speedRadPerSec === 0` nên góc giữ nguyên (Req 11.4).
    angleRef.current = advanceRotation(angleRef.current, delta, speedRadPerSec);
    group.rotation.y = angleRef.current;
  });

  // Ẩn quả cầu khi texture lỗi (Req 11.7) hoặc chưa nạp xong (tránh hiện cầu
  // trống không texture). Tầng tích hợp giữ nguyên nền tĩnh hiện có.
  if (failed || !texture) {
    return null;
  }

  return (
    <group ref={groupRef} scale={scale}>
      {/* Lớp cầu glow xanh nhẹ phía ngoài: dựng-bằng-mã, hòa trộn cộng, độ mờ
          thấp để KHÔNG phá tương phản WCAG AA của văn bản (Req 11.2). Vẽ mặt
          trong (BackSide) để tạo quầng sáng quanh viền quả cầu. */}
      <mesh scale={GLOW.scale}>
        <sphereGeometry args={[SPHERE_RADIUS, SPHERE_SEGMENTS, SPHERE_SEGMENTS]} />
        <meshBasicMaterial
          color={PALETTE.blue}
          transparent
          opacity={glowOpacity}
          blending={AdditiveBlending}
          side={BackSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Quả cầu Địa Cầu: hình cầu dựng-bằng-mã mang texture earth.jpg, kèm
          điểm nhấn phát sáng xanh nhẹ (emissive) thuộc PALETTE (Req 11.1, 11.2). */}
      <mesh>
        <sphereGeometry args={[SPHERE_RADIUS, SPHERE_SEGMENTS, SPHERE_SEGMENTS]} />
        <meshStandardMaterial
          map={texture}
          emissive={PALETTE.blue}
          emissiveIntensity={glowOpacity}
          roughness={0.85}
          metalness={0.1}
        />
      </mesh>
    </group>
  );
}

export default EarthGlobe;
