"use client";

/**
 * TerminalScreen — màn hình terminal/code phát sáng đặt trên bề mặt màn hình
 * của Desktop_Model trong Hero.
 *
 * Component R3F (sub-scene) này render BÊN TRONG một `<Canvas>` (qua
 * `SceneCanvas`/`HeroScene`, mount từ `DesktopModel` sau khi nạp xong) chứ KHÔNG
 * tự tạo `<Canvas>` riêng. Hành vi chính:
 *
 * - **Panel nền đen + chữ code cyan/xanh lá**: một mặt phẳng (`planeGeometry`)
 *   khớp bề mặt màn hình của Desktop_Model qua `anchor`, nền đen với độ mờ
 *   (opacity) trong khoảng 0.7–1.0, và các dòng "code" màu cyan (#22d3ee) /
 *   xanh lá render bằng drei `<Text>` (Req 5.2).
 *
 * - **Con trỏ nhấp nháy tất định**: dùng hàm thuần `cursorVisible(elapsedSec,
 *   periodSec, reduced)` (`lib/three/terminal.ts`) với chu kỳ trong khoảng
 *   0.5–1.0s khi Reduced_Motion_Mode tắt (Req 5.3). Khi Reduced_Motion_Mode
 *   bật, `cursorVisible` trả về hằng số nên con trỏ và nội dung giữ tĩnh
 *   (Req 5.5).
 *
 * - **Glow 4–16px**: vùng màn hình phát sáng nhẹ bằng emissive/additive (được
 *   Bloom ở pipeline hậu kỳ khuếch đại). Bán kính glow nằm trong [4, 16]px
 *   (`GLOW.px`) (Req 5.4).
 *
 * - **Tier `low` → texture tĩnh, tắt glow**: ở Graphics_Tier `low`, màn hình
 *   hiển thị bằng texture tĩnh `textures/terminal-screen.png` thay cho chữ động
 *   và tắt hiệu ứng phát sáng (Req 5.6).
 *
 * - **Trang trí, không focus**: cảnh chứa component này đã mang
 *   `aria-hidden="true"` và các đối tượng 3D không thuộc tab order DOM (Req 5.7).
 *
 * - **Lỗi tải → panel đen đồng nhất**: nếu texture (tier `low`) tải thất bại,
 *   màn hình hiển thị một panel nền đen đồng nhất không chữ, giữ nguyên bố cục
 *   cảnh và không làm gián đoạn Desktop_Model (Req 5.8).
 *
 * _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_
 */

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import {
  AdditiveBlending,
  DoubleSide,
  SRGBColorSpace,
  type Mesh,
  Texture,
  TextureLoader,
} from "three";

import { cursorVisible } from "@/lib/three/terminal";
import { PALETTE } from "@/lib/three/palette";
import type { GraphicsTier } from "@/lib/three/graphicsTier";

/** Đường dẫn texture tĩnh dùng cho tier `low` (Req 5.6). */
const STATIC_TEXTURE_URL = "/textures/terminal-screen.png";

/** Độ mờ panel nền đen — trong khoảng cho phép [0.7, 1.0] (Req 5.2). */
const PANEL_OPACITY = 0.85;

/** Chu kỳ nhấp nháy con trỏ (giây) — trong khoảng [0.5, 1.0] (Req 5.3). */
const CURSOR_PERIOD_SEC = 0.8;

/** Màu xanh lá cho chữ code (bổ sung cyan từ Accent_Palette) (Req 5.2). */
const CODE_GREEN = "#22c55e";

/**
 * Giới hạn cấu hình hiệu ứng phát sáng (glow) quanh vùng màn hình.
 *
 * - `px`: bán kính glow (pixel), trong khoảng [4, 16] (Req 5.4).
 * - `intensity`: cường độ emissive/additive ở tier `high`/`medium`.
 * - `off`: tắt glow ở tier `low` (Req 5.6).
 */
const GLOW = {
  px: 8,
  intensity: 0.5,
  off: 0,
} as const;

/**
 * Các dòng "code" mẫu hiển thị trên màn hình. Mỗi phần tử kèm màu (cyan hoặc
 * xanh lá) theo Art_Direction (Req 5.2). Nội dung thuần trang trí.
 */
const CODE_LINES: ReadonlyArray<{ text: string; color: string }> = [
  { text: "$ npm run dev", color: PALETTE.cyan },
  { text: "> portfolio@1.0.0 dev", color: CODE_GREEN },
  { text: "ready - started server", color: CODE_GREEN },
  { text: "const dev = () => build();", color: PALETTE.cyan },
];

export interface TerminalScreenProps {
  /** Khi bật Reduced_Motion_Mode, con trỏ/nội dung giữ tĩnh (Req 5.5). */
  reducedMotion: boolean;
  /** Graphics_Tier hiện tại; ở `low` dùng texture tĩnh + tắt glow (Req 5.6). */
  tier: GraphicsTier;
  /**
   * Vị trí và kích thước plane khớp bề mặt màn hình của Desktop_Model.
   * `position` theo hệ tọa độ thế giới (đặt trùng bề mặt màn hình), `size` là
   * [chiều rộng, chiều cao] của plane.
   */
  anchor: { position: [number, number, number]; size: [number, number] };
}

/**
 * TerminalScreenStatic — chế độ tier `low`: hiển thị texture tĩnh, tắt glow.
 *
 * Nạp `textures/terminal-screen.png` bằng `TextureLoader` với xử lý lỗi tường
 * minh (không Suspense) để lỗi tải không ném ra ngoài. Khi tải thất bại, hiển
 * thị panel đen đồng nhất, giữ nguyên bố cục (Req 5.6, 5.8).
 */
function TerminalScreenStatic({
  anchor,
}: {
  anchor: TerminalScreenProps["anchor"];
}) {
  const [texture, setTexture] = useState<Texture | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let loaded: Texture | null = null;
    setTexture(null);
    setFailed(false);

    const loader = new TextureLoader();
    loader.load(
      STATIC_TEXTURE_URL,
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
  }, []);

  return (
    <mesh position={anchor.position}>
      <planeGeometry args={anchor.size} />
      {texture && !failed ? (
        // Texture tĩnh, glow tắt (vật liệu unlit) — Req 5.6.
        <meshBasicMaterial map={texture} toneMapped={false} side={DoubleSide} />
      ) : (
        // Panel đen đồng nhất khi chưa nạp/thất bại — Req 5.8.
        <meshBasicMaterial
          color="#000000"
          transparent
          opacity={PANEL_OPACITY}
          side={DoubleSide}
        />
      )}
    </mesh>
  );
}

/**
 * TerminalScreenDynamic — chế độ tier `high`/`medium`: panel đen + chữ code
 * cyan/xanh lá + con trỏ nhấp nháy + glow.
 */
function TerminalScreenDynamic({
  reducedMotion,
  anchor,
}: {
  reducedMotion: boolean;
  anchor: TerminalScreenProps["anchor"];
}) {
  const cursorRef = useRef<Mesh>(null);
  /** Trạng thái hiện/ẩn con trỏ ở frame trước (để chỉ cập nhật khi đổi). */
  const lastVisibleRef = useRef<boolean>(true);

  const [width, height] = anchor.size;

  // Bố trí các dòng code theo chiều dọc trong vùng màn hình.
  const lineHeight = height / (CODE_LINES.length + 1);
  const fontSize = lineHeight * 0.5;
  const leftX = -width / 2 + width * 0.06;
  const topY = height / 2 - lineHeight;

  // Vị trí con trỏ: ngay sau dòng code cuối cùng.
  const cursorLineIndex = CODE_LINES.length - 1;
  const cursorY = topY - cursorLineIndex * lineHeight;
  const cursorW = fontSize * 0.5;
  const cursorH = fontSize * 0.9;

  // Con trỏ nhấp nháy tất định qua hàm thuần `cursorVisible`. Khi reduced motion
  // bật, hàm trả về hằng số (luôn hiện) nên con trỏ giữ tĩnh (Req 5.3, 5.5).
  useFrame((state) => {
    const cursor = cursorRef.current;
    if (!cursor) return;
    const visible = cursorVisible(
      state.clock.elapsedTime,
      CURSOR_PERIOD_SEC,
      reducedMotion,
    );
    if (visible !== lastVisibleRef.current) {
      lastVisibleRef.current = visible;
      cursor.visible = visible;
    }
  });

  return (
    <group position={anchor.position}>
      {/* Glow phía sau: phát sáng cyan additive, được Bloom khuếch đại; biểu
          diễn vùng glow quanh màn hình trong [4, 16]px (Req 5.4). */}
      <mesh position={[0, 0, -0.002]} scale={1.04}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial
          color={PALETTE.cyan}
          transparent
          opacity={GLOW.intensity}
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
          side={DoubleSide}
        />
      </mesh>

      {/* Panel nền đen, opacity trong [0.7, 1.0] (Req 5.2). */}
      <mesh position={[0, 0, -0.001]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial
          color="#000000"
          transparent
          opacity={PANEL_OPACITY}
          side={DoubleSide}
        />
      </mesh>

      {/* Các dòng code màu cyan/xanh lá (Req 5.2). Bright + toneMapped=false để
          Bloom tạo glow chữ (Req 5.4). */}
      {CODE_LINES.map((line, i) => (
        <Text
          key={i}
          position={[leftX, topY - i * lineHeight, 0.001]}
          fontSize={fontSize}
          color={line.color}
          anchorX="left"
          anchorY="middle"
          maxWidth={width * 0.9}
        >
          {line.text}
          <meshBasicMaterial color={line.color} toneMapped={false} side={DoubleSide} />
        </Text>
      ))}

      {/* Con trỏ nhấp nháy: khối nhỏ màu cyan, hiện/ẩn theo `cursorVisible`. */}
      <mesh ref={cursorRef} position={[leftX, cursorY, 0.001]}>
        <planeGeometry args={[cursorW, cursorH]} />
        <meshBasicMaterial color={PALETTE.cyan} toneMapped={false} side={DoubleSide} />
      </mesh>
    </group>
  );
}

export function TerminalScreen({
  reducedMotion,
  tier,
  anchor,
}: TerminalScreenProps) {
  // Tier `low`: texture tĩnh + tắt glow (Req 5.6). Ngược lại: chế độ động.
  if (tier === "low") {
    return <TerminalScreenStatic anchor={anchor} />;
  }

  return <TerminalScreenDynamic reducedMotion={reducedMotion} anchor={anchor} />;
}

export default TerminalScreen;
