import { db } from "@/db";
import { students, users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { verifyPassword, setSessionCookie } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const studentId = String(body.studentId || "").trim();
    const password = String(body.password || "");

    if (!studentId || !password) {
      return Response.json({ error: "Student ID and password are required." }, { status: 400 });
    }

    const [student] = await db
      .select()
      .from(students)
      .where(sql`lower(${students.studentId}) = lower(${studentId})`)
      .limit(1);

    if (!student || student.isArchived || !student.userId) {
      return Response.json(
        { error: "We couldn't sign you in. Check your Student ID and password, or contact the administrator." },
        { status: 401 }
      );
    }

    const [user] = await db.select().from(users).where(eq(users.id, student.userId)).limit(1);
    if (!user || !user.isActive || user.role !== "student") {
      return Response.json(
        { error: "We couldn't sign you in. Check your Student ID and password, or contact the administrator." },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return Response.json(
        { error: "We couldn't sign you in. Check your Student ID and password, or contact the administrator." },
        { status: 401 }
      );
    }

    await setSessionCookie({
      userId: user.id,
      role: "student",
      name: user.name,
      email: user.email,
      studentId: student.id,
    });

    await logAudit(user.id, "student_login", "student", student.id);

    return Response.json({
      ok: true,
      mustChangePassword: user.mustChangePassword,
    });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
