"use client";

import { useEffect, useState, useCallback } from "react";
import { CheckCircle2, Circle, Clock, BookOpenCheck } from "lucide-react";
import { Badge, Card, EmptyState, ProgressBar, SectionHeading, Select, Skeleton } from "@/components/ui";

type Topic = { id: number; title: string; status: string; completedAt: string | null; remarks: string | null };
type ModuleT = { id: number; title: string; topics: Topic[] };
type SyllabusData = {
  courses: { courseId: number; courseName: string }[];
  selectedCourseId: number | null;
  modules: ModuleT[];
  summary: { total: number; completed: number; inProgress: number; pending: number; percent: number };
};

const STATUS_META: Record<string, { label: string; color: "green" | "blue" | "amber"; icon: typeof CheckCircle2 }> = {
  completed: { label: "Completed", color: "green", icon: CheckCircle2 },
  in_progress: { label: "In Progress", color: "blue", icon: Clock },
  pending: { label: "Pending", color: "amber", icon: Circle },
};

export default function SyllabusPage() {
  const [data, setData] = useState<SyllabusData | null>(null);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "completed" | "in_progress" | "pending">("all");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (cid: number | null) => {
    setLoading(true);
    const url = cid ? `/api/student/syllabus?courseId=${cid}` : "/api/student/syllabus";
    const res = await fetch(url);
    const d = await res.json();
    setData(d);
    if (d.selectedCourseId) setCourseId(d.selectedCourseId);
    setLoading(false);
  }, []);

  useEffect(() => {
    load(null);
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!data || data.courses.length === 0) {
    return <EmptyState icon={<BookOpenCheck />} title="No syllabus available" description="You are not enrolled in any course yet." />;
  }

  const filteredModules = data.modules
    .map((m) => ({ ...m, topics: filter === "all" ? m.topics : m.topics.filter((t) => t.status === filter) }))
    .filter((m) => m.topics.length > 0);

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Syllabus & Progress"
        description="Topic statuses are updated by your teacher. Progress recalculates automatically."
        action={
          <Select
            value={courseId ?? ""}
            onChange={(e) => {
              const v = Number(e.target.value);
              setCourseId(v);
              load(v);
            }}
            className="w-56"
          >
            {data.courses.map((c) => (
              <option key={c.courseId} value={c.courseId}>
                {c.courseName}
              </option>
            ))}
          </Select>
        }
      />

      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <p className="mb-1 flex justify-between text-sm text-slate-300">
              <span>Course Completion</span>
              <span>{data.summary.percent}%</span>
            </p>
            <ProgressBar percent={data.summary.percent} />
            <p className="mt-2 text-xs text-slate-500">
              {data.summary.completed} completed · {data.summary.inProgress} in progress · {data.summary.pending} pending · {data.summary.total} total topics
            </p>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        {(["all", "completed", "in_progress", "pending"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
              filter === f
                ? "border-electric-400/60 bg-electric-500/15 text-electric-300"
                : "border-white/10 text-slate-400 hover:bg-white/5"
            }`}
          >
            {f === "all" ? "All Topics" : STATUS_META[f].label}
          </button>
        ))}
      </div>

      {filteredModules.length === 0 ? (
        <EmptyState title="No topics in this filter" description="Try selecting a different status filter." />
      ) : (
        <div className="space-y-5">
          {filteredModules.map((m) => (
            <Card key={m.id}>
              <h3 className="mb-3 font-semibold text-white">{m.title}</h3>
              <ul className="divide-y divide-white/5">
                {m.topics.map((t) => {
                  const meta = STATUS_META[t.status] || STATUS_META.pending;
                  const Icon = meta.icon;
                  return (
                    <li key={t.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-3">
                        <Icon
                          size={18}
                          className={
                            t.status === "completed" ? "mt-0.5 text-emerald-400" : t.status === "in_progress" ? "mt-0.5 text-blue-400" : "mt-0.5 text-amber-400"
                          }
                        />
                        <div>
                          <p className="text-sm font-medium text-white">{t.title}</p>
                          {t.remarks && <p className="mt-0.5 text-xs text-slate-500">Teacher remark: {t.remarks}</p>}
                          {t.completedAt && (
                            <p className="mt-0.5 text-xs text-slate-500">
                              Completed on {new Date(t.completedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge color={meta.color}>{meta.label}</Badge>
                    </li>
                  );
                })}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
