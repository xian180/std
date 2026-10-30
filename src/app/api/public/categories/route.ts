import { db } from "@/db";
import { projects } from "@/db/schema";
import { and, eq, isNotNull } from "drizzle-orm";

export async function GET() {
  const rows = await db
    .selectDistinct({ category: projects.category })
    .from(projects)
    .where(and(eq(projects.isPublished, true), eq(projects.isArchived, false), isNotNull(projects.category)));
  return Response.json({ categories: rows.map((r) => r.category).filter(Boolean) });
}
