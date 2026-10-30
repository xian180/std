"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { Button, Card, Input, SectionHeading, Select, Skeleton } from "@/components/ui";
import clsx from "clsx";

type Course = { id: number; name: string };
type SessionRow = { id: number; sessionDate: string; title: string | null; courseName: string };

export default function AttendanceAdminPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState("");
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedSession, setSelectedSession] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/admin/courses").then((r) => r.json()).then((d) => {
      setCourses(d.courses || []);
      if (d.courses?.length) setCourseId(String(d.courses[0].id));
    });
  }, []);

  const loadSessions = useCallback(async () => {
    if (!courseId) return;
    const res = await fetch(`/api/admin/attendance/sessions?courseId=${courseId}`);
    const d = await res.json();
    setSessions(d.sessions || []);
  }, [courseId]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Attendance Management"
        description="Create class sessions and record attendance for enrolled students."
        action={
          <Select value={courseId} onChange={(e) => { setCourseId(e.target.value); setSelectedSession(null); }} className="w-56">
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        }
      />

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-white">Class Sessions</h3>
          <Button onClick={() => setShowForm((v) => !v)} variant="outline">
            <Plus size={14} /> New Session
          </Button>
        </div>
        {showForm && <NewSessionForm courseId={courseId} onCreated={() => { setShowForm(false); loadSessions(); }} />}
        {!sessions ? (
          <Skeleton className="mt-3 h-32" />
        ) : sessions.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No sessions created for this course yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-white/5">
            {sessions.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-white">{new Date(s.sessionDate).toLocaleDateString()}</p>
                  <p className="text-xs text-slate-500">{s.title}</p>
                </div>
                <Button variant="outline" onClick={() => setSelectedSession(s.id)}>
                  Record Attendance
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {selectedSession && <AttendanceEditor sessionId={selectedSession} onClose={() => setSelectedSession(null)} />}
    </div>
  );
}

function NewSessionForm({ courseId, onCreated }: { courseId: string; onCreated: () => void }) {
  const [sessionDate, setSessionDate] = useState("");
  const [title, setTitle] = useState("Regular Class");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/admin/attendance/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId: Number(courseId), sessionDate, title }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    onCreated();
  }

  return (
    <form onSubmit={submit} className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-white/10 p-4 sm:grid-cols-3">
      <Input required type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} />
      <Input placeholder="Session Title" value={title} onChange={(e) => setTitle(e.target.value)} />
      {error && <p className="text-sm text-rose-300 sm:col-span-3">{error}</p>}
      <div>
        <Button type="submit">Create Session</Button>
      </div>
    </form>
  );
}

const STATUS_OPTIONS: { value: "present" | "absent" | "leave"; label: string; color: string }[] = [
  { value: "present", label: "Present", color: "bg-emerald-500/20 text-emerald-300 border-emerald-400/40" },
  { value: "absent", label: "Absent", color: "bg-rose-500/20 text-rose-300 border-rose-400/40" },
  { value: "leave", label: "Leave", color: "bg-amber-500/20 text-amber-300 border-amber-400/40" },
];

function AttendanceEditor({ sessionId, onClose }: { sessionId: number; onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  const [statuses, setStatuses] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/attendance/sessions/${sessionId}/records`);
    const d = await res.json();
    setData(d);
    const s: Record<number, string> = {};
    for (const r of d.records || []) s[r.studentId] = r.status || "present";
    setStatuses(s);
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveAll() {
    setSaving(true);
    const records = Object.entries(statuses).map(([studentId, status]) => ({ studentId: Number(studentId), status }));
    await fetch(`/api/admin/attendance/sessions/${sessionId}/records`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ records }),
    });
    setSaving(false);
    load();
  }

  if (!data) return <Skeleton className="h-64" />;

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-white">Attendance — {new Date(data.session.sessionDate).toLocaleDateString()}</h3>
        <div className="flex gap-2">
          <Button onClick={saveAll} disabled={saving}>
            Save All
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        {data.records.map((r: any) => (
          <div key={r.studentId} className="flex flex-col gap-2 rounded-xl border border-white/10 p-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-slate-200">
              {r.fullName} <span className="text-slate-500">({r.studentCode})</span>
            </span>
            <div className="flex gap-2">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setStatuses((p) => ({ ...p, [r.studentId]: opt.value }))}
                  className={clsx(
                    "rounded-full border px-3 py-1 text-xs font-medium transition",
                    statuses[r.studentId] === opt.value ? opt.color : "border-white/10 text-slate-500 hover:bg-white/5"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        ))}
        {data.records.length === 0 && <p className="text-sm text-slate-500">No students enrolled in this course yet.</p>}
      </div>
    </Card>
  );
}
