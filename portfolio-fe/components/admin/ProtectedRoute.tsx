"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";

/**
 * Redirects unauthenticated users to /admin/login (Req 23.3, Property 14).
 * Uses a mounted check to avoid Zustand persist hydration spinner on first render.
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router    = useRouter();
  const token     = useAuthStore((s) => s.token);
  const [mounted, setMounted] = useState(false);

  // Wait for client-side hydration before checking token
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (mounted && !token) {
      router.replace("/admin/login");
    }
  }, [token, router, mounted]);

  // Pre-hydration: show nothing (avoids flash)
  if (!mounted) return null;

  // Post-hydration but no token: brief spinner before redirect kicks in
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div
          className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin"
          aria-label="Redirecting to login..."
        />
      </div>
    );
  }

  return <>{children}</>;
}
