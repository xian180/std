import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { students } from "@/db/schema";
import { eq } from "drizzle-orm";
import { StudentShell } from "@/components/dashboard/StudentShell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "student" || !session.studentId) {
    redirect("/login");
  }
  const [student] = await db.select().from(students).where(eq(students.id, session.studentId)).limit(1);
  if (!student) redirect("/login");

  return <StudentShell studentName={student.displayName || student.fullName}>{children}</StudentShell>;
}
