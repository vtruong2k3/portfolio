/**
 * Render test cho `PostProcessing` — pipeline hậu kỳ (Post_Processing_Pipeline)
 * của cảnh 3D Hero.
 *
 * Dùng `@react-three/test-renderer` để dựng component R3F headless (không cần
 * WebGL context thực). `@react-three/postprocessing` (EffectComposer/Bloom/
 * Vignette) dựa trên WebGL nên được mock thành các marker `<group>` có `name`
 * định danh để khẳng định sự hiện diện/vắng mặt mà không cần internals thật.
 * test-renderer vẫn cung cấp R3F context nên `useFrame` trong component chạy
 * bình thường, không cần mock `@react-three/fiber`.
 *
 * Các trường hợp:
 * 1. High tier + bloom + vignette → composer + bloom + vignette (Req 2.1, 2.2).
 * 2. High tier + bloom, không vignette → bloom có, vignette không (độc lập, Req 2.3).
 * 3. High tier + không hiệu ứng → trả về null, không có composer.
 * 4. Low tier (postProcessing=false) + cả hai cờ true → trả về null (Req 2.4).
 * + Bảo toàn alpha (Req 2.6): EffectComposer marker không gán nền đục nào.
 *
 * _Requirements: 2.1, 2.2, 2.4, 2.6_
 */

import { describe, it, expect, vi } from "vitest";
import ReactThreeTestRenderer from "@react-three/test-renderer";
import { getPreset } from "@/lib/three/graphicsTier";

// Mock pipeline hậu kỳ → marker `<group>` định danh, tránh WebGL/EffectComposer thật.
vi.mock("@react-three/postprocessing", () => ({
  EffectComposer: ({ children }: { children?: React.ReactNode }) => (
    <group name="effect-composer">{children}</group>
  ),
  Bloom: () => <group name="bloom" />,
  Vignette: () => <group name="vignette" />,
}));

import { PostProcessing } from "./PostProcessing";

/** Tìm tất cả marker `<group>` (type "Group") mang `name` cho trước. */
function findGroupsByName(
  renderer: Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>,
  name: string,
) {
  return renderer.scene
    .findAllByType("Group")
    .filter((node) => node.props.name === name);
}

describe("PostProcessing", () => {
  it("renders composer + bloom + vignette on high tier with both flags enabled", async () => {
    const preset = getPreset("high");
    const renderer = await ReactThreeTestRenderer.create(
      <PostProcessing
        preset={preset}
        enableBloom
        enableVignette
        reducedMotion={false}
      />,
    );

    // Composer dựng (Req 2.1) cùng cả hai hiệu ứng (Req 2.2).
    expect(findGroupsByName(renderer, "effect-composer").length).toBe(1);
    expect(findGroupsByName(renderer, "bloom").length).toBe(1);
    expect(findGroupsByName(renderer, "vignette").length).toBe(1);

    // Bảo toàn alpha (Req 2.6): composer marker không gán nền đục nào.
    const composer = findGroupsByName(renderer, "effect-composer")[0];
    expect(composer.props.background).toBeUndefined();

    await ReactThreeTestRenderer.act(async () => {
      renderer.unmount();
    });
  });

  it("renders bloom without vignette when only bloom is enabled (independence)", async () => {
    const preset = getPreset("high");
    const renderer = await ReactThreeTestRenderer.create(
      <PostProcessing
        preset={preset}
        enableBloom
        enableVignette={false}
        reducedMotion={false}
      />,
    );

    expect(findGroupsByName(renderer, "effect-composer").length).toBe(1);
    expect(findGroupsByName(renderer, "bloom").length).toBe(1);
    expect(findGroupsByName(renderer, "vignette").length).toBe(0);

    await ReactThreeTestRenderer.act(async () => {
      renderer.unmount();
    });
  });

  it("renders nothing when no effects are enabled on high tier", async () => {
    const preset = getPreset("high");
    const renderer = await ReactThreeTestRenderer.create(
      <PostProcessing
        preset={preset}
        enableBloom={false}
        enableVignette={false}
        reducedMotion={false}
      />,
    );

    // Không hiệu ứng nào → không dựng composer rỗng (component trả về null).
    expect(findGroupsByName(renderer, "effect-composer").length).toBe(0);
    expect(findGroupsByName(renderer, "bloom").length).toBe(0);
    expect(findGroupsByName(renderer, "vignette").length).toBe(0);

    await ReactThreeTestRenderer.act(async () => {
      renderer.unmount();
    });
  });

  it("renders no pipeline on low tier even when both flags are enabled (Req 2.4)", async () => {
    const preset = getPreset("low");
    expect(preset.postProcessing).toBe(false);

    const renderer = await ReactThreeTestRenderer.create(
      <PostProcessing
        preset={preset}
        enableBloom
        enableVignette
        reducedMotion={false}
      />,
    );

    // Tier low tắt toàn bộ hậu kỳ → không composer, không hiệu ứng nào.
    expect(findGroupsByName(renderer, "effect-composer").length).toBe(0);
    expect(findGroupsByName(renderer, "bloom").length).toBe(0);
    expect(findGroupsByName(renderer, "vignette").length).toBe(0);

    await ReactThreeTestRenderer.act(async () => {
      renderer.unmount();
    });
  });
});
