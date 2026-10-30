import { db } from "@/db";
import { projects, students, courses, projectAttachments } from "@/db/schema";
import { and, eq, ilike, or, desc, sql } from "drizzle-orm";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const category = (searchParams.get("category") || "").trim();
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const pageSize = 12;

  const conditions = [eq(projects.isPublished, true), eq(projects.isArchived, false)];
  if (category) conditions.push(eq(projects.category, category));
  if (q) {
    conditions.push(
      or(ilike(projects.title, `%${q}%`), ilike(projects.description, `%${q}%`))!
    );
  }

  const rows = await db
    .select({
      id: projects.id,
      title: projects.title,
      description: projects.description,
      category: projects.category,
      publishAnonymously: projects.publishAnonymously,
      allowDownload: projects.allowDownload,
      createdAt: projects.createdAt,
      studentDisplayName: students.displayName,
      studentFullName: students.fullName,
      courseName: courses.name,
    })
    .from(projects)
    .leftJoin(students, eq(projects.studentId, students.id))
    .leftJoin(courses, eq(projects.courseId, courses.id))
    .where(and(...conditions))
    .orderBy(desc(projects.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(projects)
    .leftJoin(students, eq(projects.studentId, students.id))
    .where(and(...conditions));

  const projectIds = rows.map((r) => r.id);
  const attachments = projectIds.length
    ? await db.select().from(projectAttachments).where(sql`${projectAttachments.projectId} in ${projectIds}`)
    : [];

  const results = rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    category: r.category,
    createdAt: r.createdAt,
    studentName: r.publishAnonymously ? "Anonymous Student" : r.studentDisplayName || r.studentFullName || "Student",
    courseName: r.courseName,
    allowDownload: r.allowDownload,
    attachments: attachments
      .filter((a) => a.projectId === r.id)
      .map((a) => ({ id: a.id, fileType: a.fileType, fileName: a.fileName })),
  }));

  return Response.json({ results, total: count, page, pageSize });
}
