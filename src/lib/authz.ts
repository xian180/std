import "server-only";
import { getSession, type Role, type SessionPayload } from "./auth";
import { db } from "@/db";
import { teacherAssignments } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new AuthError("Authentication required", 401);
  return session;
}

export async function requireRole(roles: Role[]): Promise<SessionPayload> {
  const session = await requireSession();
  if (!roles.includes(session.role)) throw new AuthError("Not authorized", 403);
  return session;
}

export async function requireStudentSelf(): Promise<SessionPayload & { studentId: number }> {
  const session = await requireRole(["student"]);
  if (!session.studentId) throw new AuthError("Student profile missing", 403);
  return session as SessionPayload & { studentId: number };
}

/** Admins may act on any course. Teachers must be assigned to the course. */
export async function requireCourseAccess(courseId: number): Promise<SessionPayload> {
  const session = await requireRole(["admin", "teacher"]);
  if (session.role === "admin") return session;
  const [assignment] = await db
    .select()
    .from(teacherAssignments)
    .where(
      and(eq(teacherAssignments.teacherUserId, session.userId), eq(teacherAssignments.courseId, courseId))
    )
    .limit(1);
  if (!assignment) throw new AuthError("You are not assigned to this course", 403);
  return session;
}

export async function isTeacherAssignedToAny(userId: number, courseIds: number[]) {
  if (courseIds.length === 0) return [];
  const rows = await db
    .select({ courseId: teacherAssignments.courseId })
    .from(teacherAssignments)
    .where(eq(teacherAssignments.teacherUserId, userId));
  const allowed = new Set(rows.map((r) => r.courseId));
  return courseIds.filter((c) => allowed.has(c));
}

export function errorResponse(err: unknown) {
  if (err instanceof AuthError) {
    return Response.json({ error: err.message }, { status: err.status });
  }
  console.error(err);
  return Response.json({ error: "Something went wrong" }, { status: 500 });
}
