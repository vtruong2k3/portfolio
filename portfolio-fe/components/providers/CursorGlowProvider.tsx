"use client";

import React, { useEffect, useRef } from "react";

/**
 * CursorGlow provider: updates CSS variables --glow-x and --glow-y
 * to track the pointer on pointer devices (Req 7.1, Property 20).
 */
export function CursorGlowProvider({ children }: { children: React.ReactNode }) {
  const prefersReducedMotion =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  useEffect(() => {
    if (prefersReducedMotion) return;

    const onMove = (e: MouseEvent) => {
      document.documentElement.style.setProperty("--glow-x", `${e.clientX}px`);
      document.documentElement.style.setProperty("--glow-y", `${e.clientY}px`);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [prefersReducedMotion]);

  return <>{children}</>;
}
