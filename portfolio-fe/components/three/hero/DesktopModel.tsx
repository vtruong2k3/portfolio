"use client";

/**
 * DesktopModel — mô hình bàn làm việc lập trình viên (Programmer Desktop), vật
 * thể 3D trung tâm (focal) của Hero, thay thế TorusKnot (`CentralObject`).
 *
 * Component R3F (sub-scene) này render BÊN TRONG `<Canvas>` (qua
 * `SceneCanvas`/`HeroScene`) chứ KHÔNG tự tạo `<Canvas>` riêng. Hành vi chính:
 *
 * - **Nạp GLB đã tối ưu**: đường dẫn lấy qua `resolveModelPath("programmer-desktop")`
 *   (logic thuần) → ưu tiên `models/programmer-desktop.optimized.glb`, lùi về
 *   tệp nguồn kèm cảnh báo khi biến thể tối ưu bị thiếu (Req 2.5, 2.8). GLB nạp
 *   bất đồng bộ qua drei `useGLTF` (suspend).
 *
 * - **Vật liệu tông tối + điểm nhấn phát sáng**: traverse mọi mesh, áp tông tối
 *   theo Art_Direction và đặt ít nhất một điểm nhấn `emissive` dùng màu thuộc
 *   Accent_Palette (cyan) (Req 4.2). Vật liệu được clone trước khi sửa để không
 *   làm bẩn cache dùng chung của `useGLTF`.
 *
 * - **Căn giữa + vừa khung**: dùng `computeNormalizationTransform` (logic thuần)
 *   để đưa tâm hộp bao về gốc và chuẩn hóa cạnh lớn nhất về 1.0; rồi
 *   `computeFitScale` để thu tỉ lệ cho vừa trọn khung hình, không bị cắt ở bất
 *   kỳ cạnh nào (Req 4.3). Tỉ lệ được tính lại khi viewport đổi, **debounce
 *   500ms** sau khi viewport ngừng thay đổi (Req 4.4).
 *
 * - **Giảm chi tiết/đổ bóng ở tier `low`**: `castShadow`/`receiveShadow` và
 *   `envMapIntensity` theo preset của tier (Req 4.5).
 *
 * - **Chuyển động bị kẹp khi giảm chuyển động**: dao động trôi nhẹ theo Y; khi
 *   Reduced_Motion_Mode bật, biên độ bị kẹp qua `reducedAmplitude` về ngưỡng
 *   giảm nhẹ của Motion_Config (Req 4.6).
 *
 * - **Loading_State + timeout 10s**: bọc trong `<Suspense>` với Loading_State
 *   chiếm trọn nền Hero (Req 4.7). Nếu chưa nạp xong trong 10 giây → gọi
 *   `onError` để cảnh chuyển sang Fallback_Visual (Req 4.8). Phơi `onLoaded` để
 *   Terminal_Screen biết thời điểm mount (Req 5.1).
 *
 * Cảnh chứa component này đã mang `aria-hidden="true"` ở `SceneCanvas` (Req 4.10).
 *
 * _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 2.5, 2.8_
 */

import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import {
  Box3,
  Color,
  DoubleSide,
  type Group,
  type Material,
  type Mesh,
  type Object3D,
  type PerspectiveCamera,
} from "three";

import { resolveModelPath } from "@/lib/three/assetPath";
import { TerminalScreen, type TerminalScreenProps } from "./TerminalScreen";
import {
  computeNormalizationTransform,
  type BoundingBox,
} from "@/lib/three/bbox";
import { computeFitScale, type ViewportInfo } from "@/lib/three/composition";
import {
  floatOffset,
  reducedAmplitude,
  type FloatConfig,
} from "@/lib/three/animation";
import { PALETTE } from "@/lib/three/palette";
import type { TierPreset } from "@/lib/three/graphicsTier";

/** Tên logic của Desktop_Model dùng cho `resolveModelPath`. */
const MODEL_NAME = "programmer-desktop";

/** Thời gian chờ tối đa khi nạp Desktop_Model trước khi báo lỗi (ms) — Req 4.8. */
const LOAD_TIMEOUT_MS = 10_000;

/** Độ trễ tính lại căn giữa/tỉ lệ sau khi viewport ngừng đổi (ms) — Req 4.4. */
const RESIZE_DEBOUNCE_MS = 500;

/**
 * Bán kính bao của mô hình SAU chuẩn hóa (cạnh lớn nhất = 1.0).
 *
 * Một hộp đơn vị có nửa đường chéo bằng `sqrt(3)/2 ≈ 0.866`; dùng giá trị này
 * làm bán kính bao để `computeFitScale` đảm bảo mọi góc của hộp bao vẫn nằm
 * trọn trong khung hình, không bị cắt ở bất kỳ cạnh nào (Req 4.3).
 */
const NORMALIZED_BOUNDING_RADIUS = Math.sqrt(3) / 2;

/** Tông tối nền của vật liệu theo Art_Direction (navy đậm). */
const DARK_TONE = "#0b1020";

/** Cường độ điểm nhấn phát sáng (emissive) dùng màu Accent_Palette (Req 4.2). */
const ACCENT_EMISSIVE_INTENSITY = 0.4;

/** Cấu hình dao động trôi nhẹ theo phương Y của Desktop_Model. */
const FLOAT_CONFIG: FloatConfig = {
  amplitude: 0.15,
  frequency: 0.5,
  phase: 0,
};

/**
 * Vị trí và kích thước bề mặt màn hình của Desktop_Model trong KHÔNG GIAN ĐÃ
 * CHUẨN HÓA (hộp đơn vị, cạnh lớn nhất = 1.0, tâm tại gốc). Terminal_Screen được
 * neo tại đây để nằm trùng bề mặt màn hình của bàn làm việc (Req 5.1).
 *
 * Anchor là con của nhóm `outerRef` (sibling với nhóm chuẩn hóa) nên dùng chung
 * hệ tọa độ "mô hình đã căn giữa, đơn vị" — đặt màn hình ở phần trên, hơi lùi về
 * sau và hướng mặt về +Z (về phía camera).
 */
const MONITOR_ANCHOR: TerminalScreenProps["anchor"] = {
  position: [0, 0.18, -0.05],
  size: [0.46, 0.28],
};

/**
 * Độ trễ tối đa cho phép để Terminal_Screen mount sau khi Desktop_Model nạp
 * xong (ms). Theo Req 5.1 phải trong vòng 1 giây; mount ngay khi `onLoaded`
 * chạy nên thực tế gần như tức thì.
 */
const TERMINAL_MOUNT_DELAY_MS = 0;

// ─── Local error boundary cho Terminal_Screen (Req 5.8) ──────────────────────

interface TerminalScreenBoundaryProps {
  /** Anchor dùng để vẽ panel đen đồng nhất khi Terminal_Screen ném lỗi. */
  anchor: TerminalScreenProps["anchor"];
  children: ReactNode;
}

interface TerminalScreenBoundaryState {
  hasError: boolean;
}

/**
 * Panel đen đồng nhất, không chữ — fallback khi Terminal_Screen ném lỗi runtime.
 * Giữ nguyên bố cục cảnh (đúng vị trí/kích thước màn hình) và không làm gián
 * đoạn việc render Desktop_Model (Req 5.8).
 */
function BlackScreenPanel({
  anchor,
}: {
  anchor: TerminalScreenProps["anchor"];
}) {
  return (
    <mesh position={anchor.position}>
      <planeGeometry args={anchor.size} />
      <meshBasicMaterial color="#000000" side={DoubleSide} />
    </mesh>
  );
}

/**
 * TerminalScreenBoundary — error boundary CỤC BỘ bao quanh Terminal_Screen.
 *
 * Nếu Terminal_Screen ném lỗi runtime (ví dụ lỗi nội dung/texture không xử lý
 * được nội bộ), boundary ghi log và chuyển sang render một panel nền đen đồng
 * nhất tại đúng anchor, KHÔNG để lỗi lan ra làm sập việc render Desktop_Model
 * hay phá vỡ bố cục cảnh (Req 5.8).
 */
class TerminalScreenBoundary extends Component<
  TerminalScreenBoundaryProps,
  TerminalScreenBoundaryState
> {
  constructor(props: TerminalScreenBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): TerminalScreenBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(
      "TerminalScreen: lỗi runtime, chuyển sang panel đen đồng nhất.",
      error,
      info,
    );
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return <BlackScreenPanel anchor={this.props.anchor} />;
    }
    return this.props.children;
  }
}

export interface DesktopModelProps {
  /** Khi bật Reduced_Motion_Mode, kẹp biên độ dao động (gần như tĩnh) — Req 4.6. */
  reducedMotion: boolean;
  /** Preset của Graphics_Tier hiện tại; ở `low` giảm chi tiết/đổ bóng — Req 4.5. */
  preset: TierPreset;
  /**
   * Cờ cho biết biến thể GLB đã tối ưu có tồn tại tại đường dẫn dự kiến hay
   * không. Mặc định `true` (Asset_Pipeline dự kiến tạo ra biến thể tối ưu).
   * Khi `false`, component lùi về tệp nguồn và ghi cảnh báo (Req 2.8).
   */
  optimizedExists?: boolean;
  /** Báo Desktop_Model đã nạp xong (để Terminal_Screen mount) — Req 5.1. */
  onLoaded?: () => void;
  /** Báo lỗi nạp (timeout 10s hoặc tải thất bại) để cảnh chuyển fallback — Req 4.8. */
  onError?: (error: unknown) => void;
}

/**
 * Áp tông tối + điểm nhấn phát sáng Accent_Palette cho một vật liệu (đã clone).
 *
 * Trả về `true` nếu đã đặt được điểm nhấn `emissive` Accent_Palette trên vật
 * liệu này (dùng để đảm bảo "ít nhất một" điểm nhấn — Req 4.2).
 */
function applyDarkAccentMaterial(
  material: Material,
  preset: TierPreset,
  withAccent: boolean,
): boolean {
  // Vật liệu hỗ trợ màu (MeshStandard/Physical/Basic...) — thu hẹp kiểu mềm.
  const mat = material as Material & {
    color?: Color;
    emissive?: Color;
    emissiveIntensity?: number;
    envMapIntensity?: number;
  };

  if (mat.color) {
    mat.color.set(DARK_TONE);
  }

  // Ở tier `low` giảm phản chiếu môi trường để nhẹ hơn (Req 4.5).
  if (typeof mat.envMapIntensity === "number") {
    mat.envMapIntensity = preset.tier === "low" ? 0.2 : 1;
  }

  if (withAccent && mat.emissive) {
    mat.emissive.set(PALETTE.cyan);
    mat.emissiveIntensity =
      preset.tier === "low" ? ACCENT_EMISSIVE_INTENSITY * 0.5 : ACCENT_EMISSIVE_INTENSITY;
    mat.needsUpdate = true;
    return true;
  }

  // Các mesh còn lại giữ emissive tối để không cướp điểm nhấn.
  if (mat.emissive) {
    mat.emissive.set("#000000");
    mat.emissiveIntensity = 0;
  }
  mat.needsUpdate = true;
  return false;
}

interface DesktopModelContentProps {
  path: string;
  reducedMotion: boolean;
  preset: TierPreset;
  onLoaded: () => void;
}

/**
 * Nội dung 3D thực sự của Desktop_Model — chỉ mount SAU khi `useGLTF` nạp xong
 * (trước đó component này "suspend" và `<Suspense>` hiển thị Loading_State).
 */
function DesktopModelContent({
  path,
  reducedMotion,
  preset,
  onLoaded,
}: DesktopModelContentProps) {
  const { scene } = useGLTF(path);
  const { size, camera } = useThree();

  const outerRef = useRef<Group>(null);

  // Clone cảnh GLB để áp vật liệu mà không làm bẩn cache dùng chung của useGLTF.
  const model = useMemo<Object3D>(() => scene.clone(true), [scene]);

  // Áp tông tối + điểm nhấn phát sáng Accent_Palette; cấu hình đổ bóng/chi tiết
  // theo preset của tier (Req 4.2, 4.5). Vật liệu được clone trước khi sửa.
  useMemo(() => {
    let accentApplied = false;
    model.traverse((obj) => {
      const mesh = obj as Mesh;
      if (!mesh.isMesh) return;

      mesh.castShadow = preset.shadows;
      mesh.receiveShadow = preset.shadows;

      const material = mesh.material;
      if (Array.isArray(material)) {
        mesh.material = material.map((m) => {
          const cloned = m.clone();
          const applied = applyDarkAccentMaterial(cloned, preset, !accentApplied);
          accentApplied = accentApplied || applied;
          return cloned;
        });
      } else if (material) {
        const cloned = material.clone();
        const applied = applyDarkAccentMaterial(cloned, preset, !accentApplied);
        accentApplied = accentApplied || applied;
        mesh.material = cloned;
      }
    });
  }, [model, preset]);

  // Chuẩn hóa: đưa tâm hộp bao về gốc và chuẩn hóa cạnh lớn nhất về 1.0 (Req 4.3).
  const normalization = useMemo(() => {
    const box = new Box3().setFromObject(model);
    const bbox: BoundingBox = {
      min: [box.min.x, box.min.y, box.min.z],
      max: [box.max.x, box.max.y, box.max.z],
    };
    return computeNormalizationTransform(bbox);
  }, [model]);

  // Kích thước viewport đã debounce: tính lại sau 500ms khi viewport ngừng đổi
  // (Req 4.4). Khởi tạo bằng kích thước hiện tại để lần đầu căn giữa tức thì.
  const [debouncedSize, setDebouncedSize] = useState({
    width: size.width,
    height: size.height,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSize({ width: size.width, height: size.height });
    }, RESIZE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [size.width, size.height]);

  // Tỉ lệ vừa khung hình tính từ kích thước đã debounce + camera (Req 4.3, 4.4).
  const fitScale = useMemo(() => {
    const perspective = camera as PerspectiveCamera;
    const viewport: ViewportInfo = {
      width: debouncedSize.width,
      height: debouncedSize.height,
      fovDeg: perspective.fov,
      cameraZ: Math.abs(camera.position.z),
    };
    return computeFitScale(NORMALIZED_BOUNDING_RADIUS, viewport);
  }, [debouncedSize.width, debouncedSize.height, camera]);

  // Vị trí của nhóm chuẩn hóa: `pNew = (p + translate) * scale`. Trong three,
  // group áp `world = scale * local + position`, nên position = translate*scale.
  const normPosition = useMemo<[number, number, number]>(
    () => [
      normalization.translate[0] * normalization.scale,
      normalization.translate[1] * normalization.scale,
      normalization.translate[2] * normalization.scale,
    ],
    [normalization],
  );

  // Biên độ trôi đã điều chỉnh theo Reduced_Motion_Mode (Req 4.6).
  const floatConfig = useMemo(
    () => reducedAmplitude(FLOAT_CONFIG, reducedMotion),
    [reducedMotion],
  );

  // Trạng thái mount Terminal_Screen: chỉ bật SAU khi Desktop_Model nạp xong.
  // Vì DesktopModelContent chỉ render khi `useGLTF` đã resolve, cờ này bật ngay
  // khi component mount → Terminal_Screen xuất hiện trong vòng 1s (Req 5.1).
  const [terminalMounted, setTerminalMounted] = useState(false);

  // Báo đã nạp xong (đúng một lần) và mount Terminal_Screen (Req 5.1).
  useEffect(() => {
    onLoaded();
    const timer = setTimeout(
      () => setTerminalMounted(true),
      TERMINAL_MOUNT_DELAY_MS,
    );
    return () => clearTimeout(timer);
  }, [onLoaded]);

  useFrame((state) => {
    const group = outerRef.current;
    if (!group) return;
    // Dao động trôi nhẹ theo Y (bị kẹp biên độ khi reduced motion — Req 4.6).
    group.position.y = floatOffset(state.clock.elapsedTime, floatConfig);
  });

  return (
    <group ref={outerRef} scale={fitScale}>
      <group scale={normalization.scale} position={normPosition}>
        <primitive object={model} />
      </group>

      {/* Terminal_Screen neo trên bề mặt màn hình, mount sau khi model nạp xong
          (Req 5.1). Bọc trong error boundary cục bộ → panel đen đồng nhất nếu
          ném lỗi runtime, không phá bố cục cảnh (Req 5.8). Anchor nằm trong hệ
          tọa độ đã chuẩn hóa (đơn vị, căn giữa) của nhóm `outerRef`. */}
      {terminalMounted && (
        <TerminalScreenBoundary anchor={MONITOR_ANCHOR}>
          <TerminalScreen
            reducedMotion={reducedMotion}
            tier={preset.tier}
            anchor={MONITOR_ANCHOR}
          />
        </TerminalScreenBoundary>
      )}
    </group>
  );
}

/**
 * LoadingState — nền tải chiếm trọn vùng Hero trong khi GLB đang nạp (Req 4.7).
 *
 * Vì nằm bên trong `<Canvas>`, Loading_State là một mặt phẳng tối lớn (đủ phủ
 * khung hình) giữ tông Art_Direction thay vì DOM overlay.
 */
function LoadingState() {
  return (
    <mesh position={[0, 0, -1]} scale={[100, 100, 1]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial color={DARK_TONE} />
    </mesh>
  );
}

export function DesktopModel({
  reducedMotion,
  preset,
  optimizedExists = true,
  onLoaded,
  onError,
}: DesktopModelProps) {
  // Phân giải đường dẫn GLB (ưu tiên biến thể tối ưu) — logic thuần (Req 2.5, 2.8).
  const resolved = useMemo(
    () => resolveModelPath(MODEL_NAME, optimizedExists),
    [optimizedExists],
  );

  // Ghi cảnh báo khi phải lùi về tệp nguồn vì thiếu biến thể tối ưu (Req 2.8).
  useEffect(() => {
    if (resolved.optimizedMissing) {
      console.warn(
        `DesktopModel: biến thể đã tối ưu của "${MODEL_NAME}" bị thiếu; ` +
          `lùi về tệp nguồn "${resolved.path}".`,
      );
    }
  }, [resolved]);

  // Cờ đã nạp xong để hủy timeout và tránh báo lỗi sai sau khi đã thành công.
  const loadedRef = useRef(false);

  const handleLoaded = useCallback(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    onLoaded?.();
  }, [onLoaded]);

  // Timeout 10s: nếu chưa nạp xong → báo lỗi để cảnh chuyển Fallback_Visual (Req 4.8).
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!loadedRef.current) {
        onError?.(
          new Error(
            `DesktopModel: nạp "${resolved.path}" quá ${LOAD_TIMEOUT_MS}ms (timeout).`,
          ),
        );
      }
    }, LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [onError, resolved.path]);

  return (
    <Suspense fallback={<LoadingState />}>
      <DesktopModelContent
        path={resolved.path}
        reducedMotion={reducedMotion}
        preset={preset}
        onLoaded={handleLoaded}
      />
    </Suspense>
  );
}

export default DesktopModel;
