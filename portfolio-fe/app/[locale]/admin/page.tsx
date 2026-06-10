import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Dashboard | Admin" };

const QUICK_LINKS = [
  { href: "/admin/projects",    label: "Projects",   icon: "🗂", desc: "Manage portfolio projects" },
  { href: "/admin/skills",      label: "Skills",     icon: "⚡", desc: "Manage technical skills" },
  { href: "/admin/experiences", label: "Experience", icon: "📅", desc: "Manage career timeline" },
  { href: "/admin/posts",       label: "Blog Posts", icon: "✍️", desc: "Manage blog content" },
  { href: "/admin/contact",     label: "Inbox",      icon: "💬", desc: "View contact messages" },
  { href: "/admin/analytics",   label: "Analytics",  icon: "📊", desc: "View page analytics" },
  { href: "/admin/upload",      label: "Upload",     icon: "📷", desc: "Upload project images" },
];

export default function AdminDashboardPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted text-sm mt-1">Welcome back. Manage your portfolio content below.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {QUICK_LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="glass rounded-2xl p-6 border border-border hover:border-primary/30 transition-all duration-300 group"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-xl shrink-0 group-hover:scale-110 transition-transform duration-300" aria-hidden="true">
                {item.icon}
              </div>
              <div>
                <p className="font-semibold text-foreground group-hover:text-primary transition-colors duration-200">{item.label}</p>
                <p className="text-xs text-muted mt-0.5">{item.desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
