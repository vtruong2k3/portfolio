/**
 * Render + edge-case test cho `DesktopModel` — vật thể 3D trung tâm (focal) của
 * Hero (mô hình Programmer Desktop), thay thế TorusKnot.
 *
 * Dùng `@react-three/test-renderer` để dựng component R3F headless (cung cấp
 * camera/size mặc định cho `useThree`/`useFrame`). Component được render trực
 * tiếp (không bọc `<Canvas>` riêng) đúng như cách nó được tiêu thụ bên trong
 * `SceneCanvas`/`HeroScene`.
 *
 * `useGLTF` của drei nạp tệp GLB thật qua loader bất đồng bộ — không chạy được
 * trong jsdom. Vì vậy ta thay `useGLTF` bằng một mock điều khiển được ba chế độ:
 *  - `loaded`  : trả về một `scene` Three.js dựng-bằng-mã (Group + Mesh +
 *                MeshStandardMaterial) để kiểm tra vật liệu, căn giữa, preset.
 *  - `suspend` : ném một Promise không bao giờ resolve → giữ `<Suspense>` ở
 *                Loading_State (kiểm tra Req 4.7 và timeout Req 4.8).
 *  - `error`   : ném `Error` → mô phỏng tải thất bại lan tới error boundary.
 * Đây là việc thay cơ chế nạp tài sản của bên thứ ba (không chạy headless),
 * KHÔNG giả lập logic của chính `DesktopModel`: vật liệu tông tối + điểm nhấn
 * phát sáng, căn giữa/chuẩn hóa, preset theo tier, Loading_State và timeout đều
 * được kiểm tra trên component thật.
 *
 * Bao phủ:
 * - 4.1: Desktop_Model là vật thể trung tâm (focal), căn giữa quanh gốc toạ độ.
 * - 4.2: vật liệu tông tối + ít nhất một điểm nhấn emissive Accent_Palette (cyan).
 * - 4.5: tier `low` → giảm đổ bóng + giảm phản chiếu/điểm nhấn theo preset.
 * - 4.7: Loading_State phủ trọn nền Hero trong khi GLB đang nạp.
 * - 4.8: timeout 10s khi chưa nạp xong → `onError`; tải thất bại lan ra ngoài.
 * - 4.9: Fallback_Visual (HeroFallback) giữ Accent_Palette, phủ nền, trang trí
 *        và không chặn nội dung văn bản/nút bấm tương tác của Hero.
 *
 * _Requirements: 4.1, 4.2, 4.5, 4.7, 4.8, 4.9_
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import ReactThreeTestRenderer from "@react-three/test-renderer";
import {
  Box3,
  BoxGeometry,
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  Vector3,
  type Object3D,
} from "three";

// State chia sẻ cho mock useGLTF (hoisted để dùng trong factory của vi.mock).
const { gltfState } = vi.hoisted(() => ({
  gltfState: {
    mode: "loaded" as "loaded" | "suspend" | "error",
    scene: null as unknown,
    pending: null as Promise<unknown> | null,
  },
}));

// Thay `useGLTF` (loader GLB bất đồng bộ) bằng mock điều khiển được. Xem chú
// thích đầu file: loader thật không chạy trong jsdom.
vi.mock("@react-three/drei", () => ({
  useGLTF: () => {
    if (gltfState.mode === "suspend") {
      // Promise không bao giờ resolve → Suspense giữ Loading_State.
      if (!gltfState.pending) gltfState.pending = new Promise<unknown>(() => {});
      throw gltfState.pending;
    }
    if (gltfState.mode === "error") {
      throw new Error("GLB load failed (mô phỏng tải thất bại)");
    }
    return { scene: gltfState.scene };
  },
}));

// Cô lập đơn vị: Terminal_Screen có bộ test riêng (11.3) và phụ thuộc drei
// `Text` (troika) vốn không render headless trong jsdom. Ở đây ta thay nó bằng
// no-op để chỉ kiểm tra hành vi của chính DesktopModel (vật liệu, căn giữa,
// preset, Loading_State, timeout) mà không bị nhiễu bởi mesh của Terminal_Screen.
vi.mock("./TerminalScreen", () => ({
  TerminalScreen: () => null,
}));

import { DesktopModel } from "./DesktopModel";
import { PALETTE } from "@/lib/three/palette";
import { getPreset } from "@/lib/three/graphicsTier";
import { HeroFallback } from "@/components/three/HeroFallback";

/** Tông tối nền của vật liệu theo Art_Direction (đồng bộ hằng số trong component). */
const DARK_TONE = "#0b1020";

/** Đổi mã màu hex `#rrggbb` thành bộ ba `r, g, b` như jsdom chuẩn hóa CSS. */
function hexToRgbTriplet(hex: string): string {
  const value = parseInt(hex.replace("#", ""), 16);
  const r = (value >> 16) & 0xff;
  const g = (value >> 8) & 0xff;
  const b = value & 0xff;
  return `${r}, ${g}, ${b}`;
}

type Renderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>;

interface StandardMaterialLike {
  color: Color;
  emissive: Color;
  emissiveIntensity: number;
  envMapIntensity: number;
}

interface MeshLike {
  isMesh: boolean;
  castShadow: boolean;
  receiveShadow: boolean;
  geometry: { type: string };
  material: StandardMaterialLike;
}

/**
 * Dựng một `scene` GLB giả: một Group chứa hai Mesh có MeshStandardMaterial.
 * Mesh đầu lệch khỏi gốc toạ độ để phép căn giữa thực sự phải dịch chuyển.
 */
function buildScene(): Group {
  const group = new Group();

  const geo1 = new BoxGeometry(2, 2, 2);
  geo1.translate(3, 4, 5); // lệch tâm để kiểm tra việc căn giữa
  group.add(new Mesh(geo1, new MeshStandardMaterial()));

  const geo2 = new BoxGeometry(1, 1, 1);
  group.add(new Mesh(geo2, new MeshStandardMaterial()));

  return group;
}

/** Lấy danh sách instance Mesh của MÔ HÌNH (geometry BoxGeometry) trong cảnh. */
function getMeshes(renderer: Renderer): MeshLike[] {
  return renderer.scene
    .findAllByType("Mesh")
    .map((n) => n.instance as unknown as MeshLike)
    .filter((m) => m.geometry.type === "BoxGeometry");
}

/** Tìm Group chứa trực tiếp các Mesh mô hình (BoxGeometry) — cảnh GLB đã clone. */
function findModelGroup(renderer: Renderer): Object3D {
  const groups = renderer.scene.findAllByType("Group");
  const node = groups.find((g) => {
    const inst = g.instance as unknown as Object3D;
    return inst.children.some(
      (c) => (c as Mesh).isMesh && (c as Mesh).geometry?.type === "BoxGeometry",
    );
  });
  return node!.instance as unknown as Object3D;
}

/** Cường độ phát sáng (emissive) của mesh điểm nhấn (emissive == cyan). */
function accentIntensity(renderer: Renderer): number {
  const cyanHex = new Color(PALETTE.cyan).getHexString();
  const accent = getMeshes(renderer).find(
    (m) => m.material.emissive.getHexString() === cyanHex,
  );
  return accent!.material.emissiveIntensity;
}

/** envMapIntensity của mesh điểm nhấn (đại diện cho mức phản chiếu môi trường). */
function accentEnvIntensity(renderer: Renderer): number {
  const cyanHex = new Color(PALETTE.cyan).getHexString();
  const accent = getMeshes(renderer).find(
    (m) => m.material.emissive.getHexString() === cyanHex,
  );
  return accent!.material.envMapIntensity;
}

beforeEach(() => {
  gltfState.mode = "loaded";
  gltfState.scene = buildScene();
  gltfState.pending = null;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("DesktopModel — focal + composition (Req 4.1, 4.3)", () => {
  it("renders the model centered around the origin (Req 4.1)", async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <DesktopModel reducedMotion={false} preset={getPreset("high")} />,
    );

    const modelGroup = findModelGroup(renderer);

    // Cập nhật ma trận thế giới của toàn cây trước khi đo hộp bao.
    let root: Object3D = modelGroup;
    while (root.parent) root = root.parent;
    root.updateMatrixWorld(true);

    const box = new Box3().setFromObject(modelGroup);
    const center = box.getCenter(new Vector3());
    // Tâm hộp bao (sau căn giữa + chuẩn hóa + fit-scale) nằm tại gốc toạ độ.
    expect(center.x).toBeCloseTo(0, 3);
    expect(center.y).toBeCloseTo(0, 3);
    expect(center.z).toBeCloseTo(0, 3);

    // Mô hình được render với kích thước dương (thực sự hiển thị).
    const size = box.getSize(new Vector3());
    expect(Math.max(size.x, size.y, size.z)).toBeGreaterThan(0);

    await ReactThreeTestRenderer.act(async () => renderer.unmount());
  });

  it("applies a fit-scale in (0, 1] so the model is never enlarged (Req 4.3)", async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <DesktopModel reducedMotion={false} preset={getPreset("high")} />,
    );

    const modelGroup = findModelGroup(renderer);
    // Cha của model group là nhóm chuẩn hóa; cha của nó là nhóm fit-scale.
    const inner = modelGroup.parent as Object3D;
    const outer = inner.parent as Object3D;

    // Fit-scale đồng nhất, dương và không phóng to (<= 1).
    expect(outer.scale.x).toBeGreaterThan(0);
    expect(outer.scale.x).toBeLessThanOrEqual(1 + 1e-9);
    expect(outer.scale.y).toBeCloseTo(outer.scale.x, 9);
    expect(outer.scale.z).toBeCloseTo(outer.scale.x, 9);

    await ReactThreeTestRenderer.act(async () => renderer.unmount());
  });

  it("invokes onLoaded once the model is available (Req 4.7/5.1 baseline)", async () => {
    const onLoaded = vi.fn();
    const renderer = await ReactThreeTestRenderer.create(
      <DesktopModel
        reducedMotion={false}
        preset={getPreset("high")}
        onLoaded={onLoaded}
      />,
    );

    expect(onLoaded).toHaveBeenCalledTimes(1);

    await ReactThreeTestRenderer.act(async () => renderer.unmount());
  });
});

describe("DesktopModel — dark material + accent emissive (Req 4.2)", () => {
  it("applies the dark tone to every mesh and at least one cyan emissive accent", async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <DesktopModel reducedMotion={false} preset={getPreset("high")} />,
    );

    const meshes = getMeshes(renderer);
    expect(meshes.length).toBeGreaterThan(0);

    const darkHex = new Color(DARK_TONE).getHexString();
    const cyanHex = new Color(PALETTE.cyan).getHexString();

    let accentCount = 0;
    for (const mesh of meshes) {
      // Tông tối theo Art_Direction áp lên màu nền của mọi vật liệu.
      expect(mesh.material.color.getHexString()).toBe(darkHex);
      if (
        mesh.material.emissive.getHexString() === cyanHex &&
        mesh.material.emissiveIntensity > 0
      ) {
        accentCount += 1;
      }
    }

    // "Ít nhất một" điểm nhấn phát sáng dùng màu Accent_Palette (cyan).
    expect(accentCount).toBeGreaterThanOrEqual(1);

    await ReactThreeTestRenderer.act(async () => renderer.unmount());
  });
});

describe("DesktopModel — low graphics tier preset (Req 4.5)", () => {
  it("disables shadows on the low tier but keeps them on the high tier", async () => {
    const high = await ReactThreeTestRenderer.create(
      <DesktopModel reducedMotion={false} preset={getPreset("high")} />,
    );
    // Preset `high` bật đổ bóng cho mọi mesh.
    const highShadows = getMeshes(high).every(
      (m) => m.castShadow && m.receiveShadow,
    );
    await ReactThreeTestRenderer.act(async () => high.unmount());

    const low = await ReactThreeTestRenderer.create(
      <DesktopModel reducedMotion={false} preset={getPreset("low")} />,
    );
    // Preset `low` tắt đổ bóng cho mọi mesh.
    const lowShadows = getMeshes(low).every(
      (m) => !m.castShadow && !m.receiveShadow,
    );
    await ReactThreeTestRenderer.act(async () => low.unmount());

    expect(highShadows).toBe(true);
    expect(lowShadows).toBe(true);
  });

  it("reduces environment reflection and accent glow on the low tier", async () => {
    const high = await ReactThreeTestRenderer.create(
      <DesktopModel reducedMotion={false} preset={getPreset("high")} />,
    );
    const highEnv = accentEnvIntensity(high);
    const highGlow = accentIntensity(high);
    await ReactThreeTestRenderer.act(async () => high.unmount());

    const low = await ReactThreeTestRenderer.create(
      <DesktopModel reducedMotion={false} preset={getPreset("low")} />,
    );
    const lowEnv = accentEnvIntensity(low);
    const lowGlow = accentIntensity(low);
    await ReactThreeTestRenderer.act(async () => low.unmount());

    // envMapIntensity thấp hơn ở tier `low` (giảm phản chiếu môi trường).
    expect(lowEnv).toBeLessThan(highEnv);
    expect(lowEnv).toBeGreaterThanOrEqual(0);

    // Điểm nhấn phát sáng giảm cường độ ở tier `low` nhưng vẫn dương.
    expect(lowGlow).toBeLessThan(highGlow);
    expect(lowGlow).toBeGreaterThan(0);
  });
});

describe("DesktopModel — Loading_State while loading (Req 4.7)", () => {
  it("shows a large dark plane covering the Hero background and no model yet", async () => {
    gltfState.mode = "suspend";
    const onLoaded = vi.fn();

    const renderer = await ReactThreeTestRenderer.create(
      <DesktopModel
        reducedMotion={false}
        preset={getPreset("high")}
        onLoaded={onLoaded}
      />,
    );

    const planeNode = renderer.scene
      .findAllByType("Mesh")
      .map((n) => n.instance as unknown as MeshLike & {
        scale: Vector3;
        position: Vector3;
      })
      .find((m) => m.geometry.type === "PlaneGeometry");

    expect(planeNode).toBeDefined();
    // Loading_State phủ trọn nền Hero: plane rất lớn, đặt sau (z âm), tông tối.
    expect(planeNode!.scale.x).toBeGreaterThanOrEqual(100);
    expect(planeNode!.scale.y).toBeGreaterThanOrEqual(100);
    expect(planeNode!.position.z).toBeLessThan(0);

    // Mô hình (Box) chưa xuất hiện và onLoaded chưa được gọi khi đang nạp.
    const hasModel = renderer.scene
      .findAllByType("Mesh")
      .some(
        (n) =>
          (n.instance as unknown as MeshLike).geometry.type === "BoxGeometry",
      );
    expect(hasModel).toBe(false);
    expect(onLoaded).not.toHaveBeenCalled();

    await ReactThreeTestRenderer.act(async () => renderer.unmount());
  });
});

describe("DesktopModel — load timeout & failure (Req 4.8)", () => {
  it("calls onError after the 10s timeout when the model never loads", async () => {
    // Chỉ giả lập setTimeout/clearTimeout để không cản trở lịch trình của R3F.
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    gltfState.mode = "suspend";
    const onError = vi.fn();
    const onLoaded = vi.fn();

    const renderer = await ReactThreeTestRenderer.create(
      <DesktopModel
        reducedMotion={false}
        preset={getPreset("high")}
        onError={onError}
        onLoaded={onLoaded}
      />,
    );

    expect(onError).not.toHaveBeenCalled();

    await ReactThreeTestRenderer.act(async () => {
      vi.advanceTimersByTime(10_000);
    });

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(onLoaded).not.toHaveBeenCalled();

    await ReactThreeTestRenderer.act(async () => renderer.unmount());
  });

  it("does not call onError when the model loads before the timeout", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    gltfState.mode = "loaded";
    const onError = vi.fn();

    const renderer = await ReactThreeTestRenderer.create(
      <DesktopModel
        reducedMotion={false}
        preset={getPreset("high")}
        onError={onError}
      />,
    );

    await ReactThreeTestRenderer.act(async () => {
      vi.advanceTimersByTime(10_000);
    });

    expect(onError).not.toHaveBeenCalled();

    await ReactThreeTestRenderer.act(async () => renderer.unmount());
  });

  it("propagates a load failure so the scene can fall back (Req 4.8)", async () => {
    gltfState.mode = "error";
    // React ghi log lỗi render khi không có boundary trong cây test — im lặng.
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    let threw = false;
    try {
      const renderer = await ReactThreeTestRenderer.create(
        <DesktopModel reducedMotion={false} preset={getPreset("high")} />,
      );
      await ReactThreeTestRenderer.act(async () => renderer.unmount());
    } catch {
      // Lỗi tải lan ra ngoài (không bị nuốt) → trong production sẽ tới
      // CanvasErrorBoundary của SceneCanvas và chuyển sang Fallback_Visual.
      threw = true;
    }

    expect(threw).toBe(true);
    errorSpy.mockRestore();
  });
});

describe("DesktopModel — Fallback_Visual keeps palette + interactive content (Req 4.9)", () => {
  it("covers the background with the Accent_Palette without blocking interaction", () => {
    render(
      <div>
        <HeroFallback />
        <h1>Hero heading</h1>
        <button type="button">Liên hệ</button>
      </div>,
    );

    // Fallback là một div trang trí phủ trọn nền.
    const fallback = document.querySelector(
      "[aria-hidden='true'].pointer-events-none",
    ) as HTMLElement | null;
    expect(fallback).not.toBeNull();
    expect(fallback!.className).toContain("absolute");
    expect(fallback!.className).toContain("inset-0");

    // Giữ Accent_Palette: gradient nền dùng cyan + violet. jsdom chuẩn hóa màu
    // hex thành dạng `rgb(r, g, b)`, nên so khớp theo bộ ba RGB tương ứng.
    const bg = fallback!.style.backgroundImage;
    expect(bg).toContain(hexToRgbTriplet(PALETTE.cyan));
    expect(bg).toContain(hexToRgbTriplet(PALETTE.violet));

    // Không chặn tương tác: pointer-events-none + aria-hidden → nội dung văn bản
    // và nút bấm của Hero vẫn đọc/được và bấm được.
    expect(fallback!.className).toContain("pointer-events-none");
    expect(
      screen.getByRole("heading", { name: "Hero heading" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Liên hệ" }),
    ).toBeInTheDocument();
  });
});
