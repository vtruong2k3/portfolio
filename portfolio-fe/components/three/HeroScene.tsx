"use client";

/**
 * HeroScene — điểm vào (entry) của cảnh 3D Hero phía client.
 *
 * Trách nhiệm của component này là dựng "khung" an toàn cho cảnh 3D:
 *
 * 1. WebGL guard (Req 12.1, 12.2): chỉ mount `<Canvas>` khi `isWebGLAvailable()`
 *    trả về `true`. Việc kiểm tra được thực hiện SAU khi mount (trong
 *    `useEffect`) để tránh lệch SSR/CSR (hydration mismatch) — server và lần
 *    render client đầu tiên đều hiển thị `<HeroFallback/>`, sau đó nếu WebGL
 *    khả dụng mới chuyển sang dựng Canvas.
 *
 * 2. Error boundary (Req 12.2): `<Canvas>` được bọc trong `CanvasErrorBoundary`.
 *    Khi xảy ra lỗi runtime trong cây 3D, boundary ghi log qua `console.error`
 *    và chuyển sang render `<HeroFallback/>` thay vì làm sập trang.
 *
 * 3. Tính chất trang trí / khả năng truy cập (Req 9.1, 9.3): container được đánh
 *    dấu `aria-hidden="true"` và không có `tabIndex`, nên cảnh 3D hoàn toàn bị
 *    ẩn khỏi cây khả năng truy cập và không thể nhận focus bàn phím. Nền canvas
 *    trong suốt (`alpha: true` + `background: transparent`).
 *
 * 4. Quản lý chất lượng (Req 7.4, 7.5, 7.6): `<Canvas>` được bọc trong
 *    `<QualityProvider>`; `CanvasInner` đọc `tier`/`preset` từ Quality_Manager
 *    rồi áp `clampDpr` cho DPR và `antialias`/`shadows` theo preset của tier.
 *
 * _Requirements: 7.4, 7.5, 7.6, 9.1, 9.3, 12.1, 12.2_
 */

import {
  Component,
  useEffect,
  useState,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { Canvas } from "@react-three/fiber";

import { isWebGLAvailable } from "@/lib/three/webgl";
import { clampDpr } from "@/lib/three/graphicsTier";
import { HeroFallback } from "@/components/three/HeroFallback";
import { QualityProvider } from "@/components/three/QualityProvider";
import { useQualityTier } from "@/hooks/useQualityTier";
import { Scene } from "@/components/three/hero/Scene";

// ─── Error boundary ────────────────────────────────────────────────────────

interface CanvasErrorBoundaryProps {
  /** Nội dung thay thế khi cây con ném lỗi runtime. */
  fallback: ReactNode;
  children: ReactNode;
}

interface CanvasErrorBoundaryState {
  hasError: boolean;
}

/**
 * Bắt lỗi runtime phát sinh trong cây `<Canvas>` (khởi tạo WebGL, shader,
 * render…). Khi có lỗi: ghi log `console.error` và render `fallback`
 * (`<HeroFallback/>`) để trang vẫn dùng được (Req 12.2).
 */
class CanvasErrorBoundary extends Component<
  CanvasErrorBoundaryProps,
  CanvasErrorBoundaryState
> {
  constructor(props: CanvasErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): CanvasErrorBoundaryState {
    // Chuyển sang trạng thái lỗi để render fallback ở lần render kế tiếp.
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Ghi log lỗi để chẩn đoán; không ném lại để tránh sập toàn trang.
    console.error("HeroScene: lỗi runtime trong Canvas 3D, chuyển sang fallback.", error, info);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// ─── Canvas (đọc tier/preset từ Quality_Manager) ─────────────────────────────

/**
 * CanvasInner — chỉ render phía client, BÊN TRONG `<QualityProvider>`.
 *
 * Đọc `tier`/`preset` hiện tại từ Quality_Manager để cấu hình Canvas:
 * - `dpr`: giới hạn theo trần của tier bằng `clampDpr` (Req 7.4).
 * - `gl.antialias`: theo preset của tier (Req 7.5).
 * - `shadows`: theo preset của tier (Req 7.6).
 * - `alpha: true` + `background: transparent`: nền canvas trong suốt (Req 9.3).
 */
function CanvasInner() {
  const { tier, preset } = useQualityTier();

  // Guard `window` cho an toàn (CanvasInner chỉ chạy client nhưng vẫn phòng vệ).
  const rawDpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

  return (
    <Canvas
      camera={{ position: [0, 0, 7], fov: 55 }}
      gl={{ antialias: preset.antialias, alpha: true }}
      dpr={clampDpr(rawDpr, tier)}
      shadows={preset.shadows}
      style={{ background: "transparent" }}
    >
      <Scene />
    </Canvas>
  );
}

// ─── Component xuất khẩu ─────────────────────────────────────────────────────

export function HeroScene() {
  // Trước khi xác nhận WebGL khả dụng, hiển thị fallback. Việc kiểm tra chạy
  // sau mount (useEffect) nên server + render client đầu tiên luôn khớp nhau,
  // tránh hydration mismatch (Req 12.1).
  const [webglAvailable, setWebglAvailable] = useState(false);

  useEffect(() => {
    setWebglAvailable(isWebGLAvailable());
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full" aria-hidden="true">
      {webglAvailable ? (
        <QualityProvider>
          <CanvasErrorBoundary fallback={<HeroFallback />}>
            <CanvasInner />
          </CanvasErrorBoundary>
        </QualityProvider>
      ) : (
        <HeroFallback />
      )}
    </div>
  );
}

export default HeroScene;
