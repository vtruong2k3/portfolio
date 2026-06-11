"use client";

/**
 * SceneCanvas — "khung an toàn" dùng chung cho mọi cảnh 3D của Asset_Suite.
 *
 * Trích xuất từ `HeroScene.tsx` (Task 9.1) để Hero, Skills Orbit, Earth Globe…
 * cùng dùng một khung, tránh nhân đôi logic về chất lượng / fallback / an toàn
 * SSR (Req 3.1–3.7). Khung này gồm các tầng:
 *
 * 1. WebGL guard (Req 3.3, 3.4, 3.5): chỉ mount `<Canvas>` khi
 *    `isWebGLAvailable()` trả về `true`. Việc kiểm tra dùng `useSyncExternalStore`
 *    để đọc một giá trị CHỈ-CÓ-Ở-CLIENT mà không gây cascading render; server và
 *    lần render client đầu tiên đều trả `false` ⇒ hiển thị `fallback`, tránh
 *    hydration mismatch. Sau hydration nếu WebGL khả dụng mới dựng Canvas.
 *
 * 2. Error boundary (Req 3.6, 3.7): `<Canvas>` được bọc trong `CanvasErrorBoundary`.
 *    Khi cây 3D ném lỗi runtime, boundary ghi `console.error` và chuyển sang
 *    render `fallback` thay vì làm sập trang.
 *
 * 3. Quality_Manager (Req 3.1, 13.3): `<Canvas>` được bọc trong `<QualityProvider>`;
 *    `CanvasInner` đọc `tier`/`preset` rồi áp `clampDpr` cho DPR và
 *    `antialias`/`shadows` theo preset của tier.
 *
 * 4. Giám sát FPS runtime (Req 13.4): một `FpsMonitor` chạy bên trong Canvas
 *    đẩy mẫu delta-time vào logic thuần và gọi `requestDowngrade` khi FPS sụt
 *    liên tục đủ lâu, hạ Graphics_Tier mà không reload.
 *
 * 5. Khả năng truy cập (Req 3 — cảnh trang trí): container `aria-hidden="true"`
 *    và không có `tabIndex`; nền canvas trong suốt (`alpha:true` +
 *    `background: transparent`).
 *
 * _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 13.3, 13.4_
 */

import {
  Component,
  Suspense,
  useMemo,
  useSyncExternalStore,
  type ComponentProps,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { Canvas } from "@react-three/fiber";

import { isWebGLAvailable } from "@/lib/three/webgl";
import { clampDpr, getPreset } from "@/lib/three/graphicsTier";
import { HeroFallback } from "@/components/three/HeroFallback";
import { QualityProvider } from "@/components/three/QualityProvider";
import { useQualityTier } from "@/hooks/useQualityTier";
import { useFpsMonitor } from "@/hooks/useFpsMonitor";
import type { FpsMonitorConfig } from "@/lib/three/fpsMonitor";

// ─── Public types ────────────────────────────────────────────────────────────

/**
 * Cấu hình camera truyền thẳng cho `<Canvas camera={...}>`. Dùng kiểu của R3F để
 * mọi consumer khai báo camera đồng nhất (vị trí, fov, near/far…).
 */
export type SceneCameraConfig = ComponentProps<typeof Canvas>["camera"];

export interface SceneCanvasProps {
  /** Cây 3D của Section, render bên trong `<Canvas>` và `<QualityProvider>`. */
  children: ReactNode;
  /**
   * Nội dung thay thế khi WebGL không khả dụng hoặc cây 3D ném lỗi runtime.
   * Mặc định `<HeroFallback/>` (Req 3.5, 3.6).
   */
  fallback?: ReactNode;
  /** Cấu hình camera của Canvas. Mặc định `{ position: [0, 0, 7], fov: 55 }`. */
  cameraConfig?: SceneCameraConfig;
  /**
   * Cấu hình giám sát FPS runtime. Mặc định
   * `{ windowMs: 1000, minFps: 40, sustainedMs: 2000 }` (Req 13.4).
   */
  fpsConfig?: FpsMonitorConfig;
  /**
   * Lớp tiện ích cho container. Mặc định phủ trọn vùng cha
   * (`absolute inset-0 w-full h-full`), giữ nguyên hành vi của Hero.
   */
  className?: string;
}

// ─── Defaults ────────────────────────────────────────────────────────────────

/** Camera mặc định — trùng cấu hình Hero hiện tại để hành vi không đổi. */
const DEFAULT_CAMERA: SceneCameraConfig = { position: [0, 0, 7], fov: 55 };

/** Cấu hình FPS mặc định (giống `Scene.tsx`): TB trượt 1s, sàn 40 FPS, sụt 2s. */
const DEFAULT_FPS_CONFIG: FpsMonitorConfig = {
  windowMs: 1000,
  minFps: 40,
  sustainedMs: 2000,
};

/** Lớp container mặc định: phủ trọn vùng cha. */
const DEFAULT_CONTAINER_CLASS = "absolute inset-0 w-full h-full";

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
 * render…). Khi có lỗi: ghi log `console.error` và render `fallback` để trang
 * vẫn dùng được (Req 3.6, 3.7).
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
    // Ghi log lỗi để chẩn đoán; không ném lại để tránh sập toàn trang (Req 3.7).
    console.error(
      "SceneCanvas: lỗi runtime trong Canvas 3D, chuyển sang fallback.",
      error,
      info,
    );
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// ─── FPS monitor (chạy bên trong Canvas) ─────────────────────────────────────

/**
 * FpsMonitor — component vô hình, render bên trong `<Canvas>`, nối dây giám sát
 * FPS runtime. Đọc `requestDowngrade` từ Quality_Manager và gọi
 * `useFpsMonitor(config, requestDowngrade)` để hạ Graphics_Tier khi FPS sụt liên
 * tục đủ lâu, không reload trang (Req 13.4). Dựa vào `useFrame` nên CHỈ hợp lệ
 * bên trong Canvas.
 */
function FpsMonitor({ config }: { config: FpsMonitorConfig }) {
  const { requestDowngrade } = useQualityTier();
  useFpsMonitor(config, requestDowngrade);
  return null;
}

// ─── Canvas (đọc tier/preset từ Quality_Manager) ─────────────────────────────

interface CanvasInnerProps {
  children: ReactNode;
  cameraConfig: SceneCameraConfig;
  fpsConfig: FpsMonitorConfig;
}

/**
 * CanvasInner — chỉ render phía client, BÊN TRONG `<QualityProvider>`.
 *
 * Đọc `tier`/`initialTier` từ Quality_Manager để cấu hình Canvas:
 * - `dpr`: giới hạn theo trần của tier bằng `clampDpr`, đổi động theo `tier` (Req 13.3).
 * - `gl.antialias`/`shadows`: lấy theo TRẦN (`initialTier`) và GIỮ ỔN ĐỊNH suốt
 *   vòng đời Canvas. Lý do: `gl.antialias` chỉ đặt được lúc tạo WebGL context;
 *   nếu đổi theo `tier` động (khi FpsMonitor hạ tier), R3F buộc tạo lại context
 *   → nháy hình và rủi ro mất context. `dpr` thì đổi động an toàn (R3F gọi
 *   setPixelRatio), nên vẫn theo `tier` để hạ độ phân giải.
 * - `alpha: true` + `background: transparent`: nền canvas trong suốt (Req 3.2).
 */
function CanvasInner({ children, cameraConfig, fpsConfig }: CanvasInnerProps) {
  const { tier, initialTier } = useQualityTier();

  // Guard `window` cho an toàn (CanvasInner chỉ chạy client nhưng vẫn phòng vệ).
  const rawDpr =
    typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

  const ceilingPreset = useMemo(() => getPreset(initialTier), [initialTier]);
  const glConfig = useMemo(
    () => ({ antialias: ceilingPreset.antialias, alpha: true }),
    [ceilingPreset.antialias],
  );

  return (
    <Canvas
      camera={cameraConfig}
      gl={glConfig}
      dpr={clampDpr(rawDpr, tier)}
      shadows={ceilingPreset.shadows}
      style={{ background: "transparent" }}
    >
      {/* Suspense bắt buộc: tài sản nạp bất đồng bộ (HDR, GLB, texture) sẽ
          "suspend". Không có ranh giới này, việc suspend làm gãy render của
          Canvas. `fallback={null}` vì cảnh mang tính trang trí. */}
      <Suspense fallback={null}>{children}</Suspense>
      <FpsMonitor config={fpsConfig} />
    </Canvas>
  );
}

// ─── WebGL availability (client-only, SSR-safe) ──────────────────────────────

/**
 * Đăng ký rỗng cho `useSyncExternalStore`: khả năng WebGL không thay đổi trong
 * vòng đời trang nên không cần lắng nghe sự kiện nào.
 */
const subscribeNoop = () => () => {};

/** Snapshot phía client: kiểm tra WebGL thật sự (chỉ chạy sau hydration). */
const getWebglSnapshot = () => isWebGLAvailable();

/**
 * Snapshot phía server / lần hydration đầu: luôn `false` để server và render
 * client đầu tiên đều hiển thị `fallback`, tránh hydration mismatch.
 */
const getWebglServerSnapshot = () => false;

// ─── Component xuất khẩu ─────────────────────────────────────────────────────

/**
 * SceneCanvas — bọc một cây 3D bất kỳ trong khung an toàn dùng chung.
 *
 * @example
 * ```tsx
 * <SceneCanvas cameraConfig={{ position: [0, 0, 7], fov: 55 }}>
 *   <Scene />
 * </SceneCanvas>
 * ```
 */
export function SceneCanvas({
  children,
  fallback = <HeroFallback />,
  cameraConfig = DEFAULT_CAMERA,
  fpsConfig = DEFAULT_FPS_CONFIG,
  className = DEFAULT_CONTAINER_CLASS,
}: SceneCanvasProps) {
  // `useSyncExternalStore` là cách chuẩn của React để đọc giá trị chỉ-có-ở-client
  // mà không gây cascading render (Req 3.3). Server + lần render client đầu tiên
  // trả `false` (fallback), sau hydration mới đọc khả năng WebGL thực tế.
  const webglAvailable = useSyncExternalStore(
    subscribeNoop,
    getWebglSnapshot,
    getWebglServerSnapshot,
  );

  return (
    <div className={className} aria-hidden="true">
      {webglAvailable ? (
        <QualityProvider>
          <CanvasErrorBoundary fallback={fallback}>
            <CanvasInner cameraConfig={cameraConfig} fpsConfig={fpsConfig}>
              {children}
            </CanvasInner>
          </CanvasErrorBoundary>
        </QualityProvider>
      ) : (
        fallback
      )}
    </div>
  );
}

export default SceneCanvas;
