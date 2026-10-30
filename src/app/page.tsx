import { Navbar } from "@/components/public/Navbar";
import { SearchBar } from "@/components/public/SearchBar";
import { ProjectGallery } from "@/components/public/ProjectGallery";
import { Sparkles, ShieldCheck, LineChart, Trophy } from "lucide-react";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Navbar />

      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10 bg-cover bg-center opacity-40"
          style={{ backgroundImage: "url(/images/hero-bg.jpg)" }}
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#060b18]/40 via-[#060b18]/70 to-[#060b18]" />
        <div className="mx-auto max-w-7xl px-5 py-20 text-center sm:px-8 sm:py-28">
          <span className="animate-fade-in-up inline-flex items-center gap-2 rounded-full border border-electric-400/30 bg-electric-500/10 px-4 py-1.5 text-xs font-medium text-electric-300">
            <Sparkles size={14} /> Premium Computer Training Institute
          </span>
          <h1 className="animate-fade-in-up mx-auto mt-6 max-w-3xl text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
            Where Student Talent Becomes <span className="gradient-text">Real-World Projects</span>
          </h1>
          <p className="animate-fade-in-up mx-auto mt-5 max-w-2xl text-base text-slate-300 sm:text-lg">
            Explore our student project exhibition, or find your personal academic dashboard
            with syllabus progress, test marks, attendance, and more.
          </p>
          <div className="animate-fade-in-up mt-10">
            <SearchBar />
          </div>

          <div className="mx-auto mt-14 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3">
            <HeroStat icon={<Trophy size={18} />} label="Showcased Projects" value="Live Gallery" />
            <HeroStat icon={<LineChart size={18} />} label="Automatic Progress" value="Real-time Tracking" />
            <HeroStat icon={<ShieldCheck size={18} />} label="Private Records" value="Secure & Verified" />
          </div>
        </div>
      </section>

      <ProjectGallery />

      <footer className="border-t border-white/5 py-10 text-center text-sm text-slate-500">
        <p>© {new Date().getFullYear()} Brightcode Institute. All rights reserved.</p>
        <p className="mt-1">
          Need help? Contact the administration office or visit the{" "}
          <a href="/login" className="text-electric-300 hover:underline">
            student portal
          </a>
          .
        </p>
      </footer>
    </div>
  );
}

function HeroStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="glass-panel rounded-2xl px-4 py-4">
      <div className="flex items-center justify-center gap-2 text-electric-300">{icon}</div>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}
