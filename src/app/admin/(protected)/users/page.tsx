"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, KeyRound, Ban, CheckCircle2 } from "lucide-react";
import { Badge, Button, Card, Input, SectionHeading, Select, Skeleton } from "@/components/ui";

type UserRow = { id: number; email: string; name: string; role: string; isActive: boolean };
type Course = { id: number; name: string };
type Assignment = { id: number; courseId: number; courseName: string; teacherUserId: number; teacherName: string };

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(() => {
    fetch("/api/admin/users").then((r) => r.json()).then((d) => setUsers(d.users || []));
    fetch("/api/admin/teacher-assignments").then((r) => r.json()).then((d) => setAssignments(d.assignments || []));
  }, []);

  useEffect(() => {
    load();
    fetch("/api/admin/courses").then((r) => r.json()).then((d) => setCourses(d.courses || []));
  }, [load]);

  async function toggleActive(u: UserRow) {
    if (u.isActive) {
      await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
    } else {
      await fetch(`/api/admin/users/${u.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: true }) });
    }
    load();
  }

  async function resetPassword(id: number) {
    const res = await fetch(`/api/admin/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resetPassword: true }) });
    const data = await res.json();
    if (res.ok) setMessage(`Temporary password issued: ${data.tempPassword}`);
  }

  async function assign(teacherUserId: number, courseId: string) {
    if (!courseId) return;
    await fetch("/api/admin/teacher-assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teacherUserId, courseId: Number(courseId) }),
    });
    load();
  }

  async function unassign(id: number) {
    await fetch(`/api/admin/teacher-assignments?id=${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        title="User & Permission Management"
        description="Manage administrator and teacher accounts, and assign teachers to courses."
        action={
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus size={16} /> New Staff Account
          </Button>
        }
      />

      {message && <Card className="border border-electric-400/30 bg-electric-500/10 text-sm text-electric-200">{message}</Card>}
      {showForm && <NewUserForm onCreated={(msg) => { setShowForm(false); setMessage(msg); load(); }} />}

      {!users ? (
        <Skeleton className="h-64" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-500">
                <th className="pb-2">Name</th>
                <th className="pb-2">Role</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Assigned Courses</th>
                <th className="pb-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="py-3">
                    <p className="font-medium text-white">{u.name}</p>
                    <p className="text-xs text-slate-500">{u.email}</p>
                  </td>
                  <td className="py-3">
                    <Badge color={u.role === "admin" ? "purple" : "blue"}>{u.role}</Badge>
                  </td>
                  <td className="py-3">
                    <Badge color={u.isActive ? "green" : "red"}>{u.isActive ? "Active" : "Disabled"}</Badge>
                  </td>
                  <td className="py-3">
                    {u.role === "teacher" ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {assignments
                          .filter((a) => a.teacherUserId === u.id)
                          .map((a) => (
                            <Badge key={a.id} color="gray">
                              {a.courseName}{" "}
                              <button onClick={() => unassign(a.id)} className="ml-1 text-rose-300">
                                ×
                              </button>
                            </Badge>
                          ))}
                        <Select onChange={(e) => assign(u.id, e.target.value)} value="" className="w-36 py-1 text-xs">
                          <option value="">+ Assign course</option>
                          {courses.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </Select>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500">All courses</span>
                    )}
                  </td>
                  <td className="py-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => resetPassword(u.id)} title="Reset password" className="rounded-lg border border-white/10 p-2 text-slate-300 hover:bg-white/5">
                        <KeyRound size={14} />
                      </button>
                      <button onClick={() => toggleActive(u)} title={u.isActive ? "Disable account" : "Enable account"} className="rounded-lg border border-white/10 p-2 text-slate-300 hover:bg-white/5">
                        {u.isActive ? <Ban size={14} className="text-rose-300" /> : <CheckCircle2 size={14} className="text-emerald-300" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function NewUserForm({ onCreated }: { onCreated: (msg: string) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("teacher");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, role }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    onCreated(`Account created for ${data.user.email}. Temporary password: ${data.tempPassword}`);
  }

  return (
    <Card>
      <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input required placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input required type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="teacher">Teacher</option>
          <option value="admin">Administrator</option>
        </Select>
        {error && <p className="text-sm text-rose-300 sm:col-span-2">{error}</p>}
        <div className="sm:col-span-2">
          <Button type="submit">Create Account</Button>
        </div>
      </form>
    </Card>
  );
}
