import { db } from "@/db";
import { modules, topics } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { requireCourseAccess, errorResponse } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const moduleId = Number((await params).id);
    const [mod] = await db.select().from(modules).where(eq(modules.id, moduleId)).limit(1);
    if (!mod) return Response.json({ error: "Module not found" }, { status: 404 });
    const session = await requireCourseAccess(mod.courseId);
    const body = await req.json();
    const title = String(body.title || "").trim();
    if (!title) return Response.json({ error: "Topic title is required." }, { status: 400 });

    const [last] = await db
      .select()
      .from(topics)
      .where(and(eq(topics.moduleId, moduleId), eq(topics.isDeleted, false)))
      .orderBy(desc(topics.orderIndex))
      .limit(1);
    const orderIndex = last ? last.orderIndex + 1 : 0;

    const [topic] = await db.insert(topics).values({ moduleId, title, orderIndex }).returning();
    await logAudit(session.userId, "topic_created", "topic", topic.id, { moduleId, title });
    return Response.json({ topic }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
