/**
 * Render và edge-case test cho `EarthGlobe` — quả Địa Cầu 3D dựng-bằng-mã làm
 * nền phụ trang trí (tùy chọn) cho Contact Section / Footer.
 *
 * Dùng `@react-three/test-renderer` để dựng `EarthGlobe` (sub-scene R3F) headless
 * — đúng như cách nó được tiêu thụ bên trong `SceneCanvas` (không tự bọc
 * `<Canvas>` riêng). Container/aria-hidden/pointer-events được kiểm qua DOM +
 * `vitest-axe` trên `EarthGlobeScene` (lớp tích hợp), nơi áp các thuộc tính đó.
 *
 * Chiến lược mock (tối thiểu, có chủ đích):
 *  - `TextureLoader` của three tải ảnh qua mạng nên không tất định trong jsdom.
 *    Thay bằng loader điều khiển được (success / fail / pending) để kiểm cả
 *    nhánh texture thành công lẫn nhánh lỗi tải → ẩn quả cầu + gọi `onError`
 *    (Req 11.7). Chỉ `TextureLoader` được thay; mọi lớp three còn lại (Mesh,
 *    Material, Group…) giữ nguyên để fiber render thật.
 *
 * Bao phủ các yêu cầu:
 * - 11.3: nền phụ ≤ 40% diện tích viewport + `pointer-events: none` (container).
 * - 11.4: Reduced_Motion_Mode → quả cầu dừng xoay, giữ trạng thái tĩnh.
 * - 11.6: phần tử trang trí, đánh dấu `aria-hidden` trong cây khả năng truy cập.
 * - 11.7: WebGL/texture tải thất bại → ẩn quả cầu, không hiển thị lỗi cho người
 *   dùng (sub-scene render `null` + `onError`).
 * - 12.1: cảnh 3D thuần trang trí mang `aria-hidden="true"`.
 *
 * _Requirements: 11.3, 11.4, 11.6, 11.7, 12.1_
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import ReactThreeTestRenderer from "@react-three/test-renderer";
import { Texture, type Group } from "three";
import * as axeMatchers from "vitest-axe/matchers";
import { axe } from "vitest-axe";
import "vitest-axe/extend-expect";

// Trạng thái điều khiển loader (hoisted để dùng trong factory của vi.mock).
const { textureLoader } = vi.hoisted(() => ({
  textureLoader: {
    mode: "success" as "success" | "fail" | "pending",
    error: new Error("earth texture load failed"),
  },
}));

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
        onError(textureLoader.error);
      }
      // "pending": không gọi callback nào (texture giữ null → quả cầu ẩn).
    }
  }
  return { ...actual, TextureLoader: MockTextureLoader };
});

// vitest-axe 0.1.0: `extend-expect` chỉ bổ sung type augmentation, nên đăng ký
// matcher thủ công ở runtime (đồng nhất với các bài test a11y khác).
expect.extend(axeMatchers);

import { EarthGlobe } from "./EarthGlobe";
import { EarthGlobeScene } from "./EarthGlobeScene";

type Renderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>;

interface MaterialLike {
  map?: unknown;
}

interface MeshInstance {
  material: MaterialLike;
}

/** Nhóm gốc của quả cầu (mang trục xoay Y). Chỉ tồn tại khi texture đã nạp. */
function findGlobeGroup(renderer: Renderer) {
  return renderer.scene.findAllByType("Group")[0];
}

/** Đọc góc xoay quanh trục Y của nhóm gốc. */
function rotationYOf(node: { instance: unknown }): number {
  return (node.instance as Group).rotation.y;
}

afterEach(() => {
  textureLoader.mode = "success";
  cleanup();
  vi.unstubAllEnvs();
});

describe("EarthGlobe — texture lifecycle (Req 11.7)", () => {
  it("renders a textured sphere once the earth texture loads", async () => {
    textureLoader.mode = "success";

    const renderer = await ReactThreeTestRenderer.create(
      <EarthGlobe reducedMotion={false} tier="high" />,
    );

    // Quả cầu hiển thị: có nhóm gốc + mesh mang texture (material.map gán).
    expect(findGlobeGroup(renderer)).toBeDefined();
    const textured = renderer.scene
      .findAllByType("Mesh")
      .find((m) => (m.instance as unknown as MeshInstance).material.map != null);
    expect(textured).toBeDefined();
    expect((textured!.instance as unknown as MeshInstance).material.map).toBeInstanceOf(
      Texture,
    );

    await ReactThreeTestRenderer.act(async () => renderer.unmount());
  });

  it("hides the globe and reports onError when the texture fails to load (Req 11.7)", async () => {
    textureLoader.mode = "fail";
    const onError = vi.fn();

    const renderer = await ReactThreeTestRenderer.create(
      <EarthGlobe reducedMotion={false} tier="high" onError={onError} />,
    );

    // Lỗi tải → component render `null`: không có nhóm/mesh nào trong cảnh.
    expect(renderer.scene.findAllByType("Group")).toHaveLength(0);
    expect(renderer.scene.findAllByType("Mesh")).toHaveLength(0);

    // Lỗi được báo qua `onError` để tầng tích hợp giữ nền tĩnh (không ném ra).
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(textureLoader.error);

    await ReactThreeTestRenderer.act(async () => renderer.unmount());
  });

  it("hides the globe while the texture is still loading (no empty sphere)", async () => {
    textureLoader.mode = "pending";

    const renderer = await ReactThreeTestRenderer.create(
      <EarthGlobe reducedMotion={false} tier="high" />,
    );

    // Chưa nạp xong → ẩn quả cầu (tránh hiện cầu trống không texture).
    expect(renderer.scene.findAllByType("Group")).toHaveLength(0);

    await ReactThreeTestRenderer.act(async () => renderer.unmount());
  });
});

describe("EarthGlobe — rotation vs reduced motion (Req 11.4)", () => {
  it("keeps the globe static (rotation unchanged) when reducedMotion is true", async () => {
    textureLoader.mode = "success";

    const renderer = await ReactThreeTestRenderer.create(
      <EarthGlobe reducedMotion={true} tier="high" />,
    );

    const group = findGlobeGroup(renderer);
    expect(group).toBeDefined();
    const baseY = rotationYOf(group);

    // Tiến nhiều frame: vì reduced motion → tốc độ xoay = 0 nên góc giữ nguyên.
    await ReactThreeTestRenderer.act(async () => {
      await renderer.advanceFrames(10, 16);
    });

    expect(rotationYOf(findGlobeGroup(renderer))).toBe(baseY);

    await ReactThreeTestRenderer.act(async () => renderer.unmount());
  });

  it("rotates the globe over time when reducedMotion is false", async () => {
    textureLoader.mode = "success";

    const renderer = await ReactThreeTestRenderer.create(
      <EarthGlobe reducedMotion={false} tier="high" />,
    );

    const baseY = rotationYOf(findGlobeGroup(renderer));

    await ReactThreeTestRenderer.act(async () => {
      await renderer.advanceFrames(10, 16);
    });

    // Xoay liên tục → góc tích lũy tăng (độc lập FPS).
    expect(rotationYOf(findGlobeGroup(renderer))).toBeGreaterThan(baseY);

    await ReactThreeTestRenderer.act(async () => renderer.unmount());
  });
});

describe("EarthGlobeScene — decorative container (Req 11.3, 11.6, 12.1)", () => {
  // Trong jsdom WebGL không khả dụng → `SceneCanvas` render fallback (`null`),
  // nhưng container trang trí (aria-hidden + pointer-events none + ≤40% viewport)
  // vẫn được dựng. Đây là nơi áp các thuộc tính tiếp cận/kích thước (Task 18.2).
  function renderScene() {
    // Bật feature flag để `EarthGlobeScene` mount container thay vì trả `null`.
    vi.stubEnv("NEXT_PUBLIC_ENABLE_EARTH", "true");
    return render(<EarthGlobeScene />);
  }

  it("marks the decorative scene container with aria-hidden (Req 11.6, 12.1)", () => {
    const { container } = renderScene();

    const hidden = container.querySelector('[aria-hidden="true"]');
    expect(hidden).not.toBeNull();
  });

  it("disables pointer events and constrains size to ≤40% of the viewport (Req 11.3)", () => {
    const { container } = renderScene();

    const decorative = container.querySelector(
      '[aria-hidden="true"]',
    ) as HTMLElement | null;
    expect(decorative).not.toBeNull();

    // Không nhận sự kiện con trỏ (Req 11.3).
    expect(decorative!.className).toContain("pointer-events-none");

    // Khung ≤ 40% mỗi chiều (40vw × 40vh ≈ 16% diện tích viewport ≤ 40%).
    expect(decorative!.className).toContain("w-[40vw]");
    expect(decorative!.className).toContain("h-[40vh]");
  });

  it("exposes no focusable elements and reports no accessibility violations (Req 12.1)", async () => {
    const { container } = renderScene();

    // Cảnh trang trí không phơi phần tử nhận tiêu điểm bàn phím nào.
    expect(
      container.querySelectorAll(
        "a, button, input, select, textarea, [tabindex]",
      ),
    ).toHaveLength(0);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
