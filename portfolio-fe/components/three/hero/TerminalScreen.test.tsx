/**
 * Render và edge-case test cho `TerminalScreen` — màn hình terminal/code phát
 * sáng đặt trên bề mặt màn hình của Desktop_Model trong Hero.
 *
 * Dùng `@react-three/test-renderer` để dựng component R3F headless (cung cấp
 * camera/size mặc định để `useThree`/`useFrame` hoạt động). Component được render
 * trực tiếp (không bọc `<Canvas>` riêng) đúng như cách nó được tiêu thụ bên
 * trong `SceneCanvas`/`HeroScene` (mount từ `DesktopModel` sau khi nạp xong —
 * Req 5.1).
 *
 * Chiến lược mock (tối thiểu, có chủ đích):
 *  - drei `<Text>` (troika-three-text) cần web worker + tải font để sinh glyph
 *    SDF, không chạy được trong jsdom (treo vô hạn). Vì vậy thay bằng một plane
 *    mesh thật chuyển tiếp chữ + màu + vị trí qua `userData` (giống
 *    `CubeLogo.test.tsx`). Đây là thay thế cơ chế render glyph của bên thứ ba,
 *    KHÔNG giả lập logic của chính `TerminalScreen`.
 *  - `TextureLoader` của three (dùng ở nhánh tier `low`) tải ảnh qua mạng nên
 *    không tất định trong jsdom. Thay bằng loader điều khiển được (success /
 *    fail / pending) để kiểm cả nhánh texture thành công lẫn nhánh lỗi tải →
 *    panel đen (Req 5.6, 5.8). Chỉ `TextureLoader` được thay; mọi lớp three còn
 *    lại (Mesh, Material, blending…) giữ nguyên để fiber render thật.
 *
 * Bao phủ các yêu cầu:
 * - 5.1: render trên bề mặt màn hình (anchor) khi Desktop_Model tải xong.
 * - 5.2: panel nền đen opacity 0.7–1.0 + chữ code màu cyan/xanh lá.
 * - 5.4: hiệu ứng phát sáng (glow) bao quanh vùng màn hình.
 * - 5.6: tier `low` → texture tĩnh + tắt glow.
 * - 5.7: phần tử trang trí, không nhận tiêu điểm bàn phím (không phơi DOM focus).
 * - 5.8: lỗi tải texture → panel đen đồng nhất không chữ, giữ nguyên bố cục.
 *
 * _Requirements: 5.1, 5.2, 5.4, 5.6, 5.7, 5.8_
 */

import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ReactThreeTestRenderer from "@react-three/test-renderer";
import { AdditiveBlending, Color, Texture } from "three";
import * as axeMatchers from "vitest-axe/matchers";
import { axe } from "vitest-axe";
import "vitest-axe/extend-expect";

import { PALETTE } from "@/lib/three/palette";

// Trạng thái điều khiển loader (hoisted để dùng trong factory của vi.mock).
const { textureLoader } = vi.hoisted(() => ({
  textureLoader: { mode: "success" as "success" | "fail" | "pending" },
}));

// Thay drei `<Text>` (troika) bằng plane mesh thật chuyển tiếp chữ + màu + vị trí.
vi.mock("@react-three/drei", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@react-three/drei")>();
  return {
    ...actual,
    Text: ({
      children,
      position,
      color,
    }: {
      children?: ReactNode;
      position?: [number, number, number];
      color?: string;
    }) => {
      const letter = Array.isArray(children)
        ? (children.find((c) => typeof c === "string") as string | undefined)
        : typeof children === "string"
          ? children
          : undefined;
      return (
        <mesh
          position={position}
          userData={{ troikaText: letter, troikaColor: color }}
        >
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial />
        </mesh>
      );
    },
  };
});

// Thay `TextureLoader` của three bằng loader điều khiển được (success/fail/pending).
// Giữ nguyên mọi export khác để fiber/three render thật.
vi.mock("three", async (importOriginal) => {
  const actual = await importOriginal<typeof import("three")>();
  class MockTextureLoader {
    load(
      _url: string,
      onLoad: (tex: Texture) => void,
      _onProgress: undefined,
      onError: (err: unknown) => void,
    ) {
      if (textureLoader.mode === "success") {
        onLoad(new actual.Texture());
      } else if (textureLoader.mode === "fail") {
        onError(new Error("texture load failed"));
      }
      // "pending": không gọi callback nào (texture giữ null → panel đen).
    }
  }
  return { ...actual, TextureLoader: MockTextureLoader };
});

// vitest-axe 0.1.0: đăng ký matcher thủ công ở runtime.
expect.extend(axeMatchers);

import { TerminalScreen } from "./TerminalScreen";

/** Anchor mẫu: plane khớp bề mặt màn hình của Desktop_Model. */
const ANCHOR = {
  position: [0, 1, 0.5] as [number, number, number],
  size: [1.6, 1.0] as [number, number],
};

type Renderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>;

interface MaterialLike {
  type: string;
  color?: Color;
  map?: unknown;
  opacity?: number;
  transparent?: boolean;
  blending?: number;
}

interface MeshInstance {
  material: MaterialLike;
  userData?: { troikaText?: unknown; troikaColor?: unknown };
}

/** Lấy material three.js thực của một test-renderer mesh node. */
function materialOf(node: { instance: unknown }): MaterialLike {
  return (node.instance as MeshInstance).material;
}

/** Tìm panel nền đen: màu đen, trong suốt, không phải lớp glow additive. */
function findBlackPanel(renderer: Renderer) {
  return renderer.scene.findAllByType("Mesh").find((m) => {
    const mat = materialOf(m);
    return (
      mat.color?.getHexString() === "000000" &&
      mat.transparent === true &&
      mat.blending !== AdditiveBlending
    );
  });
}

afterEach(() => {
  textureLoader.mode = "success";
});

describe("TerminalScreen — dynamic mode (tier high/medium)", () => {
  it("renders a black panel anchored to the monitor surface with opacity in [0.7, 1.0] (Req 5.1, 5.2)", async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <TerminalScreen reducedMotion={false} tier="high" anchor={ANCHOR} />,
    );

    // Nhóm gốc đặt tại vị trí bề mặt màn hình (anchor) — Req 5.1.
    const groups = renderer.scene.findAllByType("Group");
    const anchored = groups.find((g) => {
      const p = (g.instance as unknown as { position: { x: number; y: number; z: number } })
        .position;
      return p.x === ANCHOR.position[0] && p.y === ANCHOR.position[1] && p.z === ANCHOR.position[2];
    });
    expect(anchored).toBeDefined();

    // Panel nền đen với opacity hợp lệ — Req 5.2.
    const panel = findBlackPanel(renderer);
    expect(panel).toBeDefined();
    const mat = materialOf(panel!);
    expect(mat.opacity).toBeGreaterThanOrEqual(0.7);
    expect(mat.opacity).toBeLessThanOrEqual(1.0);

    await ReactThreeTestRenderer.act(async () => renderer.unmount());
  });

  it("renders code text only in cyan or green accent colors (Req 5.2)", async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <TerminalScreen reducedMotion={false} tier="high" anchor={ANCHOR} />,
    );

    const CYAN = PALETTE.cyan; // #22d3ee
    const GREEN = "#22c55e";

    const textColors = renderer.scene
      .findAllByType("Mesh")
      .map((m) => (m.instance as unknown as MeshInstance).userData?.troikaColor)
      .filter((c): c is string => typeof c === "string");

    // Có chữ code và mọi màu chữ đều là cyan hoặc xanh lá.
    expect(textColors.length).toBeGreaterThan(0);
    for (const color of textColors) {
      expect([CYAN, GREEN]).toContain(color);
    }
    // Cả hai màu nhấn đều xuất hiện.
    expect(textColors).toContain(CYAN);
    expect(textColors).toContain(GREEN);

    await ReactThreeTestRenderer.act(async () => renderer.unmount());
  });

  it("applies a glow effect (additive cyan plane) around the screen area (Req 5.4)", async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <TerminalScreen reducedMotion={false} tier="high" anchor={ANCHOR} />,
    );

    const glow = renderer.scene.findAllByType("Mesh").find((m) => {
      const mat = materialOf(m);
      return mat.blending === AdditiveBlending;
    });
    expect(glow).toBeDefined();
    // Glow dùng màu cyan của Accent_Palette và sáng hơn 0.
    const mat = materialOf(glow!);
    expect(mat.color?.getHexString()).toBe(new Color(PALETTE.cyan).getHexString());
    expect(mat.opacity).toBeGreaterThan(0);

    await ReactThreeTestRenderer.act(async () => renderer.unmount());
  });
});

describe("TerminalScreen — low tier (static texture)", () => {
  it("displays a static texture and turns the glow off (Req 5.6)", async () => {
    textureLoader.mode = "success";

    const renderer = await ReactThreeTestRenderer.create(
      <TerminalScreen reducedMotion={false} tier="low" anchor={ANCHOR} />,
    );

    // Không có chữ động (drei Text) ở tier low — Req 5.6.
    const textNodes = renderer.scene
      .findAllByType("Mesh")
      .filter((m) => typeof (m.instance as unknown as MeshInstance).userData?.troikaColor === "string");
    expect(textNodes.length).toBe(0);

    // Không có lớp glow additive — glow tắt — Req 5.6.
    const glow = renderer.scene.findAllByType("Mesh").find((m) => {
      return materialOf(m).blending === AdditiveBlending;
    });
    expect(glow).toBeUndefined();

    // Mesh hiển thị bằng texture tĩnh (material.map được gán).
    const textured = renderer.scene
      .findAllByType("Mesh")
      .find((m) => materialOf(m).map != null);
    expect(textured).toBeDefined();
    expect((materialOf(textured!).map as Texture)).toBeInstanceOf(Texture);

    await ReactThreeTestRenderer.act(async () => renderer.unmount());
  });

  it("falls back to a uniform black panel without text when the texture fails to load (Req 5.8)", async () => {
    textureLoader.mode = "fail";

    const renderer = await ReactThreeTestRenderer.create(
      <TerminalScreen reducedMotion={false} tier="low" anchor={ANCHOR} />,
    );

    // Không có texture map (tải thất bại).
    const textured = renderer.scene
      .findAllByType("Mesh")
      .find((m) => materialOf(m).map != null);
    expect(textured).toBeUndefined();

    // Không có chữ — panel đen đồng nhất.
    const textNodes = renderer.scene
      .findAllByType("Mesh")
      .filter((m) => typeof (m.instance as unknown as MeshInstance).userData?.troikaColor === "string");
    expect(textNodes.length).toBe(0);

    // Panel đen đồng nhất, opacity trong [0.7, 1.0], giữ nguyên bố cục (mesh tồn tại).
    const panel = findBlackPanel(renderer);
    expect(panel).toBeDefined();
    const mat = materialOf(panel!);
    expect(mat.opacity).toBeGreaterThanOrEqual(0.7);
    expect(mat.opacity).toBeLessThanOrEqual(1.0);

    await ReactThreeTestRenderer.act(async () => renderer.unmount());
  });

  it("shows a black panel while the texture is still loading (Req 5.8 layout stable)", async () => {
    textureLoader.mode = "pending";

    const renderer = await ReactThreeTestRenderer.create(
      <TerminalScreen reducedMotion={false} tier="low" anchor={ANCHOR} />,
    );

    // Chưa nạp xong → panel đen, giữ nguyên bố cục.
    const panel = findBlackPanel(renderer);
    expect(panel).toBeDefined();
    const textured = renderer.scene
      .findAllByType("Mesh")
      .find((m) => materialOf(m).map != null);
    expect(textured).toBeUndefined();

    await ReactThreeTestRenderer.act(async () => renderer.unmount());
  });
});

describe("TerminalScreen — decorative, non-focusable (Req 5.7)", () => {
  it("exposes no focusable DOM and produces no accessibility violations (Req 5.7)", async () => {
    // `TerminalScreen` là sub-scene R3F thuần (chỉ chứa mesh/group/text-texture),
    // không phơi bất kỳ phần tử DOM nào — do đó không nhận tiêu điểm bàn phím.
    // Cảnh chứa nó (SceneCanvas) đã mang aria-hidden (xem DesktopModel.a11y.test).
    const renderer = await ReactThreeTestRenderer.create(
      <TerminalScreen reducedMotion={false} tier="high" anchor={ANCHOR} />,
    );

    // Headless renderer không tạo DOM → không có phần tử focusable nào được phơi.
    expect(
      document.body.querySelectorAll(
        "a, button, input, select, textarea, [tabindex]",
      ).length,
    ).toBe(0);

    // Không có vi phạm tiếp cận nào trong DOM (sub-scene không tiêm DOM).
    const results = await axe(document.body);
    expect(results).toHaveNoViolations();

    // Mọi đối tượng được render đều là primitive 3D trang trí (Group/Mesh),
    // không có node nào mang tiêu điểm bàn phím.
    const focusable = renderer.scene.findAll((node) => {
      const ud = (node.instance as unknown as MeshInstance).userData as
        | { tabIndex?: unknown }
        | undefined;
      return ud?.tabIndex != null;
    });
    expect(focusable.length).toBe(0);

    await ReactThreeTestRenderer.act(async () => renderer.unmount());
  });
});
