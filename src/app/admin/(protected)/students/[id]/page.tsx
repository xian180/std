"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { UserRound, Plus } from "lucide-react";
import { Badge, Button, Card, Select, SectionHeading, Skeleton } from "@/components/ui";

type Course = { id: number; name: string };
type Enrollment = { enrollmentId: number; courseId: number; courseName: string; status: string; enrolledAt: string };
type Topic = { id: number; title: string; status: string; remarks: string | null };
type ModuleT = { id: number; title: string; topics: Topic[] };

export default function StudentDetailPage() {
  const params = useParams();
  const studentId = Number(params.id);
  const [detail, setDetail] = useState<any>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [enrollCourse, setEnrollCourse] = useState<string>("");
  const [modules, setModules] = useState<ModuleT[] | null>(null);
  const [savingTopic, setSavingTopic] = useState<number | null>(null);

  const loadDetail = useCallback(async () => {
    const res = await fetch(`/api/admin/students/${studentId}`);
    setDetail(await res.json());
  }, [studentId]);

  useEffect(() => {
    loadDetail();
    fetch("/api/admin/courses").then((r) => r.json()).then((d) => setCourses(d.courses || []));
  }, [loadDetail]);

  const loadProgress = useCallback(
    async (courseId: string) => {
      if (!courseId) {
        setModules(null);
        return;
      }
      const res = await fetch(`/api/admin/students/${studentId}/progress?courseId=${courseId}`);
      const data = await res.json();
      setModules(data.modules || []);
    },
    [studentId]
  );

  useEffect(() => {
    if (detail?.enrollments?.length && !selectedCourse) {
      setSelectedCourse(String(detail.enrollments[0].courseId));
    }
  }, [detail, selectedCourse]);

  useEffect(() => {
    loadProgress(selectedCourse);
  }, [selectedCourse, loadProgress]);

  async function enroll() {
    if (!enrollCourse) return;
    const res = await fetch(`/api/admin/students/${studentId}/enrollments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId: Number(enrollCourse) }),
    });
    if (res.ok) {
      setEnrollCourse("");
      loadDetail();
    }
  }

  async function updateEnrollmentStatus(courseId: number, status: string) {
    await fetch(`/api/admin/students/${studentId}/enrollments`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId, status }),
    });
    loadDetail();
  }

  async function updateTopicStatus(topicId: number, status: string) {
    setSavingTopic(topicId);
    await fetch(`/api/admin/students/${studentId}/progress`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topicId, status }),
    });
    await loadProgress(selectedCourse);
    setSavingTopic(null);
  }

  if (!detail) return <Skeleton className="h-96" />;
  if (detail.error) return <Card className="text-rose-300">{detail.error}</Card>;

  const { student, enrollments } = detail;
  const availableCourses = courses.filter((c) => !enrollments.some((e: Enrollment) => e.courseId === c.id));

  return (
    <div className="space-y-6">
      <SectionHeading title={student.fullName} description={`Student ID: ${student.studentId}`} />

      <Card className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-electric-500/15 text-electric-300">
          <UserRound size={26} />
        </div>
        <div>
          <p className="font-medium text-white">{student.displayName || student.fullName}</p>
          <p className="text-sm text-slate-400">{student.email || "No email on file"}</p>
          <Badge color={student.status === "active" ? "green" : "gray"} className="mt-1">
            {student.status}
          </Badge>
        </div>
      </Card>

      <Card>
        <h3 className="mb-3 font-semibold text-white">Course Enrollments</h3>
        <ul className="mb-4 divide-y divide-white/5">
          {enrollments.map((e: Enrollment) => (
            <li key={e.enrollmentId} className="flex items-center justify-between py-2 text-sm">
              <span className="text-slate-200">{e.courseName}</span>
              <Select value={e.status} onChange={(ev) => updateEnrollmentStatus(e.courseId, ev.target.value)} className="w-40">
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="dropped">Dropped</option>
              </Select>
            </li>
          ))}
          {enrollments.length === 0 && <p className="py-2 text-sm text-slate-500">Not enrolled in any course yet.</p>}
        </ul>
        <div className="flex gap-2">
          <Select value={enrollCourse} onChange={(e) => setEnrollCourse(e.target.value)} className="flex-1">
            <option value="">Select a course to enroll...</option>
            {availableCourses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Button onClick={enroll} disabled={!enrollCourse}>
            <Plus size={16} /> Enroll
          </Button>
        </div>
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-white">Syllabus Progress Management</h3>
          <Select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} className="w-56">
            {enrollments.map((e: Enrollment) => (
              <option key={e.courseId} value={e.courseId}>
                {e.courseName}
              </option>
            ))}
          </Select>
        </div>
        {!modules ? (
          <p className="text-sm text-slate-500">Select a course to manage topic progress.</p>
        ) : modules.length === 0 ? (
          <p className="text-sm text-slate-500">This course has no syllabus topics yet.</p>
        ) : (
          <div className="space-y-4">
            {modules.map((m) => (
              <div key={m.id}>
                <p className="mb-2 text-sm font-medium text-slate-300">{m.title}</p>
                <ul className="space-y-1.5">
                  {m.topics.map((t) => (
                    <li key={t.id} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2">
                      <span className="text-sm text-slate-200">{t.title}</span>
                      <Select
                        value={t.status}
                        disabled={savingTopic === t.id}
                        onChange={(e) => updateTopicStatus(t.id, e.target.value)}
                        className="w-36"
                      >
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </Select>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
