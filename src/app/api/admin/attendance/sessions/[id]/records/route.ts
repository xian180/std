import { db } from "@/db";
import { classSessions, attendanceRecords, enrollments, students } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireCourseAccess, errorResponse } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sessionId = Number((await params).id);
    const [classSession] = await db.select().from(classSessions).where(eq(classSessions.id, sessionId)).limit(1);
    if (!classSession) return Response.json({ error: "Session not found" }, { status: 404 });
    await requireCourseAccess(classSession.courseId);

    const enrolledStudents = await db
      .select({ id: students.id, studentId: students.studentId, fullName: students.fullName })
      .from(enrollments)
      .innerJoin(students, eq(enrollments.studentId, students.id))
      .where(eq(enrollments.courseId, classSession.courseId));

    const records = await db.select().from(attendanceRecords).where(eq(attendanceRecords.sessionId, sessionId));
    const recordByStudent = new Map(records.map((r) => [r.studentId, r]));

    const combined = enrolledStudents.map((s) => {
      const r = recordByStudent.get(s.id);
      return { studentId: s.id, studentCode: s.studentId, fullName: s.fullName, status: r?.status || null, remarks: r?.remarks || "" };
    });

    return Response.json({ session: classSession, records: combined });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sessionId = Number((await params).id);
    const [classSession] = await db.select().from(classSessions).where(eq(classSessions.id, sessionId)).limit(1);
    if (!classSession) return Response.json({ error: "Session not found" }, { status: 404 });
    const session = await requireCourseAccess(classSession.courseId);

    const body = await req.json();
    const items: { studentId: number; status: string; remarks?: string }[] = Array.isArray(body.records) ? body.records : [body];

    const saved = [];
    for (const item of items) {
      const studentId = Number(item.studentId);
      const status = String(item.status);
      if (!["present", "absent", "leave"].includes(status)) continue;
      const remarks = item.remarks ? String(item.remarks) : null;

      const existing = await db
        .select()
        .from(attendanceRecords)
        .where(and(eq(attendanceRecords.sessionId, sessionId), eq(attendanceRecords.studentId, studentId)))
        .limit(1);

      let row;
      if (existing.length > 0) {
        [row] = await db
          .update(attendanceRecords)
          .set({ status: status as "present" | "absent" | "leave", remarks, markedBy: session.userId, updatedAt: new Date() })
          .where(eq(attendanceRecords.id, existing[0].id))
          .returning();
      } else {
        [row] = await db
          .insert(attendanceRecords)
          .values({ sessionId, studentId, status: status as "present" | "absent" | "leave", remarks, markedBy: session.userId })
          .returning();
      }
      saved.push(row);
    }

    await logAudit(session.userId, "attendance_recorded", "class_session", sessionId, { count: saved.length });
    return Response.json({ records: saved });
  } catch (err) {
    return errorResponse(err);
  }
}
