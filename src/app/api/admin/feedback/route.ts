import { db } from "@/db";
import { teacherFeedback, projects, notifications } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole, errorResponse } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const session = await requireRole(["admin", "teacher"]);
    const body = await req.json();
    const projectId = Number(body.projectId);
    const message = String(body.message || "").trim();
    if (!projectId || !message) return Response.json({ error: "Project and message are required." }, { status: 400 });

    const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

    const [feedback] = await db
      .insert(teacherFeedback)
      .values({ studentId: project.studentId, projectId, courseId: project.courseId, message, createdBy: session.userId })
      .returning();

    await db.insert(notifications).values({
      studentId: project.studentId,
      type: "project_feedback",
      message: `You received feedback on "${project.title}".`,
    });

    await logAudit(session.userId, "feedback_added", "project", projectId, { message });
    return Response.json({ feedback }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
