import { db } from "@/db";
import { modules } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireCourseAccess, errorResponse } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const courseId = Number((await params).id);
    const session = await requireCourseAccess(courseId);
    const body = await req.json();
    const title = String(body.title || "").trim();
    if (!title) return Response.json({ error: "Module title is required." }, { status: 400 });

    const [last] = await db.select().from(modules).where(eq(modules.courseId, courseId)).orderBy(desc(modules.orderIndex)).limit(1);
    const orderIndex = last ? last.orderIndex + 1 : 0;

    const [mod] = await db.insert(modules).values({ courseId, title, orderIndex }).returning();
    await logAudit(session.userId, "module_created", "module", mod.id, { courseId, title });
    return Response.json({ module: mod }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
