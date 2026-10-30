import { db } from "@/db";
import { courses, teacherAssignments } from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { requireRole, errorResponse } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export async function GET() {
  try {
    const session = await requireRole(["admin", "teacher"]);
    let rows = await db.select().from(courses).orderBy(desc(courses.createdAt));
    if (session.role === "teacher") {
      const assigned = await db.select().from(teacherAssignments).where(eq(teacherAssignments.teacherUserId, session.userId));
      const ids = assigned.map((a) => a.courseId);
      rows = ids.length ? rows.filter((c) => ids.includes(c.id)) : [];
    }
    return Response.json({ courses: rows });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireRole(["admin"]);
    const body = await req.json();
    const name = String(body.name || "").trim();
    const code = String(body.code || "").trim();
    const description = body.description ? String(body.description) : null;
    const category = body.category ? String(body.category) : null;
    if (!name || !code) return Response.json({ error: "Course name and code are required." }, { status: 400 });

    const existing = await db.select().from(courses).where(eq(courses.code, code)).limit(1);
    if (existing.length > 0) return Response.json({ error: "A course with this code already exists." }, { status: 409 });

    const [course] = await db.insert(courses).values({ name, code, description, category }).returning();
    await logAudit(session.userId, "course_created", "course", course.id, { name, code });
    return Response.json({ course }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
