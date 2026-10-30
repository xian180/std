"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpenCheck,
  CheckCircle2,
  Clock,
  ClipboardList,
  CalendarCheck2,
  FolderGit2,
  GraduationCap,
  Percent,
  UserRound,
  LifeBuoy,
} from "lucide-react";
import { Badge, Card, ProgressBar, SectionHeading, Skeleton, StatCard } from "@/components/ui";

type Overview = {
  student: {
    studentId: string;
    fullName: string;
    displayName: string | null;
    photoUrl: string | null;
    status: string;
    email: string | null;
  };
  enrollments: {
    courseId: number;
    courseName: string;
    category: string | null;
    status: string;
    progress: { total: number; completed: number; inProgress: number; pending: number; percent: number };
  }[];
  stats: {
    totalCourses: number;
    syllabus: { total: number; completed: number; inProgress: number; pending: number; percent: number };
    tests: { totalTests: number; overallPercentage: number; averageOfPercentages: number };
    attendance: { total: number; present: number; absent: number; leave: number; effectiveTotal: number; percent: number };
    projectsSubmitted: number;
  };
};

export default function DashboardOverviewPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/student/overview")
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error || "Failed to load");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return <Card className="text-sm text-rose-300">{error}</Card>;
  }

  if (!data) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    );
  }

  const { student, enrollments, stats } = data;

  return (
    <div className="space-y-8">
      <Card className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-electric-500/15 text-electric-300">
            {student.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={student.photoUrl} alt={student.fullName} className="h-full w-full object-cover" />
            ) : (
              <UserRound size={28} />
            )}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white sm:text-2xl">{student.displayName || student.fullName}</h1>
            <p className="text-sm text-slate-400">Student ID: {student.studentId}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <Badge color={student.status === "active" ? "green" : "gray"}>{student.status}</Badge>
              {enrollments.map((e) => (
                <Badge key={e.courseId} color="blue">
                  {e.courseName}
                </Badge>
              ))}
            </div>
          </div>
        </div>
        <div className="sm:w-56">
          <p className="mb-1 flex justify-between text-xs text-slate-400">
            <span>Overall Progress</span>
            <span>{stats.syllabus.percent}%</span>
          </p>
          <ProgressBar percent={stats.syllabus.percent} />
        </div>
      </Card>

      <div>
        <SectionHeading title="Academic Snapshot" description="Automatically calculated from your live academic records." />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={<GraduationCap size={20} />} label="Enrolled Courses" value={stats.totalCourses} color="#4f8bff" />
          <StatCard icon={<Percent size={20} />} label="Syllabus Completion" value={`${stats.syllabus.percent}%`} color="#22c55e" />
          <StatCard icon={<CheckCircle2 size={20} />} label="Completed Topics" value={stats.syllabus.completed} sub={`of ${stats.syllabus.total} total`} color="#22c55e" />
          <StatCard icon={<Clock size={20} />} label="Pending Topics" value={stats.syllabus.pending} sub={`${stats.syllabus.inProgress} in progress`} color="#f59e0b" />
          <StatCard icon={<ClipboardList size={20} />} label="Tests Completed" value={stats.tests.totalTests} color="#a855f7" />
          <StatCard
            icon={<Percent size={20} />}
            label="Average Test Score"
            value={`${stats.tests.overallPercentage}%`}
            sub="Weighted overall percentage"
            color="#a855f7"
          />
          <StatCard icon={<CalendarCheck2 size={20} />} label="Attendance" value={`${stats.attendance.percent}%`} sub={`${stats.attendance.present}/${stats.attendance.effectiveTotal ?? stats.attendance.total} classes`} color="#06b6d4" />
          <StatCard icon={<FolderGit2 size={20} />} label="Projects Submitted" value={stats.projectsSubmitted} color="#ec4899" />
        </div>
      </div>

      <div>
        <SectionHeading title="My Courses" description="Select a course to view its detailed syllabus, tests, and attendance." />
        {enrollments.length === 0 ? (
          <Card className="text-sm text-slate-400">You are not enrolled in any course yet. Please contact the administrator.</Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {enrollments.map((e) => (
              <Link key={e.courseId} href={`/dashboard/courses/${e.courseId}`}>
                <Card className="hover-lift h-full">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-white">{e.courseName}</h3>
                    <Badge color={e.status === "active" ? "green" : "gray"}>{e.status}</Badge>
                  </div>
                  {e.category && <p className="mt-1 text-xs text-slate-500">{e.category}</p>}
                  <div className="mt-4">
                    <p className="mb-1 flex justify-between text-xs text-slate-400">
                      <span>Syllabus Progress</span>
                      <span>{e.progress.percent}%</span>
                    </p>
                    <ProgressBar percent={e.progress.percent} />
                    <p className="mt-2 text-xs text-slate-500">
                      {e.progress.completed} completed · {e.progress.inProgress} in progress · {e.progress.pending} pending
                    </p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Card className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <LifeBuoy className="text-electric-300" size={22} />
          <div>
            <p className="font-medium text-white">Need help?</p>
            <p className="text-sm text-slate-400">Contact the administration office for any academic or account queries.</p>
          </div>
        </div>
        <a href="mailto:support@brightcode.edu" className="text-sm font-medium text-electric-300 hover:underline">
          support@brightcode.edu
        </a>
      </Card>
    </div>
  );
}
