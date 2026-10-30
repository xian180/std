"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, KeyRound, Archive, X } from "lucide-react";
import { Badge, Button, Card, Input, Select, SectionHeading, Skeleton, EmptyState } from "@/components/ui";

type StudentRow = {
  id: number;
  studentId: string;
  fullName: string;
  displayName: string | null;
  status: string;
  hasAccount: boolean;
  courses: string[];
  isDemo: boolean;
};

export default function StudentsPage() {
  const [rows, setRows] = useState<StudentRow[] | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    params.set("page", String(page));
    const res = await fetch(`/api/admin/students?${params.toString()}`);
    const data = await res.json();
    setRows(data.results || []);
    setTotal(data.total || 0);
  }, [q, status, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function resetPassword(id: number) {
    const res = await fetch(`/api/admin/students/${id}/reset-password`, { method: "POST" });
    const data = await res.json();
    if (res.ok) setMessage(`Temporary password issued: ${data.tempPassword}`);
  }

  async function archive(id: number) {
    if (!confirm("Archive this student? They will no longer appear in active lists.")) return;
    await fetch(`/api/admin/students/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Student Management"
        description="Add students, assign unique Student IDs, and manage account access."
        action={
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus size={16} /> Add Student
          </Button>
        }
      />

      {message && (
        <Card className="flex items-center justify-between border border-electric-400/30 bg-electric-500/10 text-sm text-electric-200">
          {message}
          <button onClick={() => setMessage("")}>
            <X size={16} />
          </button>
        </Card>
      )}

      {showForm && <AddStudentForm onCreated={() => { setShowForm(false); load(); }} onTempPassword={(p) => setMessage(p)} />}

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search by Student ID or name..." className="pl-9" />
        </div>
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="sm:w-56">
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="graduated">Graduated</option>
        </Select>
      </div>

      {!rows ? (
        <Skeleton className="h-96" />
      ) : rows.length === 0 ? (
        <EmptyState title="No students found" description="Try adjusting your search or add a new student." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-500">
                <th className="pb-2">Student</th>
                <th className="pb-2">Courses</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Account</th>
                <th className="pb-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((s) => (
                <tr key={s.id}>
                  <td className="py-3">
                    <Link href={`/admin/students/${s.id}`} className="font-medium text-white hover:text-electric-300">
                      {s.fullName}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {s.studentId} {s.isDemo && <span className="text-amber-400">(Demo)</span>}
                    </p>
                  </td>
                  <td className="py-3 text-slate-300">{s.courses.join(", ") || "—"}</td>
                  <td className="py-3">
                    <Badge color={s.status === "active" ? "green" : "gray"}>{s.status}</Badge>
                  </td>
                  <td className="py-3">
                    <Badge color={s.hasAccount ? "blue" : "amber"}>{s.hasAccount ? "Provisioned" : "No login"}</Badge>
                  </td>
                  <td className="py-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => resetPassword(s.id)} title="Reset / issue password" className="rounded-lg border border-white/10 p-2 text-slate-300 hover:bg-white/5">
                        <KeyRound size={14} />
                      </button>
                      <button onClick={() => archive(s.id)} title="Archive student" className="rounded-lg border border-white/10 p-2 text-rose-300 hover:bg-rose-500/10">
                        <Archive size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
            <span>{total} total students</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-white/10 px-3 py-1 disabled:opacity-40">
                Prev
              </button>
              <button disabled={page * 15 >= total} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-white/10 px-3 py-1 disabled:opacity-40">
                Next
              </button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function AddStudentForm({ onCreated, onTempPassword }: { onCreated: () => void; onTempPassword: (msg: string) => void }) {
  const [studentId, setStudentId] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, fullName, email, phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      if (data.tempPassword) onTempPassword(`Student created. Temporary password: ${data.tempPassword}`);
      onCreated();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <h3 className="mb-4 font-semibold text-white">New Student</h3>
      <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input required placeholder="Unique Student ID (e.g. STU2024010)" value={studentId} onChange={(e) => setStudentId(e.target.value)} />
        <Input required placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <Input type="email" placeholder="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
        {error && <p className="sm:col-span-2 text-sm text-rose-300">{error}</p>}
        <div className="sm:col-span-2">
          <Button type="submit" disabled={loading}>
            Create Student & Issue Login
          </Button>
        </div>
      </form>
    </Card>
  );
}
