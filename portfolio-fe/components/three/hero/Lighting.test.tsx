/**
 * Render test cho `Lighting` — ánh sáng key/fill/ambient + Environment và khả
 * năng chịu lỗi đèn (SafeLight error boundary).
 *
 * Dùng `@react-three/test-renderer` để dựng component R3F headless (không cần
 * WebGL context thực). Drei `<Environment>` nạp HDR qua mạng nên được mock thành
 * no-op để test tất định và offline.
 *
 * _Requirements: 3.1, 3.2, 3.3_
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import ReactThreeTestRenderer from "@react-three/test-renderer";
import { Color } from "three";
import { getPreset } from "@/lib/three/graphicsTier";
import { PALETTE } from "@/lib/three/palette";

// Mock drei Environment → no-op để tránh tải HDR qua mạng và giữ test tất định.
vi.mock("@react-three/drei", () => ({
  Environment: () => null,
}));

import { Lighting, SafeLight } from "./Lighting";

/** So sánh prop `color` của một light với mã hex của PALETTE (qua three.Color). */
function colorMatchesHex(colorProp: unknown, hex: string): boolean {
  // R3F chuẩn hóa prop `color` về three.Color; nhưng test-renderer giữ giá trị
  // prop gốc (chuỗi hex) trên node.props.color. Chuẩn hóa cả hai về Color.
  const expected = new Color(hex);
  const actual = new Color(colorProp as string);
  return actual.equals(expected);
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Lighting", () => {
  it("renders key (directional) + fill lights + ambient with PALETTE colors", async () => {
    const preset = getPreset("high");
    const renderer = await ReactThreeTestRenderer.create(
      <Lighting preset={preset} />,
    );

    const ambient = renderer.scene.findAllByType("AmbientLight");
    const directional = renderer.scene.findAllByType("DirectionalLight");
    const point = renderer.scene.findAllByType("PointLight");

    // Ambient/Environment requirement: ambientLight phải hiện diện (Req 3.2).
    expect(ambient.length).toBe(1);

    // Key light + fill light màu xanh là directional (Req 3.1).
    expect(directional.length).toBe(2);
    // Fill light màu violet là pointLight (Req 3.1).
    expect(point.length).toBe(1);

    // Key light (cyan) có trong các directional light.
    const directionalColors = directional.map((d) => d.props.color);
    expect(
      directionalColors.some((c) => colorMatchesHex(c, PALETTE.cyan)),
    ).toBe(true);
    // Fill directional (blue) cũng thuộc PALETTE.
    expect(
      directionalColors.some((c) => colorMatchesHex(c, PALETTE.blue)),
    ).toBe(true);

    // Fill point light màu violet thuộc PALETTE.
    expect(colorMatchesHex(point[0].props.color, PALETTE.violet)).toBe(true);

    await ReactThreeTestRenderer.act(async () => {
      renderer.unmount();
    });
  });

  it("enables shadows on the key light for the high tier", async () => {
    const preset = getPreset("high");
    const renderer = await ReactThreeTestRenderer.create(
      <Lighting preset={preset} />,
    );

    const directional = renderer.scene.findAllByType("DirectionalLight");
    const keyLight = directional.find((d) =>
      colorMatchesHex(d.props.color, PALETTE.cyan),
    );
    expect(keyLight?.props.castShadow).toBe(true);

    await ReactThreeTestRenderer.act(async () => {
      renderer.unmount();
    });
  });

  it("disables shadows on the low tier", async () => {
    const preset = getPreset("low");
    const renderer = await ReactThreeTestRenderer.create(
      <Lighting preset={preset} />,
    );

    const directional = renderer.scene.findAllByType("DirectionalLight");
    const keyLight = directional.find((d) =>
      colorMatchesHex(d.props.color, PALETTE.cyan),
    );
    expect(keyLight?.props.castShadow).toBe(false);

    await ReactThreeTestRenderer.act(async () => {
      renderer.unmount();
    });
  });

  it("still renders sibling lights when one light throws (SafeLight boundary)", async () => {
    // Component đèn lỗi: ném khi render để mô phỏng một nguồn sáng khởi tạo
    // thất bại trong lúc chạy (Req 3.3).
    function ThrowingLight(): never {
      throw new Error("simulated light init failure");
    }

    const renderer = await ReactThreeTestRenderer.create(
      <>
        <SafeLight>
          <ThrowingLight />
        </SafeLight>
        <SafeLight>
          <ambientLight intensity={0.25} />
        </SafeLight>
        <SafeLight>
          <directionalLight color={PALETTE.cyan} intensity={3} />
        </SafeLight>
      </>,
    );

    // Đèn lỗi bị boundary nuốt (render null); các đèn còn lại vẫn render.
    const ambient = renderer.scene.findAllByType("AmbientLight");
    const directional = renderer.scene.findAllByType("DirectionalLight");
    expect(ambient.length).toBe(1);
    expect(directional.length).toBe(1);

    // SafeLight log lỗi qua console.error (Req 3.3).
    expect(console.error).toHaveBeenCalled();

    await ReactThreeTestRenderer.act(async () => {
      renderer.unmount();
    });
  });
});
