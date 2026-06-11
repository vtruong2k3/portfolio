"use client";

/**
 * PostProcessing — pipeline hậu kỳ (Post_Processing_Pipeline) của cảnh 3D Hero.
 *
 * Component R3F mỏng tiêu thụ logic thuần trong `lib/three/postProcessing`:
 *
 * - Quyết định hiệu ứng nào được bật dựa trên `buildEnabledEffects(...)` với hai
 *   cờ độc lập `enableBloom` / `enableVignette` (Req 2.3). `<Bloom>` được thêm
 *   khi và chỉ khi `"bloom"` xuất hiện trong tập hiệu ứng; `<Vignette>` được
 *   thêm khi và chỉ khi `"vignette"` xuất hiện — sự hiện diện của hiệu ứng này
 *   không phụ thuộc hiệu ứng kia.
 * - Chỉ dựng pipeline khi `preset.postProcessing === true`. Tier `low` tắt toàn
 *   bộ hậu kỳ nên component trả về `null` (Req 2.4).
 * - `<EffectComposer>` yêu cầu tối thiểu một child; nếu không hiệu ứng nào được
 *   bật, component trả về `null` thay vì dựng composer rỗng.
 * - Bảo toàn nền trong suốt của Canvas (Req 2.6): EffectComposer KHÔNG vẽ nền
 *   đục — không gán `background` cho scene và `frameBufferType` mặc định
 *   (HalfFloatType) giữ kênh alpha. Việc bảo toàn alpha dựa trên Canvas được
 *   khởi tạo với `gl={{ alpha: true }}` (thiết lập ở `HeroScene`).
 * - Khi `reducedMotion` bật: cường độ bloom giữ ở giá trị tĩnh
 *   `computeBloomIntensity(0, true)` === `BLOOM_BASE_INTENSITY`, không dao động
 *   theo thời gian (Req 2.5). Khi KHÔNG giảm chuyển động, cường độ bloom được
 *   cập nhật mỗi frame qua ref bằng `computeBloomIntensity(elapsed, false)` để
 *   tạo hiệu ứng "thở" tinh tế.
 *
 * _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_
 */

import type { JSX } from "react";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";

import type { TierPreset } from "@/lib/three/graphicsTier";
import {
  BLOOM_BASE_INTENSITY,
  buildEnabledEffects,
  computeBloomIntensity,
} from "@/lib/three/postProcessing";

/** Phần bề mặt của `BloomEffect` mà component cần để cập nhật cường độ mỗi frame. */
interface BloomHandle {
  intensity: number;
}

export interface PostProcessingProps {
  /** Preset của tier hiện tại; `postProcessing` quyết định có dựng pipeline hay không. */
  preset: TierPreset;
  /** Bật hiệu ứng bloom (độc lập với vignette) — Req 2.3. */
  enableBloom: boolean;
  /** Bật hiệu ứng vignette (độc lập với bloom) — Req 2.3. */
  enableVignette: boolean;
  /** Khi bật Reduced_Motion_Mode: tham số hậu kỳ giữ tĩnh, không dao động — Req 2.5. */
  reducedMotion: boolean;
}

export function PostProcessing({
  preset,
  enableBloom,
  enableVignette,
  reducedMotion,
}: PostProcessingProps) {
  const bloomRef = useRef<BloomHandle | null>(null);

  // Hook luôn được gọi (không phụ thuộc nhánh) để giữ thứ tự hook ổn định.
  // Khi giảm chuyển động hoặc chưa có bloom: không cập nhật, giữ giá trị tĩnh.
  useFrame((state) => {
    const bloom = bloomRef.current;
    if (!bloom || reducedMotion) return;
    bloom.intensity = computeBloomIntensity(state.clock.elapsedTime, false);
  });

  // Tier `low` (và mọi tier có postProcessing=false) tắt toàn bộ hậu kỳ (Req 2.4).
  if (!preset.postProcessing) {
    return null;
  }

  // Ánh xạ cờ độc lập -> tập hiệu ứng được bật (Req 2.3).
  const effects = buildEnabledEffects({ enableBloom, enableVignette });

  // EffectComposer yêu cầu tối thiểu một child; không hiệu ứng nào -> không dựng.
  if (effects.length === 0) {
    return null;
  }

  const children: JSX.Element[] = effects.map((effect) => {
    if (effect === "bloom") {
      return (
        <Bloom
          key="bloom"
          ref={bloomRef}
          // Giá trị khởi tạo === computeBloomIntensity(0, true). Khi không giảm
          // chuyển động, useFrame ở trên cập nhật `intensity` qua ref mỗi frame.
          intensity={BLOOM_BASE_INTENSITY}
          mipmapBlur
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
        />
      );
    }

    return <Vignette key="vignette" offset={0.3} darkness={0.7} />;
  });

  return (
    // Bật antialias đa mẫu theo preset; KHÔNG đặt nền đục để giữ alpha (Req 2.6).
    <EffectComposer multisampling={preset.antialias ? 8 : 0}>
      {children}
    </EffectComposer>
  );
}

export default PostProcessing;
