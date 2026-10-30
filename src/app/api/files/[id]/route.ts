import { db } from "@/db";
import { projectAttachments, projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { readStoredFile, mimeForType } from "@/lib/files";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const attachmentId = Number(id);
  if (!Number.isFinite(attachmentId)) return new Response("Not found", { status: 404 });

  const [attachment] = await db.select().from(projectAttachments).where(eq(projectAttachments.id, attachmentId)).limit(1);
  if (!attachment) return new Response("Not found", { status: 404 });

  const [project] = await db.select().from(projects).where(eq(projects.id, attachment.projectId)).limit(1);
  if (!project) return new Response("Not found", { status: 404 });

  const isPubliclyVisible = project.isPublished && !project.isArchived;

  if (!isPubliclyVisible) {
    const session = await getSession();
    const isOwner = session?.role === "student" && session.studentId === project.studentId;
    const isStaff = session?.role === "admin" || session?.role === "teacher";
    if (!isOwner && !isStaff) {
      return new Response("Forbidden", { status: 403 });
    }
  }

  try {
    const buffer = await readStoredFile(attachment.storedPath);
    const { searchParams } = new URL(req.url);
    const wantsDownload = searchParams.get("download") === "1";
    const headers: Record<string, string> = {
      "Content-Type": mimeForType(attachment.fileType),
      "Cache-Control": isPubliclyVisible ? "public, max-age=300" : "private, no-store",
    };
    if (wantsDownload) {
      headers["Content-Disposition"] = `attachment; filename="${attachment.fileName}"`;
    } else {
      headers["Content-Disposition"] = `inline; filename="${attachment.fileName}"`;
    }
    return new Response(new Uint8Array(buffer), { headers });
  } catch {
    return new Response("File not found", { status: 404 });
  }
}
