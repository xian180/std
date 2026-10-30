import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole, errorResponse } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(["admin", "teacher"]);
    const id = Number((await params).id);
    const body = await req.json();
    const updates: Record<string, unknown> = {};

    for (const key of ["title", "description", "category"]) {
      if (key in body) updates[key] = body[key];
    }
    if ("allowDownload" in body) updates.allowDownload = !!body.allowDownload;
    if ("publishAnonymously" in body) updates.publishAnonymously = !!body.publishAnonymously;

    // Only admins may control public publication and approval status.
    if (session.role === "admin") {
      if ("isPublished" in body) updates.isPublished = !!body.isPublished;
      if ("status" in body && ["pending", "approved", "rejected"].includes(body.status)) updates.status = body.status;
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: "No valid fields to update." }, { status: 400 });
    }
    updates.updatedAt = new Date();

    const [updated] = await db.update(projects).set(updates).where(eq(projects.id, id)).returning();
    if (!updated) return Response.json({ error: "Project not found" }, { status: 404 });
    await logAudit(session.userId, "project_updated", "project", id, updates);
    return Response.json({ project: updated });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(["admin"]);
    const id = Number((await params).id);
    const [updated] = await db.update(projects).set({ isArchived: true, isPublished: false }).where(eq(projects.id, id)).returning();
    if (!updated) return Response.json({ error: "Project not found" }, { status: 404 });
    await logAudit(session.userId, "project_archived", "project", id);
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
