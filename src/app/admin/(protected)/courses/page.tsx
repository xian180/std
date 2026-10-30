"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge, Button, Card, Input, SectionHeading, Skeleton, EmptyState, Textarea } from "@/components/ui";

type CourseRow = { id: number; name: string; code: string; category: string | null; description: string | null; isArchived: boolean };

export default function CoursesPage() {
  const [courses, setCourses] = useState<CourseRow[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  function load() {
    fetch("/api/admin/courses").then((r) => r.json()).then((d) => setCourses(d.courses || []));
  }

  useEffect(load, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/admin/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, code, category, description }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    setName("");
    setCode("");
    setCategory("");
    setDescription("");
    setShowForm(false);
    load();
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Course & Syllabus Management"
        description="Create courses and manage their modules, chapters, and topics."
        action={
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus size={16} /> New Course
          </Button>
        }
      />

      {showForm && (
        <Card>
          <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input required placeholder="Course Name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input required placeholder="Unique Course Code (e.g. FSWD01)" value={code} onChange={(e) => setCode(e.target.value)} />
            <Input placeholder="Category (e.g. Web Development)" value={category} onChange={(e) => setCategory(e.target.value)} />
            <Textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} className="sm:col-span-2" />
            {error && <p className="text-sm text-rose-300 sm:col-span-2">{error}</p>}
            <div className="sm:col-span-2">
              <Button type="submit">Create Course</Button>
            </div>
          </form>
        </Card>
      )}

      {!courses ? (
        <Skeleton className="h-64" />
      ) : courses.length === 0 ? (
        <EmptyState title="No courses yet" description="Create your first course to get started." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <Link key={c.id} href={`/admin/courses/${c.id}`}>
              <Card className="hover-lift h-full">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-white">{c.name}</h3>
                  {c.isArchived && <Badge color="gray">Archived</Badge>}
                </div>
                <p className="mt-1 text-xs text-slate-500">{c.code}</p>
                {c.category && <Badge color="blue" className="mt-2">{c.category}</Badge>}
                <p className="mt-3 line-clamp-2 text-sm text-slate-400">{c.description}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
