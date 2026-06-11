/**
 * Render test cho `CentralObject` — vật liệu PBR của vật thể trung tâm.
 *
 * Dùng `@react-three/test-renderer` để dựng component R3F headless (cung cấp
 * camera/size mặc định để `useThree` hoạt động). Drei `<TorusKnot>` render
 * được headless nên KHÔNG mock — material child phải tồn tại để kiểm tra.
 *
 * Xác nhận mesh trung tâm dùng vật liệu PBR có `metalness`/`roughness` là số
 * (Req 1.1).
 *
 * _Requirements: 1.1_
 */

import { describe, it, expect, afterEach } from "vitest";
import ReactThreeTestRenderer from "@react-three/test-renderer";

import { CentralObject } from "./CentralObject";

afterEach(() => {
  // Không có mock toàn cục cần khôi phục.
});

describe("CentralObject (render)", () => {
  it("renders the central mesh with a PBR material exposing numeric metalness/roughness (Req 1.1)", async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <CentralObject reducedMotion={false} />,
    );

    const meshes = renderer.scene.findAllByType("Mesh");
    expect(meshes.length).toBeGreaterThanOrEqual(1);

    const material = (meshes[0].instance as unknown as { material: unknown })
      .material as {
      metalness: unknown;
      roughness: unknown;
      type: string;
    };
    expect(typeof material.metalness).toBe("number");
    expect(typeof material.roughness).toBe("number");
    expect(["MeshStandardMaterial", "MeshPhysicalMaterial"]).toContain(
      material.type,
    );

    await ReactThreeTestRenderer.act(async () => {
      renderer.unmount();
    });
  });
});
