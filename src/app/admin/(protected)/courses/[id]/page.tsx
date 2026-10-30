"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { Badge, Button, Card, Input, SectionHeading, Skeleton } from "@/components/ui";

export default function CourseDetailAdminPage() {
  const params = useParams();
  const courseId = params.id as string;
  const [data, setData] = useState<any>(null);
  const [newModule, setNewModule] = useState("");
  const [newTopic, setNewTopic] = useState<Record<number, string>>({});

  const load = useCallback(() => {
    fetch(`/api/admin/courses/${courseId}`).then((r) => r.json()).then(setData);
  }, [courseId]);

  useEffect(load, [load]);

  async function addModule() {
    if (!newModule.trim()) return;
    await fetch(`/api/admin/courses/${courseId}/modules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newModule }),
    });
    setNewModule("");
    load();
  }

  async function addTopic(moduleId: number) {
    const title = newTopic[moduleId];
    if (!title?.trim()) return;
    await fetch(`/api/admin/modules/${moduleId}/topics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    setNewTopic((p) => ({ ...p, [moduleId]: "" }));
    load();
  }

  async function deleteTopic(topicId: number) {
    await fetch(`/api/admin/topics/${topicId}`, { method: "DELETE" });
    load();
  }

  async function deleteModule(moduleId: number) {
    if (!confirm("Delete this module and all its topics?")) return;
    await fetch(`/api/admin/modules/${moduleId}`, { method: "DELETE" });
    load();
  }

  if (!data) return <Skeleton className="h-96" />;
  if (data.error) return <Card className="text-rose-300">{data.error}</Card>;

  return (
    <div className="space-y-6">
      <SectionHeading title={data.course.name} description={data.course.description || data.course.code} />

      <Card>
        <h3 className="mb-3 font-semibold text-white">Modules & Topics</h3>
        <div className="space-y-5">
          {data.modules.map((m: any) => (
            <div key={m.id} className="rounded-xl border border-white/10 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="font-medium text-white">{m.title}</p>
                <button onClick={() => deleteModule(m.id)} className="text-rose-300 hover:text-rose-400" aria-label="Delete module">
                  <Trash2 size={16} />
                </button>
              </div>
              <ul className="mb-3 space-y-1.5">
                {m.topics.map((t: any) => (
                  <li key={t.id} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2 text-sm">
                    <span className="text-slate-200">{t.title}</span>
                    <button onClick={() => deleteTopic(t.id)} className="text-rose-300 hover:text-rose-400" aria-label="Delete topic">
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
                {m.topics.length === 0 && <p className="text-xs text-slate-500">No topics yet.</p>}
              </ul>
              <div className="flex gap-2">
                <Input
                  placeholder="New topic title"
                  value={newTopic[m.id] || ""}
                  onChange={(e) => setNewTopic((p) => ({ ...p, [m.id]: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && addTopic(m.id)}
                />
                <Button variant="outline" onClick={() => addTopic(m.id)}>
                  <Plus size={14} /> Add Topic
                </Button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 flex gap-2 border-t border-white/5 pt-4">
          <Input placeholder="New module title" value={newModule} onChange={(e) => setNewModule(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addModule()} />
          <Button onClick={addModule}>
            <Plus size={16} /> Add Module
          </Button>
        </div>
      </Card>

      <Card>
        <h3 className="mb-3 font-semibold text-white">Enrolled Students ({data.enrolledStudents.length})</h3>
        {data.enrolledStudents.length === 0 ? (
          <p className="text-sm text-slate-500">No students enrolled yet.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {data.enrolledStudents.map((s: any) => (
              <li key={s.id} className="flex items-center justify-between py-2 text-sm">
                <Link href={`/admin/students/${s.id}`} className="text-slate-200 hover:text-electric-300">
                  {s.fullName} <span className="text-slate-500">({s.studentId})</span>
                </Link>
                <Badge color={s.status === "active" ? "green" : "gray"}>{s.status}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
