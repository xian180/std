import { db } from "@/db";
import { courses, modules, topics, enrollments, students } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { requireCourseAccess, requireRole, errorResponse } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = Number((await params).id);
    await requireCourseAccess(id);
    const [course] = await db.select().from(courses).where(eq(courses.id, id)).limit(1);
    if (!course) return Response.json({ error: "Course not found" }, { status: 404 });

    const moduleRows = await db.select().from(modules).where(eq(modules.courseId, id)).orderBy(modules.orderIndex);
    const moduleIds = moduleRows.map((m) => m.id);
    const topicRows = moduleIds.length
      ? await db.select().from(topics).where(and(inArray(topics.moduleId, moduleIds), eq(topics.isDeleted, false))).orderBy(topics.orderIndex)
      : [];

    const enrolledStudents = await db
      .select({ id: students.id, studentId: students.studentId, fullName: students.fullName, status: enrollments.status })
      .from(enrollments)
      .innerJoin(students, eq(enrollments.studentId, students.id))
      .where(eq(enrollments.courseId, id));

    return Response.json({
      course,
      modules: moduleRows.map((m) => ({ ...m, topics: topicRows.filter((t) => t.moduleId === m.id) })),
      enrolledStudents,
    });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(["admin"]);
    const id = Number((await params).id);
    const body = await req.json();
    const updates: Record<string, unknown> = {};
    for (const key of ["name", "description", "category"]) {
      if (key in body) updates[key] = body[key];
    }
    if (Object.keys(updates).length === 0) return Response.json({ error: "No valid fields to update." }, { status: 400 });
    const [updated] = await db.update(courses).set(updates).where(eq(courses.id, id)).returning();
    if (!updated) return Response.json({ error: "Course not found" }, { status: 404 });
    await logAudit(session.userId, "course_updated", "course", id, updates);
    return Response.json({ course: updated });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(["admin"]);
    const id = Number((await params).id);
    const [updated] = await db.update(courses).set({ isArchived: true }).where(eq(courses.id, id)).returning();
    if (!updated) return Response.json({ error: "Course not found" }, { status: 404 });
    await logAudit(session.userId, "course_archived", "course", id);
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
