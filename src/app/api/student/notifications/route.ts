import { db } from "@/db";
import { notifications } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireStudentSelf, errorResponse } from "@/lib/authz";

export async function GET() {
  try {
    const session = await requireStudentSelf();
    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.studentId, session.studentId))
      .orderBy(notifications.createdAt);
    return Response.json({ notifications: rows.reverse() });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await requireStudentSelf();
    const body = await req.json();
    const id = Number(body.id);
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, id), eq(notifications.studentId, session.studentId)));
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
