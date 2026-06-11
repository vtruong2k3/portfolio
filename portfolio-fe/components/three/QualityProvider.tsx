"use client";

/**
 * QualityProvider — React context cho Quality_Manager của cảnh 3D Hero.
 *
 * Provider này giữ trạng thái graphics tier hiện tại cùng "trần" (initialTier)
 * và phơi bày `requestDowngrade` để `useFpsMonitor` yêu cầu hạ tier khi FPS sụt.
 *
 * Lựa chọn tránh lệch SSR/CSR (Req 10.2, 10.3):
 * - Trước khi mount, dùng tier mặc định thận trọng `"low"` để render server và
 *   render client lần đầu cho ra cùng kết quả (không đọc browser API khi render).
 * - Trong `useEffect` (chỉ chạy phía client, kèm guard `typeof window !== "undefined"`),
 *   thu thập `DeviceSignals` rồi gọi `selectInitialTier` để nâng tier lên mức phù
 *   hợp thiết bị. Tier tính được tại thời điểm này cũng là TRẦN của cả phiên: do
 *   `downgradeTier` chỉ đi xuống và `requestDowngrade` dùng cập nhật dạng hàm, tier
 *   không bao giờ vượt `initialTier` (Req 8.4).
 *
 * _Requirements: 7.1, 8.3, 8.4, 10.2, 10.3_
 */

import {
  createContext,
  useCallback,
  useEffect,
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
 * Tier mặc định thận trọng dùng trước khi mount để tránh lệch SSR.
 * `"low"` là an toàn nhất: nội dung server và client lần đầu khớp nhau.
 */
const DEFAULT_TIER: GraphicsTier = "low";

export const QualityContext = createContext<QualityContextValue | null>(null);

interface QualityProviderProps {
  children: ReactNode;
}

export function QualityProvider({ children }: QualityProviderProps) {
  // Tier hiện tại (có thể bị hạ trong phiên).
  const [tier, setTier] = useState<GraphicsTier>(DEFAULT_TIER);
  // Trần ban đầu — được đặt một lần sau khi thu thập tín hiệu thiết bị.
  const [initialTier, setInitialTier] = useState<GraphicsTier>(DEFAULT_TIER);

  useEffect(() => {
    // Client guard: chỉ truy cập browser API sau khi mount phía client.
    if (typeof window === "undefined") {
      return;
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

    const selected = selectInitialTier(signals);
    setInitialTier(selected);
    setTier(selected);
  }, []);

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
