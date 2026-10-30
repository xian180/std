import { db } from "@/db";
import { tests, testResults, enrollments, students } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireCourseAccess, errorResponse } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { notifications } from "@/db/schema";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const testId = Number((await params).id);
    const [test] = await db.select().from(tests).where(eq(tests.id, testId)).limit(1);
    if (!test) return Response.json({ error: "Test not found" }, { status: 404 });
    await requireCourseAccess(test.courseId);

    const enrolledStudents = await db
      .select({ id: students.id, studentId: students.studentId, fullName: students.fullName })
      .from(enrollments)
      .innerJoin(students, eq(enrollments.studentId, students.id))
      .where(eq(enrollments.courseId, test.courseId));

    const results = await db.select().from(testResults).where(eq(testResults.testId, testId));
    const resultByStudent = new Map(results.map((r) => [r.studentId, r]));

    const combined = enrolledStudents.map((s) => {
      const r = resultByStudent.get(s.id);
      return {
        studentId: s.id,
        studentCode: s.studentId,
        fullName: s.fullName,
        marksObtained: r ? Number(r.marksObtained) : null,
        feedback: r?.feedback || "",
      };
    });

    return Response.json({ test, results: combined });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const testId = Number((await params).id);
    const [test] = await db.select().from(tests).where(eq(tests.id, testId)).limit(1);
    if (!test) return Response.json({ error: "Test not found" }, { status: 404 });
    const session = await requireCourseAccess(test.courseId);

    const body = await req.json();
    const studentId = Number(body.studentId);
    const marksObtained = Number(body.marksObtained);
    const feedback = body.feedback ? String(body.feedback) : null;
    const maxMarks = Number(test.maxMarks);

    if (Number.isNaN(marksObtained) || marksObtained < 0 || marksObtained > maxMarks) {
      return Response.json({ error: `Marks must be between 0 and ${maxMarks}.` }, { status: 400 });
    }

    const existing = await db.select().from(testResults).where(and(eq(testResults.testId, testId), eq(testResults.studentId, studentId))).limit(1);

    let saved;
    if (existing.length > 0) {
      [saved] = await db
        .update(testResults)
        .set({ marksObtained: String(marksObtained), feedback, enteredBy: session.userId, updatedAt: new Date() })
        .where(eq(testResults.id, existing[0].id))
        .returning();
    } else {
      [saved] = await db
        .insert(testResults)
        .values({ testId, studentId, marksObtained: String(marksObtained), feedback, enteredBy: session.userId })
        .returning();
      await db.insert(notifications).values({
        studentId,
        type: "test_published",
        message: `New marks published for "${test.name}": ${marksObtained}/${maxMarks}.`,
      });
    }

    await logAudit(session.userId, "test_result_saved", "test_result", saved.id, { testId, studentId, marksObtained });
    return Response.json({ result: saved });
  } catch (err) {
    return errorResponse(err);
  }
}
