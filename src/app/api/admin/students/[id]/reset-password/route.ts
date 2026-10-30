import { db } from "@/db";
import { students, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole, errorResponse } from "@/lib/authz";
import { hashPassword, generateTempPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(["admin"]);
    const id = Number((await params).id);
    const [student] = await db.select().from(students).where(eq(students.id, id)).limit(1);
    if (!student) return Response.json({ error: "Student not found" }, { status: 404 });

    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);

    if (student.userId) {
      await db.update(users).set({ passwordHash, mustChangePassword: true, isActive: true }).where(eq(users.id, student.userId));
    } else {
      const loginEmail = student.email || `${student.studentId.toLowerCase()}@students.brightcode.local`;
      const [user] = await db
        .insert(users)
        .values({ email: loginEmail, passwordHash, role: "student", name: student.fullName, mustChangePassword: true })
        .returning();
      await db.update(students).set({ userId: user.id }).where(eq(students.id, id));
    }

    await logAudit(session.userId, "student_password_reset", "student", id);
    return Response.json({ tempPassword });
  } catch (err) {
    return errorResponse(err);
  }
}
