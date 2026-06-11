"use client";

/**
 * useQualityTier — hook đọc giá trị Quality_Manager từ `QualityProvider`.
 *
 * Trả về tier hiện tại, trần ban đầu, preset suy ra, và `requestDowngrade`.
 * Ném lỗi rõ ràng nếu được dùng ngoài phạm vi `QualityProvider`.
 *
 * _Requirements: 7.1, 8.3, 8.4, 10.2, 10.3_
 */

import { useContext } from "react";
import {
  QualityContext,
  type QualityContextValue,
} from "@/components/three/QualityProvider";

export function useQualityTier(): QualityContextValue {
  const context = useContext(QualityContext);
  if (context === null) {
    throw new Error(
      "useQualityTier must be used within a <QualityProvider>. " +
        "Wrap the Hero scene tree in <QualityProvider> before calling this hook.",
    );
  }
  return context;
}
