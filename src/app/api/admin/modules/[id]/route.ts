import { db } from "@/db";
import { modules, topics } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireCourseAccess, errorResponse } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = Number((await params).id);
    const [mod] = await db.select().from(modules).where(eq(modules.id, id)).limit(1);
    if (!mod) return Response.json({ error: "Module not found" }, { status: 404 });
    const session = await requireCourseAccess(mod.courseId);
    const body = await req.json();
    const title = body.title ? String(body.title) : mod.title;
    const [updated] = await db.update(modules).set({ title }).where(eq(modules.id, id)).returning();
    await logAudit(session.userId, "module_updated", "module", id, { title });
    return Response.json({ module: updated });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = Number((await params).id);
    const [mod] = await db.select().from(modules).where(eq(modules.id, id)).limit(1);
    if (!mod) return Response.json({ error: "Module not found" }, { status: 404 });
    const session = await requireCourseAccess(mod.courseId);
    await db.update(topics).set({ isDeleted: true }).where(eq(topics.moduleId, id));
    await db.delete(modules).where(eq(modules.id, id));
    await logAudit(session.userId, "module_deleted", "module", id);
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
