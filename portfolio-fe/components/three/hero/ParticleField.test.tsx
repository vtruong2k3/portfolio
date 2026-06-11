/**
 * Render test cho `ParticleField` — đám mây điểm + nền sao drei `<Stars>`.
 *
 * Dùng `@react-three/test-renderer` để dựng component R3F headless (không cần
 * WebGL context thực). Drei `<Stars>` được MOCK thành một component có thể quan
 * sát (vi.fn) để xác định tất định liệu Stars có nằm trong cây render hay không:
 *
 * - `reducedMotion === true`  → Stars KHÔNG được gọi (vắng mặt khỏi cây). (Req 5.4)
 * - `reducedMotion === false` → Stars được gọi (hiện diện trong cây).
 *
 * Trong cả hai trường hợp, đám mây điểm (`Points`) vẫn luôn render.
 *
 * _Requirements: 5.4_
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import ReactThreeTestRenderer from "@react-three/test-renderer";
import { getPreset } from "@/lib/three/graphicsTier";

// Mock drei → Stars thành component quan sát được (render null trong cây R3F).
// Đếm số lần gọi để xác định Stars có hiện diện hay không, một cách tất định.
const starsMock = vi.fn((_props: unknown) => null);
vi.mock("@react-three/drei", () => ({
  Stars: (props: unknown) => starsMock(props),
}));

import { ParticleField } from "./ParticleField";

afterEach(() => {
  vi.clearAllMocks();
});

describe("ParticleField", () => {
  it("does NOT render Stars when reduced motion is ON (Req 5.4)", async () => {
    const preset = getPreset("high"); // starCount = 800 → Stars sẽ render nếu cho phép
    const renderer = await ReactThreeTestRenderer.create(
      <ParticleField preset={preset} reducedMotion={true} />,
    );

    // Stars hoàn toàn vắng mặt khỏi cây render khi reduced motion bật.
    expect(starsMock).not.toHaveBeenCalled();

    // Đám mây điểm vẫn render bình thường.
    const points = renderer.scene.findAllByType("Points");
    expect(points.length).toBeGreaterThanOrEqual(1);

    await ReactThreeTestRenderer.act(async () => {
      renderer.unmount();
    });
  });

  it("renders Stars when reduced motion is OFF", async () => {
    const preset = getPreset("high"); // starCount = 800
    const renderer = await ReactThreeTestRenderer.create(
      <ParticleField preset={preset} reducedMotion={false} />,
    );

    // Stars hiện diện trong cây render khi reduced motion tắt.
    expect(starsMock).toHaveBeenCalled();

    // Đám mây điểm cũng vẫn render.
    const points = renderer.scene.findAllByType("Points");
    expect(points.length).toBeGreaterThanOrEqual(1);

    await ReactThreeTestRenderer.act(async () => {
      renderer.unmount();
    });
  });
});
