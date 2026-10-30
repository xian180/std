"use client";

import { useEffect, useState, useCallback } from "react";
import { ClipboardList } from "lucide-react";
import { Badge, Card, EmptyState, SectionHeading, Select, Skeleton, StatCard } from "@/components/ui";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

type TestResult = {
  testId: number;
  testName: string;
  courseId: number;
  courseName: string;
  testDate: string;
  marksObtained: number;
  maxMarks: number;
  percentage: number;
  passingMarks: number | null;
  passed: boolean | null;
  feedback: string | null;
};

type TestsData = {
  courses: { courseId: number; courseName: string }[];
  results: TestResult[];
  summary: { totalTests: number; overallPercentage: number; averageOfPercentages: number };
};

export default function TestsPage() {
  const [data, setData] = useState<TestsData | null>(null);
  const [courseId, setCourseId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (cid: string) => {
    setLoading(true);
    const url = cid ? `/api/student/tests?courseId=${cid}` : "/api/student/tests";
    const res = await fetch(url);
    setData(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load("");
  }, [load]);

  if (loading) return <Skeleton className="h-96" />;
  if (!data) return null;

  const chartData = data.results.map((r) => ({
    name: r.testName.length > 12 ? r.testName.slice(0, 12) + "…" : r.testName,
    percentage: r.percentage,
  }));

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Test Results & Performance"
        description="Percentages are calculated as (Marks Obtained ÷ Maximum Marks) × 100."
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={<ClipboardList size={20} />} label="Tests Completed" value={data.summary.totalTests} color="#a855f7" />
        <StatCard
          icon={<ClipboardList size={20} />}
          label="Overall Percentage"
          value={`${data.summary.overallPercentage}%`}
          sub="Total marks obtained ÷ total maximum marks"
          color="#2f6fff"
        />
        <StatCard
          icon={<ClipboardList size={20} />}
          label="Average of Test %"
          value={`${data.summary.averageOfPercentages}%`}
          sub="Simple average across tests"
          color="#06b6d4"
        />
      </div>

      {data.results.length === 0 ? (
        <EmptyState icon={<ClipboardList />} title="No test results yet" description="Your test marks will appear here once published by your teacher." />
      ) : (
        <>
          <Card>
            <h3 className="mb-4 font-semibold text-white">Score Trend</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2f5c" />
                  <XAxis dataKey="name" stroke="#6b7aa3" fontSize={12} />
                  <YAxis stroke="#6b7aa3" fontSize={12} domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: "#0d1730", border: "1px solid #273a63", borderRadius: 12, color: "#fff" }} />
                  <Line type="monotone" dataKey="percentage" stroke="#4f8bff" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="overflow-x-auto">
            <h3 className="mb-4 font-semibold text-white">Test History</h3>
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-500">
                  <th className="pb-2">Test</th>
                  <th className="pb-2">Course</th>
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Marks</th>
                  <th className="pb-2">Percentage</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.results.map((r) => (
                  <tr key={r.testId}>
                    <td className="py-3 text-white">
                      {r.testName}
                      {r.feedback && <p className="text-xs font-normal text-slate-500">{r.feedback}</p>}
                    </td>
                    <td className="py-3 text-slate-300">{r.courseName}</td>
                    <td className="py-3 text-slate-300">{new Date(r.testDate).toLocaleDateString()}</td>
                    <td className="py-3 text-slate-300">
                      {r.marksObtained} / {r.maxMarks}
                    </td>
                    <td className="py-3 text-slate-300">{r.percentage}%</td>
                    <td className="py-3">
                      {r.passed === null ? (
                        <Badge color="gray">N/A</Badge>
                      ) : r.passed ? (
                        <Badge color="green">Pass</Badge>
                      ) : (
                        <Badge color="red">Fail</Badge>
                      )}
                    </td>
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
