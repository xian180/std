export type TopicStatus = "pending" | "in_progress" | "completed";

export function computeTopicCounts(statuses: TopicStatus[]) {
  const total = statuses.length;
  const completed = statuses.filter((s) => s === "completed").length;
  const inProgress = statuses.filter((s) => s === "in_progress").length;
  const pending = total - completed - inProgress;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 1000) / 10;
  return { total, completed, inProgress, pending, percent };
}

export function computeTestSummary(
  results: { marksObtained: number; maxMarks: number }[]
) {
  const totalTests = results.length;
  if (totalTests === 0) {
    return {
      totalTests: 0,
      overallPercentage: 0,
      averageOfPercentages: 0,
      totalObtained: 0,
      totalMax: 0,
    };
  }
  const totalObtained = results.reduce((a, r) => a + r.marksObtained, 0);
  const totalMax = results.reduce((a, r) => a + r.maxMarks, 0);
  const overallPercentage = totalMax === 0 ? 0 : Math.round((totalObtained / totalMax) * 1000) / 10;
  const averageOfPercentages =
    Math.round(
      (results.reduce((a, r) => a + (r.maxMarks === 0 ? 0 : (r.marksObtained / r.maxMarks) * 100), 0) /
        totalTests) *
        10
    ) / 10;
  return { totalTests, overallPercentage, averageOfPercentages, totalObtained, totalMax };
}

export type AttendanceStatus = "present" | "absent" | "leave";

export function computeAttendanceSummary(statuses: AttendanceStatus[]) {
  const total = statuses.length;
  const present = statuses.filter((s) => s === "present").length;
  const absent = statuses.filter((s) => s === "absent").length;
  const leave = statuses.filter((s) => s === "leave").length;
  // Policy: approved leave is excluded from the denominator (excused), so it
  // neither helps nor hurts the attendance percentage.
  const effectiveTotal = total - leave;
  const percent = effectiveTotal === 0 ? 0 : Math.round((present / effectiveTotal) * 1000) / 10;
  return { total, present, absent, leave, effectiveTotal, percent };
}

export function round1(n: number) {
  return Math.round(n * 10) / 10;
}
