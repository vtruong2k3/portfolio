/**
 * Render + edge-case tests cho `TechIconOrbit` và `TechIconCard` — quỹ đạo các
 * thẻ biểu tượng công nghệ trong Skills Section.
 *
 * Dùng `@react-three/test-renderer` để dựng các component R3F headless (cung cấp
 * camera/size mặc định để `useThree`/`useFrame` hoạt động). Các component được
 * render trực tiếp (không bọc `<Canvas>` riêng) đúng như cách chúng được tiêu
 * thụ bên trong `SceneCanvas`.
 *
 * Hai phụ thuộc bên thứ ba không chạy được headless trong jsdom được thay bằng
 * stand-in R3F thật (KHÔNG giả lập logic của chính các component đang kiểm thử):
 * - drei `<Text>` (troika-three-text) cần web worker + tải font để sinh glyph
 *   SDF → thay bằng một plane mesh chuyển tiếp đúng chữ + vị trí.
 * - drei `<Billboard>` xoay theo camera mỗi frame qua một số phép biến đổi ma
 *   trận → thay bằng một `<group>` chuyển tiếp `position` và đánh dấu
 *   `userData.billboard` để đếm số thẻ. Việc định hướng billboard đã được kiểm
 *   tra riêng bằng property-test (`orbit.billboard.test.ts`).
 *
 * Ngoài ra `TextureLoader.prototype.load` của three được spy để mô phỏng nạp SVG
 * thành công/thất bại một cách tất định (không cần mạng).
 *
 * Bao phủ các yêu cầu:
 * - 7.2: hiển thị 6–8 Tech_Icon_Card.
 * - 7.7: hover hiển thị tên kỹ năng và tăng cường glow trong vòng 200ms.
 * - 7.8: rời chuột ẩn tên và khôi phục glow mặc định trong vòng 200ms.
 * - 7.10: tier `low` giới hạn tối đa 6 thẻ.
 * - 7.11: SVG tải thất bại → biểu tượng dự phòng giữ nguyên vị trí.
 * - 7.12: biểu tượng SVG được nạp từ `public/icons/`.
 *
 * _Requirements: 7.2, 7.7, 7.8, 7.10, 7.11, 7.12_
 */

import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import ReactThreeTestRenderer from "@react-three/test-renderer";
import { TextureLoader, Texture } from "three";

// Thay drei `<Billboard>`/`<Text>` bằng stand-in R3F thật. Xem chú thích đầu file.
vi.mock("@react-three/drei", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@react-three/drei")>();
  return {
    ...actual,
    Billboard: ({
      children,
      position,
    }: {
      children?: ReactNode;
      position?: [number, number, number];
      follow?: boolean;
    }) => (
      <group userData={{ billboard: true }} position={position}>
        {children}
      </group>
    ),
    Text: ({
      children,
      position,
    }: {
      children?: ReactNode;
      position?: [number, number, number];
    }) => {
      const text = Array.isArray(children)
        ? (children.find((c) => typeof c === "string") as string | undefined)
        : typeof children === "string"
          ? children
          : undefined;
      return (
        <mesh position={position} userData={{ troikaText: text }}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial />
        </mesh>
      );
    },
  };
});

import { TechIconOrbit } from "./TechIconOrbit";
import { TechIconCard } from "./TechIconCard";
import { computeOrbitPosition } from "@/lib/three/orbit";
import type { Skill } from "@/types/skill";

type Renderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>;

/** Glow base/hover theo cấu hình TechIconCard (Req 7.7, 7.8). */
const GLOW_BASE = 0.2;
const GLOW_HOVER = 0.6;
/** Bước thời gian mỗi frame (~60fps). */
const FRAME_DELTA = 1 / 60;
/** Số frame để phủ đúng 200ms (12 * 1/60 ≈ 0.2s). */
const FRAMES_200MS = 12;

/** Tạo danh sách kỹ năng mẫu với icon dưới `public/icons/`. */
function makeSkills(count: number): Skill[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `skill-${i}`,
    name: `Skill ${i}`,
    icon: `/icons/skill-${i}.svg`,
    category: "frontend",
    level: 5,
    order: i,
  }));
}

/** Spy TextureLoader.load để onLoad ngay (nạp SVG thành công). */
function mockTextureSuccess() {
  return vi
    .spyOn(TextureLoader.prototype, "load")
    .mockImplementation((_url, onLoad) => {
      const tex = new Texture() as unknown as ReturnType<TextureLoader["load"]>;
      onLoad?.(tex);
      return tex;
    });
}

/** Spy TextureLoader.load để onError ngay (nạp SVG thất bại — Req 7.11). */
function mockTextureFailure() {
  return vi
    .spyOn(TextureLoader.prototype, "load")
    .mockImplementation((_url, _onLoad, _onProgress, onError) => {
      onError?.(new ErrorEvent("error") as unknown as ErrorEvent);
      return new Texture() as unknown as ReturnType<TextureLoader["load"]>;
    });
}

/** Đếm số Tech_Icon_Card đã render = số group được đánh dấu `billboard`. */
function countCards(renderer: Renderer): number {
  return renderer.scene
    .findAllByType("Group")
    .filter(
      (g) =>
        (g.instance as unknown as { userData?: { billboard?: boolean } })
          .userData?.billboard === true,
    ).length;
}

/** Lấy tất cả text của các node `<Text>` đã render (troikaText). */
function renderedTexts(renderer: Renderer): string[] {
  return renderer.scene
    .findAllByType("Mesh")
    .map(
      (m) =>
        (m.instance as unknown as { userData?: { troikaText?: unknown } })
          .userData?.troikaText,
    )
    .filter((t): t is string => typeof t === "string");
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("TechIconOrbit — card count by tier (Req 7.2, 7.10)", () => {
  beforeEach(() => {
    mockTextureSuccess();
  });

  it("renders 8 cards on a high tier when enough skills are available (Req 7.2)", async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <TechIconOrbit skills={makeSkills(12)} reducedMotion={false} tier="high" />,
    );

    expect(countCards(renderer)).toBe(8);

    await ReactThreeTestRenderer.act(async () => renderer.unmount());
  });

  it("caps at 6 cards on the low tier even with many skills (Req 7.10)", async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <TechIconOrbit skills={makeSkills(12)} reducedMotion={false} tier="low" />,
    );

    expect(countCards(renderer)).toBe(6);

    await ReactThreeTestRenderer.act(async () => renderer.unmount());
  });

  it("never renders more cards than available skills (Req 7.2)", async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <TechIconOrbit skills={makeSkills(4)} reducedMotion={false} tier="high" />,
    );

    expect(countCards(renderer)).toBe(4);

    await ReactThreeTestRenderer.act(async () => renderer.unmount());
  });

  it("stays within the 6–8 band on a medium tier (Req 7.2)", async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <TechIconOrbit skills={makeSkills(7)} reducedMotion={false} tier="medium" />,
    );

    const count = countCards(renderer);
    expect(count).toBe(7);
    expect(count).toBeGreaterThanOrEqual(6);
    expect(count).toBeLessThanOrEqual(8);

    await ReactThreeTestRenderer.act(async () => renderer.unmount());
  });
});

describe("TechIconCard — icon loaded from public/icons/ (Req 7.12)", () => {
  it("loads the SVG texture from the provided public/icons/ url", async () => {
    const loadSpy = mockTextureSuccess();

    const renderer = await ReactThreeTestRenderer.create(
      <TechIconCard
        iconUrl="/icons/react.svg"
        label="React"
        basePosition={[0, 0, 0]}
        hovered={false}
        reducedMotion={false}
      />,
    );

    expect(loadSpy).toHaveBeenCalled();
    const calledUrl = loadSpy.mock.calls[0][0];
    expect(calledUrl).toBe("/icons/react.svg");
    expect(String(calledUrl).startsWith("/icons/")).toBe(true);

    await ReactThreeTestRenderer.act(async () => renderer.unmount());
  });

  it("loads each orbit card icon from public/icons/ (Req 7.12)", async () => {
    const loadSpy = mockTextureSuccess();

    const renderer = await ReactThreeTestRenderer.create(
      <TechIconOrbit skills={makeSkills(6)} reducedMotion={false} tier="high" />,
    );

    const urls = loadSpy.mock.calls.map((c) => String(c[0]));
    expect(urls.length).toBe(6);
    expect(urls.every((u) => u.startsWith("/icons/"))).toBe(true);

    await ReactThreeTestRenderer.act(async () => renderer.unmount());
  });
});

describe("TechIconCard — hover label + glow timing (Req 7.7, 7.8)", () => {
  beforeEach(() => {
    mockTextureSuccess();
  });

  /** Tìm mesh glow (scale 1.35) và đọc opacity vật liệu hiện tại. */
  function glowOpacity(renderer: Renderer): number {
    const glow = renderer.scene.findAllByType("Mesh").find((m) => {
      const s = (m.instance as unknown as { scale: { x: number } }).scale;
      return Math.abs(s.x - 1.35) < 1e-6;
    });
    return (glow!.instance as unknown as { material: { opacity: number } })
      .material.opacity;
  }

  it("does not show the label and keeps base glow when not hovered (Req 7.8)", async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <TechIconCard
        iconUrl="/icons/react.svg"
        label="React"
        basePosition={[0, 0, 0]}
        hovered={false}
        reducedMotion={false}
      />,
    );
    await renderer.advanceFrames(FRAMES_200MS, FRAME_DELTA);

    expect(renderedTexts(renderer)).not.toContain("React");
    expect(glowOpacity(renderer)).toBeCloseTo(GLOW_BASE, 5);

    await ReactThreeTestRenderer.act(async () => renderer.unmount());
  });

  it("shows the label and boosts glow to hover level within 200ms (Req 7.7)", async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <TechIconCard
        iconUrl="/icons/react.svg"
        label="React"
        basePosition={[0, 0, 0]}
        hovered={false}
        reducedMotion={false}
      />,
    );

    // Bắt đầu ở base glow.
    expect(glowOpacity(renderer)).toBeCloseTo(GLOW_BASE, 5);

    // Con trỏ di vào → hiển thị nhãn + ramp glow trong 200ms.
    await renderer.update(
      <TechIconCard
        iconUrl="/icons/react.svg"
        label="React"
        basePosition={[0, 0, 0]}
        hovered={true}
        reducedMotion={false}
      />,
    );
    await renderer.advanceFrames(FRAMES_200MS, FRAME_DELTA);

    expect(renderedTexts(renderer)).toContain("React");
    expect(glowOpacity(renderer)).toBeCloseTo(GLOW_HOVER, 2);

    await ReactThreeTestRenderer.act(async () => renderer.unmount());
  });

  it("hides the label and restores base glow within 200ms on leave (Req 7.8)", async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <TechIconCard
        iconUrl="/icons/react.svg"
        label="React"
        basePosition={[0, 0, 0]}
        hovered={true}
        reducedMotion={false}
      />,
    );
    await renderer.advanceFrames(FRAMES_200MS, FRAME_DELTA);
    expect(glowOpacity(renderer)).toBeCloseTo(GLOW_HOVER, 2);

    // Con trỏ rời → ẩn nhãn + glow trở về base trong 200ms.
    await renderer.update(
      <TechIconCard
        iconUrl="/icons/react.svg"
        label="React"
        basePosition={[0, 0, 0]}
        hovered={false}
        reducedMotion={false}
      />,
    );
    await renderer.advanceFrames(FRAMES_200MS, FRAME_DELTA);

    expect(renderedTexts(renderer)).not.toContain("React");
    expect(glowOpacity(renderer)).toBeCloseTo(GLOW_BASE, 2);

    await ReactThreeTestRenderer.act(async () => renderer.unmount());
  });
});

describe("TechIconOrbit — hover wiring shows a single label (Req 7.7, 7.8)", () => {
  beforeEach(() => {
    mockTextureSuccess();
  });

  it("shows exactly one skill label on pointer over and clears it on leave", async () => {
    const skills = makeSkills(6);
    const renderer = await ReactThreeTestRenderer.create(
      <TechIconOrbit skills={skills} reducedMotion={false} tier="high" />,
    );

    // Trước hover: không có nhãn kỹ năng nào (texture nạp thành công → không có
    // chữ dự phòng).
    const skillNames = new Set(skills.map((s) => s.name));
    expect(renderedTexts(renderer).filter((t) => skillNames.has(t))).toHaveLength(
      0,
    );

    // Tìm node nhận sự kiện hover của thẻ đầu tiên (có onPointerOver).
    const hoverTargets = renderer.scene.findAll(
      (node) =>
        typeof (node.props as { onPointerOver?: unknown }).onPointerOver ===
        "function",
    );
    expect(hoverTargets.length).toBeGreaterThan(0);

    await renderer.fireEvent(hoverTargets[0], "pointerOver");

    const hoveredLabels = renderedTexts(renderer).filter((t) =>
      skillNames.has(t),
    );
    expect(hoveredLabels).toHaveLength(1);

    // Rời chuột → ẩn nhãn.
    await renderer.fireEvent(hoverTargets[0], "pointerOut");
    expect(
      renderedTexts(renderer).filter((t) => skillNames.has(t)),
    ).toHaveLength(0);

    await ReactThreeTestRenderer.act(async () => renderer.unmount());
  });
});

describe("TechIconCard — SVG load failure fallback (Req 7.11)", () => {
  it("renders a fallback icon (first letter) when the SVG fails to load", async () => {
    mockTextureFailure();

    const renderer = await ReactThreeTestRenderer.create(
      <TechIconCard
        iconUrl="/icons/missing.svg"
        label="React"
        basePosition={[1.2, 0, -0.5]}
        hovered={false}
        reducedMotion={false}
      />,
    );

    // Biểu tượng dự phòng = chữ cái đầu in hoa của tên kỹ năng ("R").
    expect(renderedTexts(renderer)).toContain("R");

    await ReactThreeTestRenderer.act(async () => renderer.unmount());
  });

  it("keeps the card at its orbit position when the SVG fails (Req 7.11)", async () => {
    mockTextureFailure();

    const basePosition: [number, number, number] = [1.2, 0, -0.5];
    const renderer = await ReactThreeTestRenderer.create(
      <TechIconCard
        iconUrl="/icons/missing.svg"
        label="React"
        basePosition={basePosition}
        hovered={false}
        reducedMotion={false}
      />,
    );

    // Billboard (stand-in group) giữ nguyên basePosition dù SVG thất bại.
    const billboard = renderer.scene
      .findAllByType("Group")
      .find(
        (g) =>
          (g.instance as unknown as { userData?: { billboard?: boolean } })
            .userData?.billboard === true,
      );
    expect(billboard).toBeDefined();
    const pos = (
      billboard!.instance as unknown as {
        position: { x: number; y: number; z: number };
      }
    ).position;
    expect([pos.x, pos.y, pos.z]).toEqual(basePosition);

    await ReactThreeTestRenderer.act(async () => renderer.unmount());
  });

  it("keeps every orbit card at its computed position when all SVGs fail (Req 7.11)", async () => {
    mockTextureFailure();

    const skills = makeSkills(6);
    // reducedMotion=true → vị trí tĩnh, không bị useFrame cập nhật, dễ so khớp.
    const renderer = await ReactThreeTestRenderer.create(
      <TechIconOrbit skills={skills} reducedMotion={true} tier="high" />,
    );

    // Vị trí gốc tĩnh kỳ vọng (giống cách TechIconOrbit khởi tạo).
    const total = skills.length;
    const expected = skills.map(
      (_, index) =>
        computeOrbitPosition({
          index,
          total,
          radius: 2.6,
          elapsedSec: 0,
          reduced: true,
        }).position,
    );

    // Mỗi thẻ vẫn render biểu tượng dự phòng (giữ nguyên vị trí, không gián đoạn).
    expect(countCards(renderer)).toBe(6);

    // Các group bọc (cha của billboard) phải mang đúng vị trí quỹ đạo đã tính.
    const billboards = renderer.scene
      .findAllByType("Group")
      .filter(
        (g) =>
          (g.instance as unknown as { userData?: { billboard?: boolean } })
            .userData?.billboard === true,
      );
    const wrapperPositions = billboards.map((b) => {
      const p = (
        b.parent!.instance as unknown as {
          position: { x: number; y: number; z: number };
        }
      ).position;
      return [p.x, p.y, p.z] as [number, number, number];
    });

    expected.forEach((exp) => {
      const match = wrapperPositions.find(
        (p) =>
          Math.abs(p[0] - exp[0]) < 1e-6 &&
          Math.abs(p[1] - exp[1]) < 1e-6 &&
          Math.abs(p[2] - exp[2]) < 1e-6,
      );
      expect(match).toBeDefined();
    });

    await ReactThreeTestRenderer.act(async () => renderer.unmount());
  });
});
