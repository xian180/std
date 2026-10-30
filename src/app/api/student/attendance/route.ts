import { db } from "@/db";
import { enrollments, courses, classSessions, attendanceRecords } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { requireStudentSelf, errorResponse } from "@/lib/authz";
import { computeAttendanceSummary } from "@/lib/calculations";

export async function GET(req: Request) {
  try {
    const session = await requireStudentSelf();
    const { searchParams } = new URL(req.url);
    const courseIdParam = searchParams.get("courseId");

    const enrolledCourses = await db
      .select({ courseId: courses.id, courseName: courses.name })
      .from(enrollments)
      .innerJoin(courses, eq(enrollments.courseId, courses.id))
      .where(eq(enrollments.studentId, session.studentId));

    const courseIds = courseIdParam ? [Number(courseIdParam)] : enrolledCourses.map((c) => c.courseId);
    const validCourseIds = courseIds.filter((id) => enrolledCourses.some((c) => c.courseId === id));

    if (validCourseIds.length === 0) {
      return Response.json({ courses: enrolledCourses, records: [], summary: computeAttendanceSummary([]) });
    }

    const sessionRows = await db
      .select()
      .from(classSessions)
      .where(inArray(classSessions.courseId, validCourseIds))
      .orderBy(classSessions.sessionDate);
    const sessionIds = sessionRows.map((s) => s.id);
    const recordRows = sessionIds.length
      ? await db
          .select()
          .from(attendanceRecords)
          .where(and(eq(attendanceRecords.studentId, session.studentId), inArray(attendanceRecords.sessionId, sessionIds)))
      : [];
    const recordBySession = new Map(recordRows.map((r) => [r.sessionId, r]));
    const courseNameById = new Map(enrolledCourses.map((c) => [c.courseId, c.courseName]));

    const records = sessionRows
      .filter((s) => recordBySession.has(s.id))
      .map((s) => {
        const r = recordBySession.get(s.id)!;
        return {
          sessionId: s.id,
          sessionDate: s.sessionDate,
          title: s.title,
          courseId: s.courseId,
          courseName: courseNameById.get(s.courseId) || "",
          status: r.status,
          remarks: r.remarks,
        };
      });

    const summary = computeAttendanceSummary(records.map((r) => r.status as "present" | "absent" | "leave"));

    return Response.json({ courses: enrolledCourses, records, summary });
  } catch (err) {
    return errorResponse(err);
  }
}
