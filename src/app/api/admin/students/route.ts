import { db } from "@/db";
import { students, users, enrollments, courses } from "@/db/schema";
import { and, eq, ilike, or, sql, desc } from "drizzle-orm";
import { requireRole, errorResponse } from "@/lib/authz";
import { hashPassword, generateTempPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    const session = await requireRole(["admin", "teacher"]);
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const status = searchParams.get("status") || "";
    const page = Math.max(1, Number(searchParams.get("page") || "1"));
    const pageSize = 15;
    const includeArchived = searchParams.get("includeArchived") === "1";

    const conditions = [];
    if (!includeArchived) conditions.push(eq(students.isArchived, false));
    if (status) conditions.push(eq(students.status, status as any));
    if (q) conditions.push(or(ilike(students.studentId, `%${q}%`), ilike(students.fullName, `%${q}%`))!);

    const where = conditions.length ? and(...conditions) : undefined;

    const rows = await db
      .select()
      .from(students)
      .where(where)
      .orderBy(desc(students.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(students).where(where);

    const studentIds = rows.map((s) => s.id);
    const enrolledRows = studentIds.length
      ? await db
          .select({ studentId: enrollments.studentId, courseName: courses.name })
          .from(enrollments)
          .innerJoin(courses, eq(enrollments.courseId, courses.id))
          .where(sql`${enrollments.studentId} in ${studentIds}`)
      : [];

    const results = rows.map((s) => ({
      ...s,
      hasAccount: !!s.userId,
      courses: enrolledRows.filter((e) => e.studentId === s.id).map((e) => e.courseName),
    }));

    void session;
    return Response.json({ results, total: count, page, pageSize });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireRole(["admin"]);
    const body = await req.json();
    const studentId = String(body.studentId || "").trim();
    const fullName = String(body.fullName || "").trim();
    const displayName = body.displayName ? String(body.displayName).trim() : null;
    const email = body.email ? String(body.email).trim() : null;
    const phone = body.phone ? String(body.phone).trim() : null;
    const bio = body.bio ? String(body.bio).trim() : null;
    const createAccount = body.createAccount !== false;

    if (!studentId || !fullName) {
      return Response.json({ error: "Student ID and full name are required." }, { status: 400 });
    }

    const existing = await db.select().from(students).where(eq(students.studentId, studentId)).limit(1);
    if (existing.length > 0) {
      return Response.json({ error: "This Student ID is already in use." }, { status: 409 });
    }

    let userId: number | null = null;
    let tempPassword: string | null = null;
    if (createAccount) {
      const loginEmail = email || `${studentId.toLowerCase()}@students.brightcode.local`;
      const existingUser = await db.select().from(users).where(eq(users.email, loginEmail)).limit(1);
      if (existingUser.length > 0) {
        return Response.json({ error: "A user account with this email already exists." }, { status: 409 });
      }
      tempPassword = generateTempPassword();
      const [user] = await db
        .insert(users)
        .values({
          email: loginEmail,
          passwordHash: await hashPassword(tempPassword),
          role: "student",
          name: fullName,
          mustChangePassword: true,
        })
        .returning();
      userId = user.id;
    }

    const [student] = await db
      .insert(students)
      .values({ studentId, fullName, displayName, email, phone, bio, userId })
      .returning();

    await logAudit(session.userId, "student_created", "student", student.id, { studentId });

    return Response.json({ student, tempPassword }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
