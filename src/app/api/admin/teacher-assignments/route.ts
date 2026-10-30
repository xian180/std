import { db } from "@/db";
import { teacherAssignments, courses, users } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireRole, errorResponse } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    await requireRole(["admin"]);
    const { searchParams } = new URL(req.url);
    const teacherUserId = searchParams.get("teacherUserId");
    const rows = teacherUserId
      ? await db
          .select({ id: teacherAssignments.id, courseId: teacherAssignments.courseId, courseName: courses.name })
          .from(teacherAssignments)
          .innerJoin(courses, eq(teacherAssignments.courseId, courses.id))
          .where(eq(teacherAssignments.teacherUserId, Number(teacherUserId)))
      : await db
          .select({
            id: teacherAssignments.id,
            courseId: teacherAssignments.courseId,
            courseName: courses.name,
            teacherUserId: teacherAssignments.teacherUserId,
            teacherName: users.name,
          })
          .from(teacherAssignments)
          .innerJoin(courses, eq(teacherAssignments.courseId, courses.id))
          .innerJoin(users, eq(teacherAssignments.teacherUserId, users.id));
    return Response.json({ assignments: rows });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireRole(["admin"]);
    const body = await req.json();
    const teacherUserId = Number(body.teacherUserId);
    const courseId = Number(body.courseId);
    const existing = await db
      .select()
      .from(teacherAssignments)
      .where(and(eq(teacherAssignments.teacherUserId, teacherUserId), eq(teacherAssignments.courseId, courseId)))
      .limit(1);
    if (existing.length > 0) return Response.json({ error: "Teacher is already assigned to this course." }, { status: 409 });
    const [assignment] = await db.insert(teacherAssignments).values({ teacherUserId, courseId }).returning();
    await logAudit(session.userId, "teacher_assigned", "teacher_assignment", assignment.id, { teacherUserId, courseId });
    return Response.json({ assignment }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await requireRole(["admin"]);
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    await db.delete(teacherAssignments).where(eq(teacherAssignments.id, id));
    await logAudit(session.userId, "teacher_unassigned", "teacher_assignment", id);
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
