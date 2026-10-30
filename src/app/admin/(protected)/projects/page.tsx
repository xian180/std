"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, FileText, Download, Eye, MessageSquare, Archive } from "lucide-react";
import { Badge, Button, Card, Input, SectionHeading, Select, Skeleton, Textarea, EmptyState } from "@/components/ui";

type Project = {
  id: number;
  title: string;
  description: string | null;
  category: string | null;
  status: string;
  isPublished: boolean;
  publishAnonymously: boolean;
  allowDownload: boolean;
  studentName: string;
  studentCode: string;
  courseName: string | null;
  attachments: { id: number; fileName: string; fileType: string }[];
};

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [role, setRole] = useState("admin");
  const [feedbackFor, setFeedbackFor] = useState<number | null>(null);

  const load = useCallback(() => {
    fetch("/api/admin/projects").then((r) => r.json()).then((d) => setProjects(d.projects || []));
  }, []);

  useEffect(() => {
    load();
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setRole(d.user?.role || "admin"));
  }, [load]);

  async function togglePublish(p: Project) {
    await fetch(`/api/admin/projects/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: !p.isPublished, status: !p.isPublished ? "approved" : p.status }),
    });
    load();
  }

  async function archive(id: number) {
    if (!confirm("Archive this project? It will be removed from public and private views.")) return;
    await fetch(`/api/admin/projects/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Project Upload & Publication Management"
        description="Upload student projects and control what appears on the public homepage."
        action={
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus size={16} /> Upload Project
          </Button>
        }
      />

      {showForm && <UploadForm onDone={() => { setShowForm(false); load(); }} />}

      {!projects ? (
        <Skeleton className="h-96" />
      ) : projects.length === 0 ? (
        <EmptyState icon={<FileText />} title="No projects uploaded yet" description="Upload a student's project to get started." />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Card key={p.id} className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge color={p.isPublished ? "green" : "gray"}>{p.isPublished ? "Published" : "Private"}</Badge>
                {p.publishAnonymously && <Badge color="purple">Anonymous</Badge>}
                {p.category && <Badge color="blue">{p.category}</Badge>}
              </div>
              <h3 className="font-semibold text-white">{p.title}</h3>
              <p className="line-clamp-2 text-sm text-slate-400">{p.description}</p>
              <p className="text-xs text-slate-500">
                {p.studentName} ({p.studentCode}) {p.courseName ? `· ${p.courseName}` : ""}
              </p>
              <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                {p.attachments.map((a) => (
                  <a key={a.id} href={`/api/files/${a.id}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 hover:bg-white/5">
                    <Eye size={12} /> {a.fileType.toUpperCase()}
                  </a>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-2 border-t border-white/5 pt-3">
                {role === "admin" && (
                  <Button variant="outline" onClick={() => togglePublish(p)}>
                    {p.isPublished ? "Unpublish" : "Publish"}
                  </Button>
                )}
                <Button variant="ghost" onClick={() => setFeedbackFor(p.id)}>
                  <MessageSquare size={14} /> Feedback
                </Button>
                {role === "admin" && (
                  <Button variant="danger" onClick={() => archive(p.id)}>
                    <Archive size={14} />
                  </Button>
                )}
              </div>
              {feedbackFor === p.id && <FeedbackBox projectId={p.id} onDone={() => setFeedbackFor(null)} />}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function FeedbackBox({ projectId, onDone }: { projectId: number; onDone: () => void }) {
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!message.trim()) return;
    setSaving(true);
    await fetch("/api/admin/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, message }),
    });
    setSaving(false);
    onDone();
  }

  return (
    <div className="space-y-2 rounded-xl bg-white/[0.03] p-3">
      <Textarea placeholder="Write feedback for the student..." value={message} onChange={(e) => setMessage(e.target.value)} />
      <Button onClick={submit} disabled={saving}>
        Send Feedback
      </Button>
    </div>
  );
}

function UploadForm({ onDone }: { onDone: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ studentId: string; name: string; dbId?: number }[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<{ id: number; label: string } | null>(null);
  const [courses, setCourses] = useState<{ id: number; name: string }[]>([]);
  const [courseId, setCourseId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [allowDownload, setAllowDownload] = useState(true);
  const [publishAnonymously, setPublishAnonymously] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [files, setFiles] = useState<FileList | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/courses").then((r) => r.json()).then((d) => setCourses(d.courses || []));
  }, []);

  async function searchStudents() {
    if (query.trim().length < 2) return;
    const res = await fetch(`/api/admin/students?q=${encodeURIComponent(query)}`);
    const d = await res.json();
    setResults((d.results || []).map((r: any) => ({ studentId: r.studentId, name: r.fullName, dbId: r.id })));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!selectedStudent) {
      setError("Please select a student.");
      return;
    }
    if (!files || files.length === 0) {
      setError("Please attach at least one file (JPG, JPEG, PNG, or PDF).");
      return;
    }
    setLoading(true);
    const form = new FormData();
    form.set("studentId", String(selectedStudent.id));
    if (courseId) form.set("courseId", courseId);
    form.set("title", title);
    form.set("description", description);
    form.set("category", category);
    form.set("allowDownload", String(allowDownload));
    form.set("publishAnonymously", String(publishAnonymously));
    form.set("isPublished", String(isPublished));
    Array.from(files).forEach((f) => form.append("files", f));

    const res = await fetch("/api/admin/projects", { method: "POST", body: form });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error);
      return;
    }
    onDone();
  }

  return (
    <Card>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">Student</label>
          {selectedStudent ? (
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white">
              {selectedStudent.label}
              <button type="button" onClick={() => setSelectedStudent(null)} className="text-rose-300">
                Change
              </button>
            </div>
          ) : (
            <div>
              <div className="flex gap-2">
                <Input placeholder="Search student by ID or name" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), searchStudents())} />
                <Button type="button" variant="outline" onClick={searchStudents}>
                  Search
                </Button>
              </div>
              {results.length > 0 && (
                <ul className="mt-2 divide-y divide-white/5 rounded-xl border border-white/10">
                  {results.map((r) => (
                    <li key={r.studentId}>
                      <button
                        type="button"
                        onClick={() => setSelectedStudent({ id: r.dbId!, label: `${r.name} (${r.studentId})` })}
                        className="block w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/5"
                      >
                        {r.name} ({r.studentId})
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input required placeholder="Project Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
            <option value="">No course / Independent project</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Input placeholder="Category (e.g. Web Development)" value={category} onChange={(e) => setCategory(e.target.value)} />
          <Input type="file" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" multiple onChange={(e) => setFiles(e.target.files)} />
        </div>
        <Textarea placeholder="Project description" value={description} onChange={(e) => setDescription(e.target.value)} />

        <div className="flex flex-wrap gap-4 text-sm text-slate-300">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={allowDownload} onChange={(e) => setAllowDownload(e.target.checked)} /> Allow downloads
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={publishAnonymously} onChange={(e) => setPublishAnonymously(e.target.checked)} /> Publish anonymously
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} /> Publish to homepage now
          </label>
        </div>

        {error && <p className="text-sm text-rose-300">{error}</p>}
        <Button type="submit" disabled={loading}>
          {loading ? "Uploading..." : "Upload Project"}
        </Button>
      </form>
    </Card>
  );
}
