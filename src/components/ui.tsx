import type { ReactNode } from "react";
import clsx from "clsx";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx("card-surface rounded-2xl p-5 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.6)]", className)}>
      {children}
    </div>
  );
}

export function Badge({
  children,
  color = "blue",
  className,
}: {
  children: ReactNode;
  color?: "blue" | "green" | "amber" | "gray" | "red" | "purple";
  className?: string;
}) {
  const colors: Record<string, string> = {
    blue: "bg-blue-500/15 text-blue-300 border-blue-400/30",
    green: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
    amber: "bg-amber-500/15 text-amber-300 border-amber-400/30",
    gray: "bg-slate-500/15 text-slate-300 border-slate-400/30",
    red: "bg-rose-500/15 text-rose-300 border-rose-400/30",
    purple: "bg-violet-500/15 text-violet-300 border-violet-400/30",
  };
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium",
        colors[color],
        className
      )}
    >
      {children}
    </span>
  );
}

export function ProgressBar({
  percent,
  color = "#2f6fff",
  heightClass = "h-2.5",
}: {
  percent: number;
  color?: string;
  heightClass?: string;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className={clsx("progress-track w-full overflow-hidden rounded-full", heightClass)}>
      <div
        className="progress-fill h-full rounded-full"
        style={{ width: `${clamped}%`, background: `linear-gradient(90deg, ${color}, #7fa8ff)` }}
      />
    </div>
  );
}

export function StatCard({
  icon,
  label,
  value,
  sub,
  color = "#2f6fff",
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  sub?: string;
  color?: string;
}) {
  return (
    <Card className="hover-lift flex items-start gap-4">
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
        style={{ background: `${color}22`, color }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm text-slate-400">{label}</p>
        <p className="mt-0.5 truncate text-2xl font-semibold text-white">{value}</p>
        {sub ? <p className="mt-0.5 text-xs text-slate-500">{sub}</p> : null}
      </div>
    </Card>
  );
}

export function Button({
  children,
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" | "outline" }) {
  const base = "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed";
  const variants: Record<string, string> = {
    primary: "btn-primary text-white",
    ghost: "bg-white/5 text-slate-200 hover:bg-white/10 border border-white/10",
    danger: "bg-rose-500/90 text-white hover:bg-rose-500",
    outline: "border border-electric-400/40 text-electric-300 hover:bg-electric-500/10",
  };
  return (
    <button className={clsx(base, variants[variant], className)} {...props}>
      {children}
    </button>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={clsx(
        "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition focus:border-electric-400/60 focus:bg-white/[0.07]",
        props.className
      )}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={clsx(
        "w-full rounded-xl border border-white/10 bg-[#0d1730] px-4 py-2.5 text-sm text-white outline-none transition focus:border-electric-400/60",
        props.className
      )}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={clsx(
        "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition focus:border-electric-400/60 focus:bg-white/[0.07]",
        props.className
      )}
    />
  );
}

export function EmptyState({ icon, title, description }: { icon?: ReactNode; title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center">
      {icon ? <div className="mb-2 text-4xl opacity-70">{icon}</div> : null}
      <p className="text-base font-medium text-slate-200">{title}</p>
      {description ? <p className="max-w-sm text-sm text-slate-500">{description}</p> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("skeleton rounded-xl", className)} />;
}

export function SectionHeading({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-xl font-semibold text-white sm:text-2xl">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-400">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
