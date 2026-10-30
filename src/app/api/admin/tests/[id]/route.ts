import { db } from "@/db";
import { tests } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireCourseAccess, errorResponse } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = Number((await params).id);
    const [test] = await db.select().from(tests).where(eq(tests.id, id)).limit(1);
    if (!test) return Response.json({ error: "Test not found" }, { status: 404 });
    const session = await requireCourseAccess(test.courseId);
    const body = await req.json();
    const updates: Record<string, unknown> = {};
    if (body.name) updates.name = String(body.name);
    if (body.testDate) updates.testDate = String(body.testDate);
    if (body.maxMarks !== undefined) updates.maxMarks = String(Number(body.maxMarks));
    if (body.passingMarks !== undefined) updates.passingMarks = body.passingMarks === null || body.passingMarks === "" ? null : String(Number(body.passingMarks));

    const [updated] = await db.update(tests).set(updates).where(eq(tests.id, id)).returning();
    await logAudit(session.userId, "test_updated", "test", id, updates);
    return Response.json({ test: updated });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = Number((await params).id);
    const [test] = await db.select().from(tests).where(eq(tests.id, id)).limit(1);
    if (!test) return Response.json({ error: "Test not found" }, { status: 404 });
    const session = await requireCourseAccess(test.courseId);
    await db.delete(tests).where(eq(tests.id, id));
    await logAudit(session.userId, "test_deleted", "test", id);
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
