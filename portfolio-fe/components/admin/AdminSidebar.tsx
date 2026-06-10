"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";

const NAV_ITEMS = [
  { href: "/admin",           label: "Dashboard",  icon: "⬡" },
  { href: "/admin/projects",  label: "Projects",   icon: "🗂" },
  { href: "/admin/skills",    label: "Skills",     icon: "⚡" },
  { href: "/admin/experiences", label: "Experience", icon: "📅" },
  { href: "/admin/posts",     label: "Blog Posts", icon: "✍️"  },
  { href: "/admin/contact",   label: "Inbox",      icon: "💬" },
  { href: "/admin/analytics", label: "Analytics",  icon: "📊" },
  { href: "/admin/upload",    label: "Upload",     icon: "📷" },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const clearToken = useAuthStore((s) => s.clearToken);

  function handleLogout() {
    clearToken();               // Property 26: token cleared
    router.replace("/admin/login");
  }

  return (
    <aside
      className="w-64 min-h-screen bg-surface border-r border-border flex flex-col"
      aria-label="Admin navigation"
    >
      {/* Brand */}
      <div className="px-6 py-5 border-b border-border">
        <Link href="/admin" className="text-lg font-bold gradient-text">
          Admin Panel
        </Link>
        <p className="text-xs text-muted mt-0.5">Portfolio Manager</p>
      </div>

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto py-4 px-3" aria-label="Admin menu">
        <ul role="list" className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted hover:bg-surface-2 hover:text-foreground"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  <span className="text-base" aria-hidden="true">{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Logout (Req 23.7) */}
      <div className="p-4 border-t border-border">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted hover:bg-red-500/10 hover:text-red-400 transition-all duration-200"
          aria-label="Log out of admin panel"
        >
          <span aria-hidden="true">🚪</span>
          Logout
        </button>
      </div>
    </aside>
  );
}
