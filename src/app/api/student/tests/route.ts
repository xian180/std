import { db } from "@/db";
import { enrollments, courses, tests, testResults } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { requireStudentSelf, errorResponse } from "@/lib/authz";
import { computeTestSummary } from "@/lib/calculations";

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
      return Response.json({ courses: enrolledCourses, results: [], summary: computeTestSummary([]) });
    }

    const testRows = await db
      .select()
      .from(tests)
      .where(inArray(tests.courseId, validCourseIds))
      .orderBy(tests.testDate);
    const testIds = testRows.map((t) => t.id);
    const resultRows = testIds.length
      ? await db
          .select()
          .from(testResults)
          .where(and(eq(testResults.studentId, session.studentId), inArray(testResults.testId, testIds)))
      : [];
    const resultByTest = new Map(resultRows.map((r) => [r.testId, r]));
    const courseNameById = new Map(enrolledCourses.map((c) => [c.courseId, c.courseName]));

    const results = testRows
      .filter((t) => resultByTest.has(t.id))
      .map((t) => {
        const r = resultByTest.get(t.id)!;
        const maxMarks = Number(t.maxMarks);
        const marksObtained = Number(r.marksObtained);
        const percentage = maxMarks === 0 ? 0 : Math.round((marksObtained / maxMarks) * 1000) / 10;
        const passingMarks = t.passingMarks ? Number(t.passingMarks) : null;
        return {
          testId: t.id,
          testName: t.name,
          courseId: t.courseId,
          courseName: courseNameById.get(t.courseId) || "",
          testDate: t.testDate,
          marksObtained,
          maxMarks,
          percentage,
          passingMarks,
          passed: passingMarks !== null ? marksObtained >= passingMarks : null,
          feedback: r.feedback,
        };
      });

    const summary = computeTestSummary(results.map((r) => ({ marksObtained: r.marksObtained, maxMarks: r.maxMarks })));

    return Response.json({ courses: enrolledCourses, results, summary });
  } catch (err) {
    return errorResponse(err);
  }
}
