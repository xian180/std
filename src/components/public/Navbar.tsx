import Link from "next/link";
import { GraduationCap } from "lucide-react";

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-[#060b18]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-900/40">
            <GraduationCap size={20} />
          </span>
          <span className="text-lg font-semibold tracking-tight text-white">
            Brightcode <span className="gradient-text">Institute</span>
          </span>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="rounded-xl px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white sm:px-4"
          >
            Student Login
          </Link>
          <Link
            href="/admin/login"
            className="btn-primary rounded-xl px-3 py-2 text-sm font-medium text-white sm:px-4"
          >
            Admin / Staff
          </Link>
        </nav>
      </div>
    </header>
  );
}
