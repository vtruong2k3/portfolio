"use client";

/**
 * TechIconCard — một thẻ biểu tượng công nghệ đơn lẻ trong Tech_Icon_Orbit.
 *
 * Component R3F (sub-scene) này render BÊN TRONG một `<Canvas>` (qua
 * `SceneCanvas`/`TechIconOrbit`) chứ KHÔNG tự tạo `<Canvas>` riêng. Mỗi thẻ là
 * một mặt phẳng nhỏ mang một biểu tượng công nghệ (SVG nạp từ `public/icons/`)
 * được bọc trong drei `<Billboard>` nên **luôn hướng mặt về phía camera** với
 * độ lệch góc không đáng kể (Req 7.4 — đảm bảo ≤ 1°). Logic billboard thuần
 * (`billboardNormal`/`angleBetweenDeg` trong `lib/three/orbit.ts`) được dùng cho
 * property-test; ở runtime drei `<Billboard>` đảm nhận việc định hướng.
 *
 * Vị trí thẻ (`basePosition`) do `TechIconOrbit` tính sẵn bằng hàm thuần
 * `computeOrbitPosition`; thẻ này chỉ áp kết quả, không tự tính quỹ đạo.
 *
 * Tương tác hover (Req 7.7, 7.8): khi con trỏ di vào, thẻ hiển thị **tên kỹ
 * năng** và **tăng cường phát sáng**; khi rời đi, ẩn nhãn và khôi phục mức phát
 * sáng mặc định. Cả hai chuyển tiếp hoàn tất trong vòng 200ms nhờ một bộ nội
 * suy tuyến tính theo delta-time (`GLOW_RAMP_SEC`).
 *
 * Tải SVG thất bại (Req 7.11): nếu texture không nạp được, thẻ hiển thị một
 * **biểu tượng dự phòng** (mặt phẳng nhấn màu Accent_Palette kèm chữ cái đầu của
 * tên kỹ năng) và **giữ nguyên vị trí quỹ đạo**, không làm gián đoạn các thẻ
 * khác.
 *
 * Trang trí (Req 12.1, 12.2): thẻ nằm trong cảnh `aria-hidden` và không nhận
 * tiêu điểm bàn phím (các đối tượng 3D không thuộc tab order của DOM).
 *
 * _Requirements: 7.4, 7.7, 7.8, 7.11, 7.12_
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, Text } from "@react-three/drei";
import {
  AdditiveBlending,
  DoubleSide,
  SRGBColorSpace,
  type Mesh,
  type MeshBasicMaterial,
  Texture,
  TextureLoader,
} from "three";

import { PALETTE } from "@/lib/three/palette";
import type { Vec3 } from "@/lib/three/orbit";

/** Cạnh của mặt phẳng biểu tượng (đơn vị thế giới). */
const ICON_SIZE = 0.6;

/**
 * Giới hạn cấu hình cho hiệu ứng phát sáng (glow) của thẻ.
 *
 * - `base`: cường độ glow ở trạng thái mặc định.
 * - `hover`: cường độ glow khi con trỏ di vào (được "tăng cường" — Req 7.7).
 * - `rampSec`: thời gian (giây) để nội suy tuyến tính glow đạt mục tiêu. Đặt
 *   0.2s để mọi chuyển tiếp glow hoàn tất **trong vòng 200ms** (Req 7.7, 7.8).
 */
const GLOW = {
  base: 0.2,
  hover: 0.6,
  rampSec: 0.2,
} as const;

export interface TechIconCardProps {
  /** Đường dẫn biểu tượng SVG, nạp từ `public/icons/` (Req 7.12). */
  iconUrl: string;
  /** Tên kỹ năng tương ứng, hiển thị khi hover (Req 7.7). */
  label: string;
  /** Vị trí gốc trên quỹ đạo, do `computeOrbitPosition` tính sẵn. */
  basePosition: Vec3;
  /** Trạng thái hover (do `TechIconOrbit` điều khiển). */
  hovered: boolean;
  /** Reduced_Motion_Mode (giữ để đồng bộ API với các thẻ; không ảnh hưởng hover). */
  reducedMotion: boolean;
  /** Gọi khi con trỏ di vào thẻ. */
  onHover?: () => void;
  /** Gọi khi con trỏ rời khỏi thẻ. */
  onLeave?: () => void;
}

export function TechIconCard({
  iconUrl,
  label,
  basePosition,
  hovered,
  onHover,
  onLeave,
}: TechIconCardProps) {
  /** Texture biểu tượng đã nạp, hoặc `null` khi chưa nạp/thất bại. */
  const [texture, setTexture] = useState<Texture | null>(null);
  /** Cờ tải SVG thất bại → chuyển sang biểu tượng dự phòng (Req 7.11). */
  const [failed, setFailed] = useState(false);

  const glowMaterialRef = useRef<MeshBasicMaterial>(null);
  const iconMeshRef = useRef<Mesh>(null);
  /** Cường độ glow hiện tại (được nội suy về mục tiêu theo delta-time). */
  const glowRef = useRef<number>(GLOW.base);

  // Nạp SVG bằng TextureLoader với xử lý lỗi tường minh (Req 7.11, 7.12).
  // Dùng effect (không Suspense) để lỗi tải không ném ra ngoài, giữ các thẻ
  // khác tiếp tục render bình thường.
  useEffect(() => {
    let cancelled = false;
    let loaded: Texture | null = null;
    setTexture(null);
    setFailed(false);

    const loader = new TextureLoader();
    loader.load(
      iconUrl,
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
      () => {
        if (!cancelled) setFailed(true);
      },
    );

    return () => {
      cancelled = true;
      loaded?.dispose();
    };
  }, [iconUrl]);

  // Chữ cái đầu của tên kỹ năng cho biểu tượng dự phòng.
  const fallbackLetter = useMemo(
    () => (label.trim().charAt(0) || "?").toUpperCase(),
    [label],
  );

  // Nội suy glow về mục tiêu theo delta-time. Bước tối đa mỗi frame =
  // delta / rampSec * dải, nên glow đạt mục tiêu trong đúng `rampSec` (200ms),
  // độc lập với FPS (Req 7.7, 7.8).
  useFrame((_state, delta) => {
    const target = hovered ? GLOW.hover : GLOW.base;
    const current = glowRef.current;
    const maxStep = (Math.abs(GLOW.hover - GLOW.base) * delta) / GLOW.rampSec;
    const diff = target - current;
    const next =
      Math.abs(diff) <= maxStep ? target : current + Math.sign(diff) * maxStep;
    glowRef.current = next;

    if (glowMaterialRef.current) {
      glowMaterialRef.current.opacity = next;
    }
  });

  const handleOver = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    onHover?.();
  };
  const handleOut = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    onLeave?.();
  };

  return (
    <Billboard position={basePosition} follow>
      {/* Mặt phẳng glow phía sau: phát sáng cyan, hòa trộn cộng (additive), độ
          mờ được nội suy theo trạng thái hover trong 200ms (Req 7.7, 7.8). */}
      <mesh position={[0, 0, -0.01]} scale={1.35} renderOrder={0}>
        <planeGeometry args={[ICON_SIZE, ICON_SIZE]} />
        <meshBasicMaterial
          ref={glowMaterialRef}
          color={PALETTE.cyan}
          transparent
          opacity={GLOW.base}
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
          side={DoubleSide}
        />
      </mesh>

      {/* Biểu tượng: mặt phẳng mang texture SVG khi nạp thành công; ngược lại là
          biểu tượng dự phòng giữ nguyên vị trí (Req 7.11, 7.12). */}
      {texture && !failed ? (
        <mesh
          ref={iconMeshRef}
          renderOrder={1}
          onPointerOver={handleOver}
          onPointerOut={handleOut}
        >
          <planeGeometry args={[ICON_SIZE, ICON_SIZE]} />
          <meshBasicMaterial
            map={texture}
            transparent
            toneMapped={false}
            side={DoubleSide}
          />
        </mesh>
      ) : (
        <group
          renderOrder={1}
          onPointerOver={handleOver}
          onPointerOut={handleOut}
        >
          {/* Biểu tượng dự phòng: tấm nền nhấn màu Accent_Palette + chữ cái đầu. */}
          <mesh>
            <planeGeometry args={[ICON_SIZE, ICON_SIZE]} />
            <meshBasicMaterial
              color={PALETTE.violet}
              transparent
              opacity={0.85}
              toneMapped={false}
              side={DoubleSide}
            />
          </mesh>
          <Text
            position={[0, 0, 0.01]}
            fontSize={ICON_SIZE * 0.5}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
          >
            {fallbackLetter}
            <meshBasicMaterial color="#ffffff" toneMapped={false} side={DoubleSide} />
          </Text>
        </group>
      )}

      {/* Nhãn tên kỹ năng: chỉ hiển thị khi hover (Req 7.7, 7.8). Đặt phía trên
          biểu tượng để không che. */}
      {hovered && (
        <Text
          position={[0, ICON_SIZE * 0.85, 0.02]}
          fontSize={ICON_SIZE * 0.3}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.006}
          outlineColor={PALETTE.cyan}
          renderOrder={2}
        >
          {label}
          <meshBasicMaterial color="#ffffff" toneMapped={false} side={DoubleSide} />
        </Text>
      )}
    </Billboard>
  );
}

export default TechIconCard;
