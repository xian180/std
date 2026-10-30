import { db } from "@/db";
import { enrollments } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireRole, errorResponse } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(["admin"]);
    const studentId = Number((await params).id);
    const body = await req.json();
    const courseId = Number(body.courseId);
    if (!courseId) return Response.json({ error: "courseId is required" }, { status: 400 });

    const existing = await db
      .select()
      .from(enrollments)
      .where(and(eq(enrollments.studentId, studentId), eq(enrollments.courseId, courseId)))
      .limit(1);
    if (existing.length > 0) {
      return Response.json({ error: "Student is already enrolled in this course." }, { status: 409 });
    }

    const [enrollment] = await db.insert(enrollments).values({ studentId, courseId }).returning();
    await logAudit(session.userId, "student_enrolled", "enrollment", enrollment.id, { studentId, courseId });
    return Response.json({ enrollment }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(["admin"]);
    const studentId = Number((await params).id);
    const body = await req.json();
    const courseId = Number(body.courseId);
    const status = String(body.status);
    if (!["active", "completed", "dropped"].includes(status)) {
      return Response.json({ error: "Invalid status" }, { status: 400 });
    }
    const [updated] = await db
      .update(enrollments)
      .set({ status: status as "active" | "completed" | "dropped" })
      .where(and(eq(enrollments.studentId, studentId), eq(enrollments.courseId, courseId)))
      .returning();
    if (!updated) return Response.json({ error: "Enrollment not found" }, { status: 404 });
    await logAudit(session.userId, "enrollment_status_updated", "enrollment", updated.id, { status });
    return Response.json({ enrollment: updated });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(["admin"]);
    const studentId = Number((await params).id);
    const { searchParams } = new URL(req.url);
    const courseId = Number(searchParams.get("courseId"));
    await db.delete(enrollments).where(and(eq(enrollments.studentId, studentId), eq(enrollments.courseId, courseId)));
    await logAudit(session.userId, "enrollment_removed", "enrollment", undefined, { studentId, courseId });
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
