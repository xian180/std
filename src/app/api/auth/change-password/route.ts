import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/authz";
import { errorResponse } from "@/lib/authz";
import { hashPassword, verifyPassword, setSessionCookie } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const currentPassword = String(body.currentPassword || "");
    const newPassword = String(body.newPassword || "");

    if (newPassword.length < 8) {
      return Response.json({ error: "New password must be at least 8 characters." }, { status: 400 });
    }

    const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
    if (!user) return Response.json({ error: "User not found." }, { status: 404 });

    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) return Response.json({ error: "Current password is incorrect." }, { status: 401 });

    const passwordHash = await hashPassword(newPassword);
    await db.update(users).set({ passwordHash, mustChangePassword: false }).where(eq(users.id, user.id));

    await setSessionCookie({ ...session, role: session.role });
    await logAudit(user.id, "password_changed", "user", user.id);

    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
