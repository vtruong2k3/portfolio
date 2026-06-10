"use client";

import { usePathname } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { ProtectedRoute } from "@/components/admin/ProtectedRoute";

/**
 * AdminShell — wraps admin pages with auth guard + sidebar.
 * Automatically bypasses protection on /admin/login path.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname.endsWith("/admin/login");

  // Login page: render children directly, no guard/sidebar
  if (isLoginPage) return <>{children}</>;

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-background">
        <AdminSidebar />
        <main
          id="admin-content"
          className="flex-1 overflow-auto"
          aria-label="Admin content"
        >
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}
