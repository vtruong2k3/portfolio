/**
 * Unit/render test cho `Decorations` — vật liệu PBR và bố cục trang trí.
 *
 * Gồm hai nhóm:
 * 1. Unit test thuần trên `DECORATION_LAYOUT` (không cần renderer): xác nhận các
 *    vật thể phụ trải trên nhiều giá trị độ sâu trục Z (Req 4.2) và mọi màu đều
 *    thuộc `PALETTE` (Req 1.3).
 * 2. Render test qua `@react-three/test-renderer`: dựng `<Decorations>` headless
 *    và xác nhận mọi mesh dùng vật liệu PBR có `metalness`/`roughness` là số
 *    (Req 1.1).
 *
 * _Requirements: 1.1, 4.2_
 */

import { describe, it, expect, afterEach } from "vitest";
import ReactThreeTestRenderer from "@react-three/test-renderer";

import { PALETTE } from "@/lib/three/palette";
import { Decorations, DECORATION_LAYOUT } from "./Decorations";

afterEach(() => {
  // Không có mock toàn cục cần khôi phục; giữ hook để nhất quán với các test khác.
});

describe("DECORATION_LAYOUT (unit)", () => {
  it("spreads decorations across multiple Z depths (Req 4.2)", () => {
    const distinctZ = new Set(DECORATION_LAYOUT.map((item) => item.position[2]));
    // Cần ít nhất 2 giá trị Z khác nhau để tạo cảm giác chiều sâu không gian.
    expect(distinctZ.size).toBeGreaterThanOrEqual(2);
  });

  it("uses only PALETTE colors for every decoration (Req 1.3)", () => {
    const paletteColors = new Set<string>(Object.values(PALETTE));
    for (const item of DECORATION_LAYOUT) {
      expect(paletteColors.has(item.color)).toBe(true);
    }
  });
});

describe("Decorations (render)", () => {
  it("renders every mesh with a PBR material exposing numeric metalness/roughness (Req 1.1)", async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <Decorations reducedMotion={false} />,
    );

    const meshes = renderer.scene.findAllByType("Mesh");
    // Mỗi vật thể trang trí (orb/ring) tương ứng một mesh.
    expect(meshes.length).toBe(DECORATION_LAYOUT.length);

    for (const mesh of meshes) {
      // `instance.material` là material three.js thực; PBR material lộ
      // metalness/roughness dạng số (MeshStandardMaterial/MeshPhysicalMaterial).
      const material = (mesh.instance as unknown as { material: unknown })
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
    }

    await ReactThreeTestRenderer.act(async () => {
      renderer.unmount();
    });
  });
});
