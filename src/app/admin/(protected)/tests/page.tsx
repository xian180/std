"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { Button, Card, Input, SectionHeading, Select, Skeleton } from "@/components/ui";

type Course = { id: number; name: string };
type TestRow = { id: number; name: string; testDate: string; maxMarks: string; passingMarks: string | null; courseName: string };

export default function TestsPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState("");
  const [tests, setTests] = useState<TestRow[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedTest, setSelectedTest] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/admin/courses").then((r) => r.json()).then((d) => {
      setCourses(d.courses || []);
      if (d.courses?.length) setCourseId(String(d.courses[0].id));
    });
  }, []);

  const loadTests = useCallback(async () => {
    if (!courseId) return;
    const res = await fetch(`/api/admin/tests?courseId=${courseId}`);
    const d = await res.json();
    setTests(d.tests || []);
  }, [courseId]);

  useEffect(() => {
    loadTests();
  }, [loadTests]);

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Test & Marks Management"
        description="Create tests, enter results, and track course-wise performance."
        action={
          <Select value={courseId} onChange={(e) => { setCourseId(e.target.value); setSelectedTest(null); }} className="w-56">
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
          <h3 className="font-semibold text-white">Tests</h3>
          <Button onClick={() => setShowForm((v) => !v)} variant="outline">
            <Plus size={14} /> New Test
          </Button>
        </div>
        {showForm && <NewTestForm courseId={courseId} onCreated={() => { setShowForm(false); loadTests(); }} />}
        {!tests ? (
          <Skeleton className="h-32 mt-3" />
        ) : tests.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No tests created for this course yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-white/5">
            {tests.map((t) => (
              <li key={t.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-white">{t.name}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(t.testDate).toLocaleDateString()} · Max {t.maxMarks}
                    {t.passingMarks ? ` · Pass ${t.passingMarks}` : ""}
                  </p>
                </div>
                <Button variant="outline" onClick={() => setSelectedTest(t.id)}>
                  Enter Marks
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {selectedTest && <ResultsEditor testId={selectedTest} onClose={() => setSelectedTest(null)} />}
    </div>
  );
}

function NewTestForm({ courseId, onCreated }: { courseId: string; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [testDate, setTestDate] = useState("");
  const [maxMarks, setMaxMarks] = useState("100");
  const [passingMarks, setPassingMarks] = useState("40");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/admin/tests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId: Number(courseId), name, testDate, maxMarks: Number(maxMarks), passingMarks: passingMarks ? Number(passingMarks) : null }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    onCreated();
  }

  return (
    <form onSubmit={submit} className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-white/10 p-4 sm:grid-cols-2">
      <Input required placeholder="Test Name" value={name} onChange={(e) => setName(e.target.value)} />
      <Input required type="date" value={testDate} onChange={(e) => setTestDate(e.target.value)} />
      <Input required type="number" min="1" placeholder="Max Marks" value={maxMarks} onChange={(e) => setMaxMarks(e.target.value)} />
      <Input type="number" min="0" placeholder="Passing Marks (optional)" value={passingMarks} onChange={(e) => setPassingMarks(e.target.value)} />
      {error && <p className="text-sm text-rose-300 sm:col-span-2">{error}</p>}
      <div className="sm:col-span-2">
        <Button type="submit">Create Test</Button>
      </div>
    </form>
  );
}

function ResultsEditor({ testId, onClose }: { testId: number; onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  const [marks, setMarks] = useState<Record<number, string>>({});
  const [feedback, setFeedback] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<number | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/tests/${testId}/results`);
    const d = await res.json();
    setData(d);
    const m: Record<number, string> = {};
    const f: Record<number, string> = {};
    for (const r of d.results || []) {
      m[r.studentId] = r.marksObtained ?? "";
      f[r.studentId] = r.feedback || "";
    }
    setMarks(m);
    setFeedback(f);
  }, [testId]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(studentId: number) {
    setError("");
    setSaving(studentId);
    const res = await fetch(`/api/admin/tests/${testId}/results`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, marksObtained: Number(marks[studentId]), feedback: feedback[studentId] }),
    });
    const d = await res.json();
    if (!res.ok) setError(d.error);
    setSaving(null);
  }

  if (!data) return <Skeleton className="h-64" />;

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-white">
          Enter Marks — {data.test.name} (Max {data.test.maxMarks})
        </h3>
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>
      {error && <p className="mb-3 text-sm text-rose-300">{error}</p>}
      <div className="space-y-3">
        {data.results.map((r: any) => (
          <div key={r.studentId} className="grid grid-cols-1 items-center gap-2 rounded-xl border border-white/10 p-3 sm:grid-cols-[1fr_120px_1fr_auto]">
            <span className="text-sm text-slate-200">
              {r.fullName} <span className="text-slate-500">({r.studentCode})</span>
            </span>
            <Input
              type="number"
              min="0"
              max={Number(data.test.maxMarks)}
              placeholder="Marks"
              value={marks[r.studentId] ?? ""}
              onChange={(e) => setMarks((p) => ({ ...p, [r.studentId]: e.target.value }))}
            />
            <Input
              placeholder="Feedback (optional)"
              value={feedback[r.studentId] ?? ""}
              onChange={(e) => setFeedback((p) => ({ ...p, [r.studentId]: e.target.value }))}
            />
            <Button variant="outline" onClick={() => save(r.studentId)} disabled={saving === r.studentId || !marks[r.studentId]}>
              Save
            </Button>
          </div>
        ))}
        {data.results.length === 0 && <p className="text-sm text-slate-500">No students enrolled in this course yet.</p>}
      </div>
    </Card>
  );
}
