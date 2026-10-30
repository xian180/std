import { db } from "@/db";
import { topics, modules } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireCourseAccess, errorResponse } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

async function getCourseIdForTopic(topicId: number) {
  const [row] = await db.select().from(topics).innerJoin(modules, eq(topics.moduleId, modules.id)).where(eq(topics.id, topicId)).limit(1);
  return row ? { courseId: row.modules.courseId, topic: row.topics } : null;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = Number((await params).id);
    const info = await getCourseIdForTopic(id);
    if (!info) return Response.json({ error: "Topic not found" }, { status: 404 });
    const session = await requireCourseAccess(info.courseId);
    const body = await req.json();
    const title = body.title ? String(body.title) : info.topic.title;
    const [updated] = await db.update(topics).set({ title }).where(eq(topics.id, id)).returning();
    await logAudit(session.userId, "topic_updated", "topic", id, { title });
    return Response.json({ topic: updated });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = Number((await params).id);
    const info = await getCourseIdForTopic(id);
    if (!info) return Response.json({ error: "Topic not found" }, { status: 404 });
    const session = await requireCourseAccess(info.courseId);
    await db.update(topics).set({ isDeleted: true }).where(eq(topics.id, id));
    await logAudit(session.userId, "topic_deleted", "topic", id);
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
