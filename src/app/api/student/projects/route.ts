import { db } from "@/db";
import { projects, projectAttachments, courses, teacherFeedback } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { requireStudentSelf, errorResponse } from "@/lib/authz";

export async function GET() {
  try {
    const session = await requireStudentSelf();
    const rows = await db
      .select({
        id: projects.id,
        title: projects.title,
        description: projects.description,
        category: projects.category,
        status: projects.status,
        isPublished: projects.isPublished,
        allowDownload: projects.allowDownload,
        createdAt: projects.createdAt,
        courseName: courses.name,
      })
      .from(projects)
      .leftJoin(courses, eq(projects.courseId, courses.id))
      .where(and(eq(projects.studentId, session.studentId), eq(projects.isArchived, false)))
      .orderBy(projects.createdAt);

    const projectIds = rows.map((r) => r.id);
    const attachments = projectIds.length
      ? await db.select().from(projectAttachments).where(inArray(projectAttachments.projectId, projectIds))
      : [];
    const feedback = projectIds.length
      ? await db.select().from(teacherFeedback).where(inArray(teacherFeedback.projectId, projectIds))
      : [];

    const results = rows.map((r) => ({
      ...r,
      attachments: attachments.filter((a) => a.projectId === r.id),
      feedback: feedback.filter((f) => f.projectId === r.id),
    }));

    return Response.json({ projects: results.reverse() });
  } catch (err) {
    return errorResponse(err);
  }
}
