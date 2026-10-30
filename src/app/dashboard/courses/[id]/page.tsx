"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { BookOpenCheck, CalendarCheck2, ClipboardList } from "lucide-react";
import { Card, ProgressBar, SectionHeading, Skeleton, StatCard } from "@/components/ui";

export default function CourseDetailPage() {
  const params = useParams();
  const courseId = params.id as string;
  const [syllabus, setSyllabus] = useState<any>(null);
  const [tests, setTests] = useState<any>(null);
  const [attendance, setAttendance] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/student/syllabus?courseId=${courseId}`).then((r) => r.json()).then(setSyllabus);
    fetch(`/api/student/tests?courseId=${courseId}`).then((r) => r.json()).then(setTests);
    fetch(`/api/student/attendance?courseId=${courseId}`).then((r) => r.json()).then(setAttendance);
  }, [courseId]);

  if (!syllabus || !tests || !attendance) return <Skeleton className="h-96" />;

  const courseName = syllabus.courses?.find((c: any) => c.courseId === Number(courseId))?.courseName || "Course";

  return (
    <div className="space-y-6">
      <SectionHeading title={courseName} description="Course-specific syllabus progress, test results, and attendance." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={<BookOpenCheck size={20} />} label="Syllabus Progress" value={`${syllabus.summary.percent}%`} sub={`${syllabus.summary.completed}/${syllabus.summary.total} topics`} color="#22c55e" />
        <StatCard icon={<ClipboardList size={20} />} label="Test Average" value={`${tests.summary.overallPercentage}%`} sub={`${tests.summary.totalTests} tests`} color="#a855f7" />
        <StatCard icon={<CalendarCheck2 size={20} />} label="Attendance" value={`${attendance.summary.percent}%`} sub={`${attendance.summary.present}/${attendance.summary.effectiveTotal} classes`} color="#06b6d4" />
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-white">Syllabus Overview</h3>
          <Link href="/dashboard/syllabus" className="text-sm text-electric-300 hover:underline">
            View full syllabus →
          </Link>
        </div>
        <ProgressBar percent={syllabus.summary.percent} />
        <div className="mt-4 space-y-3">
          {syllabus.modules.map((m: any) => {
            const total = m.topics.length;
            const completed = m.topics.filter((t: any) => t.status === "completed").length;
            const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
            return (
              <div key={m.id}>
                <p className="mb-1 flex justify-between text-xs text-slate-400">
                  <span>{m.title}</span>
                  <span>
                    {completed}/{total}
                  </span>
                </p>
                <ProgressBar percent={pct} heightClass="h-1.5" />
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-white">Recent Test Results</h3>
          <Link href="/dashboard/tests" className="text-sm text-electric-300 hover:underline">
            View all tests →
          </Link>
        </div>
        {tests.results.length === 0 ? (
          <p className="text-sm text-slate-500">No tests recorded for this course yet.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {tests.results.slice(-5).map((r: any) => (
              <li key={r.testId} className="flex items-center justify-between py-2 text-sm">
                <span className="text-slate-300">{r.testName}</span>
                <span className="font-medium text-white">
                  {r.marksObtained}/{r.maxMarks} ({r.percentage}%)
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-white">Attendance Summary</h3>
          <Link href="/dashboard/attendance" className="text-sm text-electric-300 hover:underline">
            View full attendance →
          </Link>
        </div>
        <p className="text-sm text-slate-400">
          Present: {attendance.summary.present} · Absent: {attendance.summary.absent} · Leave: {attendance.summary.leave}
        </p>
      </Card>
    </div>
  );
}
