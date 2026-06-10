"use client";

import React, { useRef, useEffect, useState } from "react";

interface MagneticButtonProps {
  children: React.ReactNode;
  className?: string;
  maxDisplacement?: number;
  onClick?: () => void;
  href?: string;
  target?: string;
  rel?: string;
  as?: "button" | "a";
}

/**
 * Magnetic button: translates toward cursor within bounded max displacement (Req 7.4, Property 19).
 */
export function MagneticButton({
  children,
  className = "",
  maxDisplacement = 12,
  onClick,
  href,
  target,
  rel,
  as: Tag = "button",
}: MagneticButtonProps) {
  const ref = useRef<HTMLElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const max = Math.max(rect.width, rect.height) * 0.8;
      if (dist < max) {
        const factor = (1 - dist / max) * 0.4;
        const tx = Math.min(Math.max(dx * factor, -maxDisplacement), maxDisplacement);
        const ty = Math.min(Math.max(dy * factor, -maxDisplacement), maxDisplacement);
        setTransform({ x: tx, y: ty });
      }
    };

    const handleMouseLeave = () => {
      setTransform({ x: 0, y: 0 });
    };

    el.addEventListener("mousemove", handleMouseMove);
    el.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      el.removeEventListener("mousemove", handleMouseMove);
      el.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [maxDisplacement]);

  const style = {
    transform: `translate(${transform.x}px, ${transform.y}px)`,
    transition: transform.x === 0 && transform.y === 0
      ? "transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)"
      : "transform 0.15s linear",
  };

  if (Tag === "a") {
    return (
      <a
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={href}
        target={target}
        rel={rel}
        className={className}
        style={style}
        onClick={onClick}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      className={className}
      style={style}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
