"use client";

/**
 * Hook giám sát FPS trong runtime cho cảnh R3F.
 *
 * Tiêu thụ logic thuần từ `lib/three/fpsMonitor`: mỗi frame đẩy một mẫu
 * delta-time vào state (giữ trong ref để tránh re-render), tính FPS trung bình
 * trượt và quyết định khi nào nên hạ Graphics_Tier.
 *
 * Khi `shouldDowngrade` chuyển sang `true`, gọi `onDowngrade()` ĐÚNG MỘT LẦN rồi
 * reset bộ đếm `belowThresholdMs` (qua `initFpsState()`), cho phép phát hiện các
 * đợt sụt FPS kéo dài tiếp theo trong cùng phiên.
 *
 * LƯU Ý: Hook này CHỈ hợp lệ khi dùng bên trong `<Canvas>` của @react-three/fiber
 * vì nó dựa vào `useFrame`.
 *
 * _Requirements: 8.1, 8.2, 8.3_
 */

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";

import {
  initFpsState,
  pushSample,
  type FpsMonitorConfig,
  type FpsMonitorState,
} from "@/lib/three/fpsMonitor";

export function useFpsMonitor(
  config: FpsMonitorConfig,
  onDowngrade: () => void,
): void {
  // Giữ state giám sát trong ref để cập nhật mỗi frame không gây re-render.
  const stateRef = useRef<FpsMonitorState>(initFpsState());

  // Giữ callback trong ref để tránh stale closure mà không cần phụ thuộc.
  const onDowngradeRef = useRef(onDowngrade);
  onDowngradeRef.current = onDowngrade;

  useFrame((_, delta) => {
    const next = pushSample(
      stateRef.current,
      { deltaMs: delta * 1000 },
      config,
    );

    if (next.shouldDowngrade) {
      // Gọi callback đúng một lần, sau đó reset bộ đếm để có thể phát hiện
      // các đợt sụt FPS kéo dài tiếp theo.
      onDowngradeRef.current();
      stateRef.current = initFpsState();
      return;
    }

    stateRef.current = next;
  });
}
