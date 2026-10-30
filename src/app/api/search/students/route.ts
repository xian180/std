import { db } from "@/db";
import { students, enrollments, courses } from "@/db/schema";
import { and, eq, ilike, or, sql } from "drizzle-orm";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();

  if (q.length < 2) {
    return Response.json({ results: [] });
  }

  const rows = await db
    .select({
      id: students.id,
      studentId: students.studentId,
      fullName: students.fullName,
      displayName: students.displayName,
      photoUrl: students.photoUrl,
    })
    .from(students)
    .where(
      and(
        eq(students.isArchived, false),
        or(ilike(students.studentId, `%${q}%`), ilike(students.fullName, `%${q}%`))
      )
    )
    .limit(8);

  const results = await Promise.all(
    rows.map(async (s) => {
      const enrolled = await db
        .select({ name: courses.name })
        .from(enrollments)
        .innerJoin(courses, eq(enrollments.courseId, courses.id))
        .where(and(eq(enrollments.studentId, s.id), eq(enrollments.status, "active")));
      return {
        studentId: s.studentId,
        name: s.fullName,
        photoUrl: s.photoUrl,
        courses: enrolled.map((c) => c.name),
      };
    })
  );

  return Response.json({ results });
}
