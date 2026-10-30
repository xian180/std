import { db } from "@/db";
import { modules, topics, studentTopicProgress, courses } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { requireCourseAccess, errorResponse } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { notifications } from "@/db/schema";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const studentId = Number((await params).id);
    const { searchParams } = new URL(req.url);
    const courseId = Number(searchParams.get("courseId"));
    if (!courseId) return Response.json({ error: "courseId is required" }, { status: 400 });
    await requireCourseAccess(courseId);

    const [course] = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
    const moduleRows = await db.select().from(modules).where(eq(modules.courseId, courseId)).orderBy(modules.orderIndex);
    const moduleIds = moduleRows.map((m) => m.id);
    const topicRows = moduleIds.length
      ? await db.select().from(topics).where(and(inArray(topics.moduleId, moduleIds), eq(topics.isDeleted, false))).orderBy(topics.orderIndex)
      : [];
    const progressRows = topicRows.length
      ? await db
          .select()
          .from(studentTopicProgress)
          .where(and(eq(studentTopicProgress.studentId, studentId), inArray(studentTopicProgress.topicId, topicRows.map((t) => t.id))))
      : [];
    const progressMap = new Map(progressRows.map((p) => [p.topicId, p]));

    const moduleList = moduleRows.map((m) => ({
      id: m.id,
      title: m.title,
      topics: topicRows
        .filter((t) => t.moduleId === m.id)
        .map((t) => {
          const p = progressMap.get(t.id);
          return { id: t.id, title: t.title, status: p?.status || "pending", completedAt: p?.completedAt || null, remarks: p?.remarks || null };
        }),
    }));

    return Response.json({ course, modules: moduleList });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const studentId = Number((await params).id);
    const body = await req.json();
    const topicId = Number(body.topicId);
    const status = String(body.status);
    const remarks = body.remarks ? String(body.remarks) : null;
    if (!["pending", "in_progress", "completed"].includes(status)) {
      return Response.json({ error: "Invalid status" }, { status: 400 });
    }

    const [topic] = await db.select().from(topics).innerJoin(modules, eq(topics.moduleId, modules.id)).where(eq(topics.id, topicId)).limit(1);
    if (!topic) return Response.json({ error: "Topic not found" }, { status: 404 });
    const courseId = topic.modules.courseId;
    const session = await requireCourseAccess(courseId);

    const existing = await db
      .select()
      .from(studentTopicProgress)
      .where(and(eq(studentTopicProgress.studentId, studentId), eq(studentTopicProgress.topicId, topicId)))
      .limit(1);

    let saved;
    if (existing.length > 0) {
      [saved] = await db
        .update(studentTopicProgress)
        .set({ status: status as "pending" | "in_progress" | "completed", remarks, completedAt: status === "completed" ? new Date() : null, updatedBy: session.userId, updatedAt: new Date() })
        .where(eq(studentTopicProgress.id, existing[0].id))
        .returning();
    } else {
      [saved] = await db
        .insert(studentTopicProgress)
        .values({
          studentId,
          topicId,
          status: status as "pending" | "in_progress" | "completed",
          remarks,
          completedAt: status === "completed" ? new Date() : null,
          updatedBy: session.userId,
        })
        .returning();
    }

    await logAudit(session.userId, "topic_progress_updated", "student_topic_progress", saved.id, { studentId, topicId, status });
    await db.insert(notifications).values({
      studentId,
      type: "syllabus_update",
      message: `Your progress for "${topic.topics.title}" was updated to "${status.replace("_", " ")}".`,
    });

    return Response.json({ progress: saved });
  } catch (err) {
    return errorResponse(err);
  }
}
