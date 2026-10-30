import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, desc, ne } from "drizzle-orm";
import { requireRole, errorResponse } from "@/lib/authz";
import { hashPassword, generateTempPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET() {
  try {
    await requireRole(["admin"]);
    const rows = await db.select().from(users).where(ne(users.role, "student")).orderBy(desc(users.createdAt));
    return Response.json({ users: rows.map((u) => ({ id: u.id, email: u.email, name: u.name, role: u.role, isActive: u.isActive, createdAt: u.createdAt })) });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireRole(["admin"]);
    const body = await req.json();
    const email = String(body.email || "").trim();
    const name = String(body.name || "").trim();
    const role = String(body.role || "teacher");
    if (!email || !name || !["admin", "teacher"].includes(role)) {
      return Response.json({ error: "Valid name, email, and role (admin/teacher) are required." }, { status: 400 });
    }
    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) return Response.json({ error: "A user with this email already exists." }, { status: 409 });

    const tempPassword = generateTempPassword();
    const [user] = await db
      .insert(users)
      .values({ email, name, role: role as "admin" | "teacher", passwordHash: await hashPassword(tempPassword), mustChangePassword: true })
      .returning();

    await logAudit(session.userId, "user_created", "user", user.id, { email, role });
    return Response.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role }, tempPassword }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
