"use client";

import { useEffect, useState } from "react";
import { Users, BookOpenCheck, FolderGit2, AlertTriangle, Activity, Eye } from "lucide-react";
import { Card, SectionHeading, Skeleton, StatCard } from "@/components/ui";

type Stats = {
  totalStudents: number;
  activeCourses: number;
  totalProjects: number;
  publishedProjects: number;
  totalUsers: number;
  atRiskStudents: { studentId: string; name: string; reason: string }[];
  recentActivity: { id: number; action: string; entityType: string | null; createdAt: string; actorName: string | null }[];
};

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then(setStats);
  }, []);

  if (!stats) return <Skeleton className="h-96" />;

  return (
    <div className="space-y-8">
      <SectionHeading title="Admin Overview" description="A live snapshot of your institute's academic activity." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Users size={20} />} label="Total Students" value={stats.totalStudents} color="#4f8bff" />
        <StatCard icon={<BookOpenCheck size={20} />} label="Active Courses" value={stats.activeCourses} color="#22c55e" />
        <StatCard icon={<FolderGit2 size={20} />} label="Total Projects" value={stats.totalProjects} sub={`${stats.publishedProjects} published`} color="#ec4899" />
        <StatCard icon={<Eye size={20} />} label="Staff Accounts" value={stats.totalUsers} color="#a855f7" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="text-amber-400" size={18} />
            <h3 className="font-semibold text-white">Students Needing Attention</h3>
          </div>
          {stats.atRiskStudents.length === 0 ? (
            <p className="text-sm text-slate-500">No students currently flagged. Great progress across the board!</p>
          ) : (
            <ul className="space-y-3">
              {stats.atRiskStudents.map((s) => (
                <li key={s.studentId} className="flex items-center justify-between rounded-xl bg-amber-500/10 px-3 py-2 text-sm">
                  <span className="text-white">
                    {s.name} <span className="text-slate-500">({s.studentId})</span>
                  </span>
                  <span className="text-amber-300">{s.reason}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-center gap-2">
            <Activity className="text-electric-300" size={18} />
            <h3 className="font-semibold text-white">Recent Administrative Activity</h3>
          </div>
          {stats.recentActivity.length === 0 ? (
            <p className="text-sm text-slate-500">No activity recorded yet.</p>
          ) : (
            <ul className="max-h-80 space-y-2 overflow-y-auto text-sm">
              {stats.recentActivity.map((a) => (
                <li key={a.id} className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-slate-300">
                    {a.action.replace(/_/g, " ")} {a.entityType ? `· ${a.entityType}` : ""}
                  </span>
                  <span className="text-xs text-slate-500">{new Date(a.createdAt).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
