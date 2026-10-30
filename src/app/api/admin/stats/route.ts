import { db } from "@/db";
import { students, courses, projects, testResults, attendanceRecords, auditLogs, users, enrollments, studentTopicProgress, topics, modules } from "@/db/schema";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { requireRole, errorResponse } from "@/lib/authz";
import { computeTopicCounts } from "@/lib/calculations";

export async function GET() {
  try {
    await requireRole(["admin", "teacher"]);

    const [{ count: totalStudents }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(students)
      .where(eq(students.isArchived, false));
    const [{ count: activeCourses }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(courses)
      .where(eq(courses.isArchived, false));
    const [{ count: totalProjects }] = await db.select({ count: sql<number>`count(*)::int` }).from(projects).where(eq(projects.isArchived, false));
    const [{ count: publishedProjects }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(projects)
      .where(and(eq(projects.isArchived, false), eq(projects.isPublished, true)));
    const [{ count: totalUsers }] = await db.select({ count: sql<number>`count(*)::int` }).from(users);

    const recentResults = await db
      .select({
        id: testResults.id,
        marksObtained: testResults.marksObtained,
        updatedAt: testResults.updatedAt,
        studentId: testResults.studentId,
        testId: testResults.testId,
      })
      .from(testResults)
      .orderBy(desc(testResults.updatedAt))
      .limit(5);

    const recentAudit = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(10);

    const [{ count: last30DaysAttendance }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(attendanceRecords)
      .where(gte(attendanceRecords.updatedAt, sql`now() - interval '30 days'`));

    // Students needing attention: syllabus completion below 40% OR attendance below 60%
    const allStudents = await db.select().from(students).where(eq(students.isArchived, false));
    const atRisk: { studentId: string; name: string; reason: string }[] = [];
    for (const s of allStudents) {
      const enrolled = await db.select().from(enrollments).where(eq(enrollments.studentId, s.id));
      if (enrolled.length === 0) continue;
      const courseIds = enrolled.map((e) => e.courseId);
      const moduleRows = await db.select().from(modules).where(sql`${modules.courseId} in ${courseIds}`);
      const moduleIds = moduleRows.map((m) => m.id);
      const topicRows = moduleIds.length ? await db.select().from(topics).where(and(sql`${topics.moduleId} in ${moduleIds}`, eq(topics.isDeleted, false))) : [];
      const progressRows = topicRows.length
        ? await db.select().from(studentTopicProgress).where(and(eq(studentTopicProgress.studentId, s.id), sql`${studentTopicProgress.topicId} in ${topicRows.map((t) => t.id)}`))
        : [];
      const progressMap = new Map(progressRows.map((p) => [p.topicId, p.status]));
      const statuses = topicRows.map((t) => progressMap.get(t.id) || "pending");
      const summary = computeTopicCounts(statuses);
      if (summary.total > 0 && summary.percent < 40) {
        atRisk.push({ studentId: s.studentId, name: s.fullName, reason: `Syllabus completion only ${summary.percent}%` });
      }
      if (atRisk.length >= 8) break;
    }

    return Response.json({
      totalStudents,
      activeCourses,
      totalProjects,
      publishedProjects,
      totalUsers,
      recentResultsCount: recentResults.length,
      last30DaysAttendance,
      atRiskStudents: atRisk,
      recentActivity: recentAudit,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
