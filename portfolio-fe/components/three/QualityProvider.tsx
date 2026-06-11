"use client";

/**
 * QualityProvider — React context cho Quality_Manager của cảnh 3D Hero.
 *
 * Provider này giữ trạng thái graphics tier hiện tại cùng "trần" (initialTier)
 * và phơi bày `requestDowngrade` để `useFpsMonitor` yêu cầu hạ tier khi FPS sụt.
 *
 * Tier ban đầu (cũng là TRẦN của phiên) được tính ĐỒNG BỘ ngay ở lần render đầu
 * bằng `useState(computeInitialTier)`. HeroScene chỉ chạy phía client (nạp qua
 * `next/dynamic({ ssr: false })`), nên việc đọc browser API trong initializer là
 * an toàn và KHÔNG gây lệch SSR. Tính đồng bộ này quan trọng: nó giúp `<Canvas>`
 * mount đúng MỘT LẦN với cấu hình renderer (antialias/shadows) ổn định theo trần,
 * thay vì mount ở `low` rồi bị đổi sang tier cao hơn (đổi `gl.antialias` buộc
 * R3F tạo lại WebGL context → nháy hình và rủi ro mất context).
 *
 * `initialTier` là TRẦN cố định: `downgradeTier` chỉ đi xuống và `requestDowngrade`
 * dùng cập nhật dạng hàm nên `tier` không bao giờ vượt `initialTier` (Req 8.4).
 *
 * _Requirements: 7.1, 8.3, 8.4, 10.2, 10.3_
 */

import {
  createContext,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  downgradeTier,
  getPreset,
  selectInitialTier,
  type DeviceSignals,
  type GraphicsTier,
  type TierPreset,
} from "@/lib/three/graphicsTier";

/** Giá trị context do Quality_Manager cung cấp. */
export interface QualityContextValue {
  /** Tier hiện đang áp dụng. */
  tier: GraphicsTier;
  /** Trần — không nâng vượt mức này trong cùng phiên (Req 8.4). */
  initialTier: GraphicsTier;
  /** Preset suy ra từ `tier`. */
  preset: TierPreset;
  /** Yêu cầu hạ tier; no-op khi đã ở `"low"`. */
  requestDowngrade: () => void;
}

/**
 * Tier mặc định thận trọng dùng khi không có browser API (ví dụ SSR).
 * `"low"` là an toàn nhất.
 */
const DEFAULT_TIER: GraphicsTier = "low";

export const QualityContext = createContext<QualityContextValue | null>(null);

/**
 * Tính tier ban đầu ĐỒNG BỘ từ tín hiệu thiết bị (chỉ chạy phía client).
 * Trả về `DEFAULT_TIER` khi không có `window` (an toàn cho mọi môi trường).
 */
function computeInitialTier(): GraphicsTier {
  if (typeof window === "undefined") {
    return DEFAULT_TIER;
  }
  const signals: DeviceSignals = {
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio,
    logicalCores:
      typeof navigator !== "undefined" &&
      typeof navigator.hardwareConcurrency === "number"
        ? navigator.hardwareConcurrency
        : undefined,
  };
  return selectInitialTier(signals);
}

interface QualityProviderProps {
  children: ReactNode;
}

export function QualityProvider({ children }: QualityProviderProps) {
  // Trần ban đầu: tính một lần, đồng bộ, KHÔNG đổi trong phiên.
  const [initialTier] = useState<GraphicsTier>(computeInitialTier);
  // Tier hiện tại: khởi tạo bằng trần, có thể bị hạ trong phiên.
  const [tier, setTier] = useState<GraphicsTier>(initialTier);

  // Hạ tier dùng cập nhật dạng hàm: chỉ đi xuống, không vượt trần (Req 8.4).
  const requestDowngrade = useCallback(() => {
    setTier((prev) => downgradeTier(prev));
  }, []);

  const value = useMemo<QualityContextValue>(
    () => ({
      tier,
      initialTier,
      preset: getPreset(tier),
      requestDowngrade,
    }),
    [tier, initialTier, requestDowngrade],
  );

  return (
    <QualityContext.Provider value={value}>{children}</QualityContext.Provider>
  );
}
