import { db } from "@/db";
import { students, enrollments, courses, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole, errorResponse } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(["admin", "teacher"]);
    const id = Number((await params).id);
    const [student] = await db.select().from(students).where(eq(students.id, id)).limit(1);
    if (!student) return Response.json({ error: "Student not found" }, { status: 404 });

    const enrolled = await db
      .select({
        enrollmentId: enrollments.id,
        courseId: courses.id,
        courseName: courses.name,
        status: enrollments.status,
        enrolledAt: enrollments.enrolledAt,
      })
      .from(enrollments)
      .innerJoin(courses, eq(enrollments.courseId, courses.id))
      .where(eq(enrollments.studentId, id));

    let account = null;
    if (student.userId) {
      const [u] = await db.select().from(users).where(eq(users.id, student.userId)).limit(1);
      if (u) account = { email: u.email, isActive: u.isActive, mustChangePassword: u.mustChangePassword };
    }

    return Response.json({ student, enrollments: enrolled, account });
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
    for (const key of ["fullName", "displayName", "email", "phone", "bio", "photoUrl", "status"]) {
      if (key in body) updates[key] = body[key];
    }
    if (Object.keys(updates).length === 0) {
      return Response.json({ error: "No valid fields to update." }, { status: 400 });
    }
    const [updated] = await db.update(students).set(updates).where(eq(students.id, id)).returning();
    if (!updated) return Response.json({ error: "Student not found" }, { status: 404 });
    await logAudit(session.userId, "student_updated", "student", id, updates);
    return Response.json({ student: updated });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(["admin"]);
    const id = Number((await params).id);
    const [updated] = await db.update(students).set({ isArchived: true, status: "archived" }).where(eq(students.id, id)).returning();
    if (!updated) return Response.json({ error: "Student not found" }, { status: 404 });
    await logAudit(session.userId, "student_archived", "student", id);
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
