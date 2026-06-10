"use client";

import React, { useRef, useEffect } from "react";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: "cyan" | "violet" | "none";
}

export function GlassCard({ children, className = "", glowColor = "cyan" }: GlassCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty("--card-glow-x", `${x}%`);
      card.style.setProperty("--card-glow-y", `${y}%`);
    };

    card.addEventListener("mousemove", handleMouseMove);
    return () => card.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const glowClass = glowColor === "cyan" ? "card-glow" : glowColor === "violet" ? "card-glow" : "";

  return (
    <div
      ref={cardRef}
      className={`glass rounded-2xl ${glowClass} ${className}`}
    >
      {children}
    </div>
  );
}
