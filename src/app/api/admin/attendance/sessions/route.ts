import { db } from "@/db";
import { classSessions, courses, teacherAssignments } from "@/db/schema";
import { desc, eq, inArray } from "drizzle-orm";
import { requireCourseAccess, requireRole, errorResponse } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    const session = await requireRole(["admin", "teacher"]);
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");

    let rows;
    if (courseId) {
      await requireCourseAccess(Number(courseId));
      rows = await db.select().from(classSessions).where(eq(classSessions.courseId, Number(courseId))).orderBy(desc(classSessions.sessionDate));
    } else if (session.role === "teacher") {
      const assigned = await db.select().from(teacherAssignments).where(eq(teacherAssignments.teacherUserId, session.userId));
      const ids = assigned.map((a) => a.courseId);
      rows = ids.length ? await db.select().from(classSessions).where(inArray(classSessions.courseId, ids)).orderBy(desc(classSessions.sessionDate)) : [];
    } else {
      rows = await db.select().from(classSessions).orderBy(desc(classSessions.sessionDate));
    }

    const allCourses = await db.select().from(courses);
    const courseMap = new Map(allCourses.map((c) => [c.id, c.name]));
    return Response.json({ sessions: rows.map((s) => ({ ...s, courseName: courseMap.get(s.courseId) })) });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const courseId = Number(body.courseId);
    const session = await requireCourseAccess(courseId);
    const sessionDate = String(body.sessionDate || "");
    const title = body.title ? String(body.title) : "Regular Class";
    if (!sessionDate) return Response.json({ error: "Session date is required." }, { status: 400 });

    const [created] = await db.insert(classSessions).values({ courseId, sessionDate, title }).returning();
    await logAudit(session.userId, "session_created", "class_session", created.id, { courseId, sessionDate });
    return Response.json({ session: created }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
