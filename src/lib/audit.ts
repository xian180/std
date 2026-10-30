import "server-only";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";

export async function logAudit(
  actorUserId: number | null,
  action: string,
  entityType?: string,
  entityId?: number,
  details?: Record<string, unknown>
) {
  try {
    await db.insert(auditLogs).values({
      actorUserId: actorUserId ?? null,
      action,
      entityType,
      entityId,
      details: details ? details : null,
    });
  } catch (err) {
    console.error("Failed to write audit log", err);
  }
}
