import { db } from "@/db";
import { users, teacherAssignments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole, errorResponse } from "@/lib/authz";
import { hashPassword, generateTempPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(["admin"]);
    const id = Number((await params).id);
    const body = await req.json();
    const updates: Record<string, unknown> = {};
    if ("isActive" in body) updates.isActive = !!body.isActive;
    if ("name" in body) updates.name = String(body.name);
    if (body.resetPassword) {
      const tempPassword = generateTempPassword();
      updates.passwordHash = await hashPassword(tempPassword);
      updates.mustChangePassword = true;
      const [updated] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
      await logAudit(session.userId, "user_password_reset", "user", id);
      return Response.json({ user: updated, tempPassword });
    }
    if (Object.keys(updates).length === 0) return Response.json({ error: "No valid fields to update." }, { status: 400 });
    const [updated] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    if (!updated) return Response.json({ error: "User not found" }, { status: 404 });
    await logAudit(session.userId, "user_updated", "user", id, updates);
    return Response.json({ user: updated });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(["admin"]);
    const id = Number((await params).id);
    if (id === session.userId) return Response.json({ error: "You cannot deactivate your own account." }, { status: 400 });
    await db.update(users).set({ isActive: false }).where(eq(users.id, id));
    await db.delete(teacherAssignments).where(eq(teacherAssignments.teacherUserId, id));
    await logAudit(session.userId, "user_deactivated", "user", id);
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
