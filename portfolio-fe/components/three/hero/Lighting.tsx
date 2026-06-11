"use client";

/**
 * Lighting — hệ thống ánh sáng key/fill/ambient + environment cho cảnh 3D Hero.
 *
 * Component này dựng:
 * - `ambientLight` cường độ thấp + drei `<Environment>` để không có vùng tối
 *   tuyệt đối, đồng thời cung cấp phản chiếu môi trường cho vật liệu PBR
 *   (Req 1.2, 3.2).
 * - `directionalLight` (key) màu cyan thuộc `PALETTE` + một fill light màu
 *   violet/blue thuộc `PALETTE` (Req 3.1).
 * - Bật `castShadow` cho key light khi `preset.shadows === true`; tắt ở tier
 *   `low` (Req 3.4, 3.5).
 *
 * Khả năng chịu lỗi (Req 3.3): mỗi nguồn sáng được bọc trong `<SafeLight>` — một
 * error boundary nhỏ. Nếu một đèn (hoặc Environment) ném lỗi trong lúc render/
 * khởi tạo, boundary bắt lỗi và render `null`, nhờ vậy cảnh vẫn render với các
 * nguồn sáng còn lại thay vì sập toàn bộ.
 *
 * Độ phân giải environment map được chọn theo `preset.envMapResolution`
 * ("high" | "low" | "color") để xuống cấp duyên dáng trên thiết bị yếu
 * (Req 1.4).
 *
 * _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 1.2, 1.4_
 */

import { Component, type ReactNode } from "react";
import { Environment } from "@react-three/drei";
import { PALETTE } from "@/lib/three/palette";
import type { TierPreset } from "@/lib/three/graphicsTier";

/** Độ phân giải environment map (texel) cho từng mức chất lượng. */
const ENV_RESOLUTION: Record<"high" | "low", number> = {
  high: 256,
  low: 64,
};

/** Preset HDR environment dùng cho ánh sáng môi trường (drei built-in). */
const ENV_PRESET = "city" as const;

interface SafeLightProps {
  children: ReactNode;
}

/**
 * Error boundary nhỏ bọc một nguồn sáng (hoặc Environment).
 *
 * Nếu children ném lỗi khi render/khởi tạo, boundary chuyển sang trạng thái lỗi
 * và render `null`, để một đèn hỏng không làm sập cả cảnh (Req 3.3).
 *
 * Được export để render test có thể kiểm chứng hành vi chịu lỗi trực tiếp.
 */
export class SafeLight extends Component<SafeLightProps, { hasError: boolean }> {
  constructor(props: SafeLightProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: unknown): void {
    // Lỗi của một nguồn sáng mang tính trang trí — chỉ log, không ném lại.
    if (typeof console !== "undefined") {
      console.error("[Lighting] một nguồn sáng khởi tạo thất bại:", error);
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

export interface LightingProps {
  /** Preset chất lượng hiện tại; đọc `shadows` và `envMapResolution`. */
  preset: TierPreset;
}

/**
 * Hệ thống ánh sáng của cảnh Hero.
 *
 * Mỗi nguồn sáng được render độc lập qua `<SafeLight>` để chịu lỗi cục bộ.
 */
export function Lighting({ preset }: LightingProps) {
  const castShadow = preset.shadows;
  const envRes = preset.envMapResolution;

  return (
    <>
      {/* Ambient: nền sáng tối thiểu, tránh vùng tối tuyệt đối (Req 3.2). */}
      <SafeLight>
        <ambientLight intensity={0.25} />
      </SafeLight>

      {/* Environment: ánh sáng môi trường + phản chiếu PBR (Req 1.2, 3.2). */}
      {/* "color" → bỏ qua Environment HDR, chỉ dựa vào ambient + đèn (Req 1.4). */}
      {envRes !== "color" && (
        <SafeLight>
          <Environment
            preset={ENV_PRESET}
            resolution={ENV_RESOLUTION[envRes]}
            background={false}
            environmentIntensity={0.6}
          />
        </SafeLight>
      )}

      {/* Key light: directional, màu cyan; đổ bóng theo tier (Req 3.1, 3.4, 3.5). */}
      <SafeLight>
        <directionalLight
          position={[5, 5, 5]}
          color={PALETTE.cyan}
          intensity={3}
          castShadow={castShadow}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-near={0.5}
          shadow-camera-far={50}
        />
      </SafeLight>

      {/* Fill light: violet, làm mềm vùng đổ bóng phía đối diện (Req 3.1). */}
      <SafeLight>
        <pointLight position={[-5, -3, -5]} color={PALETTE.violet} intensity={2} />
      </SafeLight>

      {/* Fill light phụ: blue, thêm chiều sâu màu từ phía trên (Req 3.1). */}
      <SafeLight>
        <directionalLight position={[0, 8, -2]} color={PALETTE.blue} intensity={1} />
      </SafeLight>
    </>
  );
}

export default Lighting;
