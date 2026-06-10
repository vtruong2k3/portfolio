"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/**
 * Sends a page-view beacon on each route change (Req 22.1).
 * Uses navigator.sendBeacon (fire-and-forget) so it never blocks navigation.
 * No PII stored — only path and referrer (Req 22.3, Property 25).
 */
export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    // Deduplicate: don't fire twice for same path (React strict mode double-effect)
    if (pathname === lastPath.current) return;
    lastPath.current = pathname;

    const payload = JSON.stringify({
      path:      pathname,
      referrer:  document.referrer || undefined,
      userAgent: navigator.userAgent.split(" ").slice(0, 2).join(" "), // coarse UA
    });

    // Use sendBeacon for reliability on page unload; fall back to fetch
    const url = `${API_URL}/analytics/view`;
    const blob = new Blob([payload], { type: "application/json" });
    if (typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon(url, blob);
    } else {
      fetch(url, { method: "POST", body: payload, headers: { "Content-Type": "application/json" }, keepalive: true })
        .catch(() => { /* ignore analytics errors */ });
    }
  }, [pathname]);

  return <>{children}</>;
}
