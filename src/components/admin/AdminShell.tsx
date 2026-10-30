"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  BookOpenCheck,
  ClipboardList,
  CalendarCheck2,
  FolderGit2,
  ShieldCheck,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import clsx from "clsx";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, roles: ["admin", "teacher"] },
  { href: "/admin/students", label: "Students", icon: Users, roles: ["admin", "teacher"] },
  { href: "/admin/courses", label: "Courses & Syllabus", icon: BookOpenCheck, roles: ["admin", "teacher"] },
  { href: "/admin/tests", label: "Tests & Marks", icon: ClipboardList, roles: ["admin", "teacher"] },
  { href: "/admin/attendance", label: "Attendance", icon: CalendarCheck2, roles: ["admin", "teacher"] },
  { href: "/admin/projects", label: "Projects", icon: FolderGit2, roles: ["admin", "teacher"] },
  { href: "/admin/users", label: "Users & Roles", icon: ShieldCheck, roles: ["admin"] },
];

export function AdminShell({ children, name, role }: { children: React.ReactNode; name: string; role: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen lg:flex">
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-50 w-64 transform border-r border-white/5 bg-[#0a1226] p-5 transition-transform lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="mb-8 flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white">
              <ShieldCheck size={18} />
            </span>
            <span className="text-sm font-semibold text-white">Admin Console</span>
          </Link>
          <button className="text-slate-400 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>
        <nav className="space-y-1">
          {NAV.filter((n) => n.roles.includes(role)).map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={clsx(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  active ? "bg-electric-500/15 text-electric-300" : "text-slate-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-10 border-t border-white/5 pt-4">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-300"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {mobileOpen && <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setMobileOpen(false)} />}

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/5 bg-[#060b18]/90 px-5 py-4 backdrop-blur sm:px-8">
          <button className="text-slate-300 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu size={22} />
          </button>
          <div className="ml-auto text-right">
            <p className="text-sm font-medium text-white">{name}</p>
            <p className="text-xs capitalize text-slate-500">{role}</p>
          </div>
        </header>
        <main className="flex-1 px-5 py-6 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
