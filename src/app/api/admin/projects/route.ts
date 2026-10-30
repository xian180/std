import { db } from "@/db";
import { projects, projectAttachments, students, courses, teacherAssignments } from "@/db/schema";
import { and, desc, eq, inArray } from "drizzle-orm";
import { requireRole, requireCourseAccess, errorResponse } from "@/lib/authz";
import { saveUploadedFile } from "@/lib/files";
import { logAudit } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    const session = await requireRole(["admin", "teacher"]);
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const published = searchParams.get("published");

    const conditions = [eq(projects.isArchived, false)];
    if (studentId) conditions.push(eq(projects.studentId, Number(studentId)));
    if (published === "1") conditions.push(eq(projects.isPublished, true));
    if (published === "0") conditions.push(eq(projects.isPublished, false));

    let rows = await db
      .select({
        id: projects.id,
        title: projects.title,
        description: projects.description,
        category: projects.category,
        status: projects.status,
        isPublished: projects.isPublished,
        publishAnonymously: projects.publishAnonymously,
        allowDownload: projects.allowDownload,
        createdAt: projects.createdAt,
        studentId: projects.studentId,
        courseId: projects.courseId,
        studentName: students.fullName,
        studentCode: students.studentId,
        courseName: courses.name,
      })
      .from(projects)
      .innerJoin(students, eq(projects.studentId, students.id))
      .leftJoin(courses, eq(projects.courseId, courses.id))
      .where(and(...conditions))
      .orderBy(desc(projects.createdAt));

    if (session.role === "teacher") {
      const assigned = await db.select().from(teacherAssignments).where(eq(teacherAssignments.teacherUserId, session.userId));
      const ids = new Set(assigned.map((a) => a.courseId));
      rows = rows.filter((r) => r.courseId && ids.has(r.courseId));
    }

    const projectIds = rows.map((r) => r.id);
    const attachments = projectIds.length ? await db.select().from(projectAttachments).where(inArray(projectAttachments.projectId, projectIds)) : [];

    return Response.json({
      projects: rows.map((r) => ({ ...r, attachments: attachments.filter((a) => a.projectId === r.id) })),
    });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireRole(["admin", "teacher"]);
    const form = await req.formData();
    const studentId = Number(form.get("studentId"));
    const courseIdRaw = form.get("courseId");
    const courseId = courseIdRaw ? Number(courseIdRaw) : null;
    const title = String(form.get("title") || "").trim();
    const description = form.get("description") ? String(form.get("description")) : null;
    const category = form.get("category") ? String(form.get("category")) : null;
    const allowDownload = form.get("allowDownload") === "true";
    const publishAnonymously = form.get("publishAnonymously") === "true";
    const isPublished = session.role === "admin" ? form.get("isPublished") === "true" : false;

    if (!studentId || !title) {
      return Response.json({ error: "Student and project title are required." }, { status: 400 });
    }
    const [student] = await db.select().from(students).where(eq(students.id, studentId)).limit(1);
    if (!student) return Response.json({ error: "Student not found." }, { status: 404 });

    if (courseId) await requireCourseAccess(courseId);

    const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
    if (files.length === 0) {
      return Response.json({ error: "At least one file (JPG, JPEG, PNG, or PDF) is required." }, { status: 400 });
    }

    const [project] = await db
      .insert(projects)
      .values({
        studentId,
        courseId,
        title,
        description,
        category,
        status: isPublished ? "approved" : "pending",
        isPublished,
        publishAnonymously,
        allowDownload,
      })
      .returning();

    const savedAttachments = [];
    for (const file of files) {
      try {
        const saved = await saveUploadedFile(file);
        const [attachment] = await db
          .insert(projectAttachments)
          .values({ projectId: project.id, fileName: saved.fileName, storedPath: saved.storedPath, fileType: saved.fileType, fileSize: saved.fileSize })
          .returning();
        savedAttachments.push(attachment);
      } catch (e) {
        await db.delete(projects).where(eq(projects.id, project.id));
        return Response.json({ error: e instanceof Error ? e.message : "Upload failed." }, { status: 400 });
      }
    }

    await logAudit(session.userId, "project_created", "project", project.id, { studentId, title });
    return Response.json({ project: { ...project, attachments: savedAttachments } }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
