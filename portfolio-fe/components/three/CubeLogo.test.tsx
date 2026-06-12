/**
 * Render test cho `CubeLogo` — khối lập phương logo 3D dựng-bằng-mã.
 *
 * Dùng `@react-three/test-renderer` để dựng component R3F headless (cung cấp
 * camera/size mặc định để `useThree`/`useFrame` hoạt động). Component được
 * render trực tiếp (không bọc `<Canvas>` riêng) đúng như cách nó được tiêu thụ
 * bên trong `SceneCanvas`/`HeroScene`.
 *
 * drei `<Text>` được hiện thực bằng troika-three-text, vốn cần web worker +
 * tải font để sinh glyph SDF — không thể chạy trong jsdom (nó treo/suspend vô
 * hạn khiến cả cây render rỗng). Vì vậy ta thay drei `<Text>` bằng một stand-in
 * R3F thật (một plane mesh) chuyển tiếp đúng chữ cái + vị trí. Đây là việc thay
 * thế cơ chế render glyph của bên thứ ba (không chạy headless), KHÔNG giả lập
 * logic của chính `CubeLogo`: hình học hộp, gradient vertex-color, vật liệu
 * physical, glow, tỉ lệ theo vai trò và phép quay đều được kiểm tra trên
 * component thật.
 *
 * Bao phủ các yêu cầu:
 * - 6.1: dựng từ `boxGeometry` với vật liệu `meshPhysicalMaterial` (kính/kim loại).
 * - 6.2: gradient cyan→violet trên bề mặt khối (vertex colors).
 * - 6.3: chữ cái cá nhân "T" hiển thị trên một mặt hướng về camera.
 * - 6.5: glow (emissiveIntensity) nằm trong giới hạn cấu hình.
 * - 6.6: ba vai trò tích hợp `hero-bg` | `loading` | `brand` (đổi tỉ lệ khối).
 * - 6.7: Reduced_Motion_Mode → khối dừng xoay, giữ tĩnh.
 * - 6.8: Graphics_Tier `low` → glow bị giảm so với tier khác.
 *
 * _Requirements: 6.1, 6.2, 6.3, 6.5, 6.6, 6.7, 6.8_
 */

import type { ReactNode } from "react";
import { describe, it, expect, vi } from "vitest";
import ReactThreeTestRenderer from "@react-three/test-renderer";
import { Color } from "three";

// Thay drei `<Text>` (troika) bằng một plane mesh thật chuyển tiếp chữ + vị trí.
// Xem chú thích đầu file: troika không render được trong jsdom.
vi.mock("@react-three/drei", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@react-three/drei")>();
  return {
    ...actual,
    Text: ({
      children,
      position,
    }: {
      children?: ReactNode;
      position?: [number, number, number];
    }) => {
      const letter = Array.isArray(children)
        ? (children.find((c) => typeof c === "string") as string | undefined)
        : typeof children === "string"
          ? children
          : undefined;
      return (
        <mesh position={position} userData={{ troikaText: letter }}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial />
        </mesh>
      );
    },
  };
});

import { CubeLogo } from "./CubeLogo";
import { PALETTE } from "@/lib/three/palette";

/** Trần cứng cho cường độ glow theo cấu hình của CubeLogo (Req 6.5). */
const GLOW_MAX = 1.0;

/** Tỉ lệ khối kỳ vọng theo vai trò tích hợp (Req 6.6). */
const ROLE_SCALE = {
  "hero-bg": 2.4,
  loading: 0.8,
  brand: 1.2,
} as const;

interface PhysicalMaterialLike {
  type: string;
  vertexColors: boolean;
  metalness: number;
  roughness: number;
  emissive: Color;
  emissiveIntensity: number;
}

interface MeshInstance {
  geometry: { type: string; attributes: Record<string, unknown> };
  material: PhysicalMaterialLike;
}

type Renderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>;

/** Tìm mesh khối lập phương (geometry = BoxGeometry) trong cảnh đã render. */
function findCubeMesh(renderer: Renderer) {
  const meshes = renderer.scene.findAllByType("Mesh");
  return meshes.find(
    (m) =>
      (m.instance as unknown as MeshInstance).geometry?.type === "BoxGeometry",
  );
}

describe("CubeLogo (render)", () => {
  it("builds a box geometry with a glass/light-metal physical material (Req 6.1)", async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <CubeLogo reducedMotion={false} tier="high" />,
    );

    const cube = findCubeMesh(renderer);
    expect(cube).toBeDefined();

    const instance = cube!.instance as unknown as MeshInstance;
    expect(instance.geometry.type).toBe("BoxGeometry");
    expect(instance.material.type).toBe("MeshPhysicalMaterial");
    // Vật liệu kim loại nhẹ/kính: metalness/roughness là số hợp lệ.
    expect(typeof instance.material.metalness).toBe("number");
    expect(typeof instance.material.roughness).toBe("number");

    await ReactThreeTestRenderer.act(async () => renderer.unmount());
  });

  it("applies a cyan→violet gradient via per-vertex colors (Req 6.2)", async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <CubeLogo reducedMotion={false} tier="high" />,
    );

    const cube = findCubeMesh(renderer);
    const instance = cube!.instance as unknown as MeshInstance;

    // Gradient dựng bằng vertex colors → geometry phải có attribute "color" và
    // material bật `vertexColors`.
    expect(instance.geometry.attributes.color).toBeDefined();
    expect(instance.material.vertexColors).toBe(true);

    // Các đỉnh phải trải giữa cyan (đáy) và violet (đỉnh) — không đơn sắc.
    const colorAttr = instance.geometry.attributes.color as {
      count: number;
      getX: (i: number) => number;
      getY: (i: number) => number;
      getZ: (i: number) => number;
    };
    const cyan = new Color(PALETTE.cyan);
    const violet = new Color(PALETTE.violet);
    let sawCyan = false;
    let sawViolet = false;
    for (let i = 0; i < colorAttr.count; i += 1) {
      const r = colorAttr.getX(i);
      const g = colorAttr.getY(i);
      const b = colorAttr.getZ(i);
      if (
        Math.abs(r - cyan.r) < 1e-3 &&
        Math.abs(g - cyan.g) < 1e-3 &&
        Math.abs(b - cyan.b) < 1e-3
      ) {
        sawCyan = true;
      }
      if (
        Math.abs(r - violet.r) < 1e-3 &&
        Math.abs(g - violet.g) < 1e-3 &&
        Math.abs(b - violet.b) < 1e-3
      ) {
        sawViolet = true;
      }
    }
    expect(sawCyan).toBe(true);
    expect(sawViolet).toBe(true);

    await ReactThreeTestRenderer.act(async () => renderer.unmount());
  });

  it('renders the personal letter on the camera-facing (+Z) face, default "T" (Req 6.3)', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <CubeLogo reducedMotion={false} tier="high" />,
    );

    const textNode = renderer.scene.find(
      (node) =>
        typeof (
          node.instance as unknown as { userData?: { troikaText?: unknown } }
        ).userData?.troikaText === "string",
    );
    const ud = (textNode.instance as unknown as {
      userData: { troikaText: string };
      position: { z: number };
    }).userData;
    expect(ud.troikaText).toBe("T");
    // Chữ đặt trên mặt +Z (hướng về camera ở trạng thái ban đầu).
    expect(
      (textNode.instance as unknown as { position: { z: number } }).position.z,
    ).toBeGreaterThan(0);

    await ReactThreeTestRenderer.act(async () => renderer.unmount());
  });

  it("respects a custom letter prop (Req 6.3)", async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <CubeLogo reducedMotion={false} tier="high" letter="K" />,
    );

    const textNode = renderer.scene.find(
      (node) =>
        typeof (
          node.instance as unknown as { userData?: { troikaText?: unknown } }
        ).userData?.troikaText === "string",
    );
    expect(
      (textNode.instance as unknown as { userData: { troikaText: string } })
        .userData.troikaText,
    ).toBe("K");

    await ReactThreeTestRenderer.act(async () => renderer.unmount());
  });

  it("keeps glow (emissiveIntensity) within the configured limit (Req 6.5)", async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <CubeLogo reducedMotion={false} tier="high" />,
    );

    const cube = findCubeMesh(renderer);
    const material = (cube!.instance as unknown as MeshInstance).material;
    expect(material.emissiveIntensity).toBeGreaterThan(0);
    expect(material.emissiveIntensity).toBeLessThanOrEqual(GLOW_MAX);
    // Glow dùng màu nhấn Accent_Palette (violet).
    expect(material.emissive.getHexString()).toBe(
      new Color(PALETTE.violet).getHexString(),
    );

    await ReactThreeTestRenderer.act(async () => renderer.unmount());
  });

  it("reduces glow on the low graphics tier (Req 6.8)", async () => {
    const high = await ReactThreeTestRenderer.create(
      <CubeLogo reducedMotion={false} tier="high" />,
    );
    const low = await ReactThreeTestRenderer.create(
      <CubeLogo reducedMotion={false} tier="low" />,
    );

    const highGlow = (findCubeMesh(high)!.instance as unknown as MeshInstance)
      .material.emissiveIntensity;
    const lowGlow = (findCubeMesh(low)!.instance as unknown as MeshInstance)
      .material.emissiveIntensity;

    expect(lowGlow).toBeLessThan(highGlow);
    expect(lowGlow).toBeGreaterThanOrEqual(0);
    expect(lowGlow).toBeLessThanOrEqual(GLOW_MAX);

    await ReactThreeTestRenderer.act(async () => high.unmount());
    await ReactThreeTestRenderer.act(async () => low.unmount());
  });

  it.each([["hero-bg" as const], ["loading" as const], ["brand" as const]])(
    'scales the cube group uniformly for role "%s" (Req 6.6)',
    async (role) => {
      const renderer = await ReactThreeTestRenderer.create(
        <CubeLogo reducedMotion={false} tier="high" role={role} />,
      );

      const expected = ROLE_SCALE[role];
      const groups = renderer.scene.findAllByType("Group");
      const scaled = groups.find((g) => {
        const s = (
          g.instance as unknown as {
            scale: { x: number; y: number; z: number };
          }
        ).scale;
        return (
          Math.abs(s.x - expected) < 1e-6 &&
          Math.abs(s.y - expected) < 1e-6 &&
          Math.abs(s.z - expected) < 1e-6
        );
      });
      expect(scaled).toBeDefined();

      await ReactThreeTestRenderer.act(async () => renderer.unmount());
    },
  );

  it('defaults to the "brand" role scale when role is omitted (Req 6.6)', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <CubeLogo reducedMotion={false} tier="high" />,
    );

    const groups = renderer.scene.findAllByType("Group");
    const scaled = groups.find((g) => {
      const s = (g.instance as unknown as { scale: { x: number } }).scale;
      return Math.abs(s.x - ROLE_SCALE.brand) < 1e-6;
    });
    expect(scaled).toBeDefined();

    await ReactThreeTestRenderer.act(async () => renderer.unmount());
  });

  it("rotates around the vertical axis over time when motion is enabled (Req 6.4 baseline)", async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <CubeLogo reducedMotion={false} tier="high" />,
    );

    const cube = findCubeMesh(renderer);
    // Group chứa khối là phần tử mang rotation (groupRef) — cha trực tiếp của mesh.
    const group = cube!.parent;
    const getRotY = () =>
      (group!.instance as unknown as { rotation: { y: number } }).rotation.y;

    expect(getRotY()).toBe(0);
    await renderer.advanceFrames(10, 0.1); // ~1 giây
    expect(getRotY()).toBeGreaterThan(0);

    await ReactThreeTestRenderer.act(async () => renderer.unmount());
  });

  it("stops rotating and stays static under reduced motion (Req 6.7)", async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <CubeLogo reducedMotion={true} tier="high" />,
    );

    const cube = findCubeMesh(renderer);
    const group = cube!.parent;
    const getRotY = () =>
      (group!.instance as unknown as { rotation: { y: number } }).rotation.y;

    expect(getRotY()).toBe(0);
    await renderer.advanceFrames(20, 0.1); // ~2 giây
    expect(getRotY()).toBe(0);

    await ReactThreeTestRenderer.act(async () => renderer.unmount());
  });
});
