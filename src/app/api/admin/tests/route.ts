import { db } from "@/db";
import { tests, courses, teacherAssignments } from "@/db/schema";
import { desc, eq, inArray } from "drizzle-orm";
import { requireCourseAccess, requireRole, errorResponse } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    const session = await requireRole(["admin", "teacher"]);
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");

    let courseIds: number[] | undefined;
    if (session.role === "teacher") {
      const assigned = await db.select().from(teacherAssignments).where(eq(teacherAssignments.teacherUserId, session.userId));
      courseIds = assigned.map((a) => a.courseId);
    }

    let rows;
    if (courseId) {
      await requireCourseAccess(Number(courseId));
      rows = await db.select().from(tests).where(eq(tests.courseId, Number(courseId))).orderBy(desc(tests.testDate));
    } else if (courseIds) {
      rows = courseIds.length ? await db.select().from(tests).where(inArray(tests.courseId, courseIds)).orderBy(desc(tests.testDate)) : [];
    } else {
      rows = await db.select().from(tests).orderBy(desc(tests.testDate));
    }

    const allCourses = await db.select().from(courses);
    const courseMap = new Map(allCourses.map((c) => [c.id, c.name]));
    return Response.json({ tests: rows.map((t) => ({ ...t, courseName: courseMap.get(t.courseId) })) });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const courseId = Number(body.courseId);
    const session = await requireCourseAccess(courseId);
    const name = String(body.name || "").trim();
    const testDate = String(body.testDate || "");
    const maxMarks = Number(body.maxMarks);
    const passingMarks = body.passingMarks !== undefined && body.passingMarks !== null && body.passingMarks !== "" ? Number(body.passingMarks) : null;

    if (!name || !testDate || !maxMarks || maxMarks <= 0) {
      return Response.json({ error: "Name, date, and a positive maximum marks value are required." }, { status: 400 });
    }
    if (passingMarks !== null && (passingMarks < 0 || passingMarks > maxMarks)) {
      return Response.json({ error: "Passing marks must be between 0 and the maximum marks." }, { status: 400 });
    }

    const [test] = await db
      .insert(tests)
      .values({ courseId, name, testDate, maxMarks: String(maxMarks), passingMarks: passingMarks !== null ? String(passingMarks) : null })
      .returning();
    await logAudit(session.userId, "test_created", "test", test.id, { courseId, name });
    return Response.json({ test }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
