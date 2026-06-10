"use client";

import { QueryProvider } from "@/components/providers/query-provider";
import { AdminShell } from "@/components/admin/AdminShell";

/**
 * Admin client layout — wraps all /admin/* routes in QueryProvider + AdminShell.
 * AdminShell handles login detection, so login page won't get sidebar/guard.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AdminShell>{children}</AdminShell>
    </QueryProvider>
  );
}
