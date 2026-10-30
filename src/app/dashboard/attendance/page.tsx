"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { CalendarCheck2 } from "lucide-react";
import { Badge, Card, EmptyState, SectionHeading, Select, Skeleton, StatCard } from "@/components/ui";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

type Record_ = { sessionId: number; sessionDate: string; title: string | null; courseId: number; courseName: string; status: string; remarks: string | null };
type AttendanceData = {
  courses: { courseId: number; courseName: string }[];
  records: Record_[];
  summary: { total: number; present: number; absent: number; leave: number; effectiveTotal: number; percent: number };
};

const STATUS_COLOR: Record<string, "green" | "red" | "amber"> = { present: "green", absent: "red", leave: "amber" };

export default function AttendancePage() {
  const [data, setData] = useState<AttendanceData | null>(null);
  const [courseId, setCourseId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (cid: string) => {
    setLoading(true);
    const url = cid ? `/api/student/attendance?courseId=${cid}` : "/api/student/attendance";
    const res = await fetch(url);
    setData(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load("");
  }, [load]);

  const monthly = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, { month: string; present: number; absent: number; leave: number }>();
    for (const r of data.records) {
      const d = new Date(r.sessionDate);
      const key = `${d.toLocaleString("default", { month: "short" })} ${d.getFullYear()}`;
      if (!map.has(key)) map.set(key, { month: key, present: 0, absent: 0, leave: 0 });
      const entry = map.get(key)!;
      if (r.status === "present") entry.present++;
      else if (r.status === "absent") entry.absent++;
      else entry.leave++;
    }
    return Array.from(map.values());
  }, [data]);

  if (loading) return <Skeleton className="h-96" />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Attendance Report"
        description="Approved leave is excluded from the attendance percentage calculation."
        action={
          <Select
            value={courseId}
            onChange={(e) => {
              setCourseId(e.target.value);
              load(e.target.value);
            }}
            className="w-56"
          >
            <option value="">All Courses</option>
            {data.courses.map((c) => (
              <option key={c.courseId} value={c.courseId}>
                {c.courseName}
              </option>
            ))}
          </Select>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<CalendarCheck2 size={20} />} label="Attendance %" value={`${data.summary.percent}%`} color="#06b6d4" />
        <StatCard icon={<CalendarCheck2 size={20} />} label="Classes Attended" value={data.summary.present} color="#22c55e" />
        <StatCard icon={<CalendarCheck2 size={20} />} label="Classes Missed" value={data.summary.absent} color="#f43f5e" />
        <StatCard icon={<CalendarCheck2 size={20} />} label="Approved Leave" value={data.summary.leave} color="#f59e0b" />
      </div>

      {data.records.length === 0 ? (
        <EmptyState icon={<CalendarCheck2 />} title="No attendance recorded yet" description="Your attendance will appear here once your teacher records class sessions." />
      ) : (
        <>
          <Card>
            <h3 className="mb-4 font-semibold text-white">Monthly Attendance</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2f5c" />
                  <XAxis dataKey="month" stroke="#6b7aa3" fontSize={12} />
                  <YAxis stroke="#6b7aa3" fontSize={12} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "#0d1730", border: "1px solid #273a63", borderRadius: 12, color: "#fff" }} />
                  <Legend />
                  <Bar dataKey="present" stackId="a" fill="#22c55e" name="Present" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="absent" stackId="a" fill="#f43f5e" name="Absent" />
                  <Bar dataKey="leave" stackId="a" fill="#f59e0b" name="Leave" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="overflow-x-auto">
            <h3 className="mb-4 font-semibold text-white">Date-wise History</h3>
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-500">
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Course</th>
                  <th className="pb-2">Session</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.records
                  .slice()
                  .reverse()
                  .map((r) => (
                    <tr key={r.sessionId}>
                      <td className="py-3 text-slate-300">{new Date(r.sessionDate).toLocaleDateString()}</td>
                      <td className="py-3 text-slate-300">{r.courseName}</td>
                      <td className="py-3 text-slate-300">{r.title || "Regular Class"}</td>
                      <td className="py-3">
                        <Badge color={STATUS_COLOR[r.status] || "gray"}>{r.status}</Badge>
                      </td>
                      <td className="py-3 text-slate-500">{r.remarks || "—"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}
