import { db } from "@/db";
import {
  students,
  enrollments,
  courses,
  modules,
  topics,
  studentTopicProgress,
  tests,
  testResults,
  classSessions,
  attendanceRecords,
  projects,
  notifications,
} from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { requireStudentSelf, errorResponse } from "@/lib/authz";
import { computeTopicCounts, computeTestSummary, computeAttendanceSummary } from "@/lib/calculations";

export async function GET() {
  try {
    const session = await requireStudentSelf();
    const [student] = await db.select().from(students).where(eq(students.id, session.studentId)).limit(1);
    if (!student) return Response.json({ error: "Student not found" }, { status: 404 });

    const enrolledRows = await db
      .select({
        enrollmentId: enrollments.id,
        status: enrollments.status,
        courseId: courses.id,
        courseName: courses.name,
        courseCode: courses.code,
        category: courses.category,
      })
      .from(enrollments)
      .innerJoin(courses, eq(enrollments.courseId, courses.id))
      .where(eq(enrollments.studentId, student.id));

    const courseIds = enrolledRows.map((e) => e.courseId);

    let allTopicStatuses: ("pending" | "in_progress" | "completed")[] = [];
    const perCourseProgress: Record<number, ReturnType<typeof computeTopicCounts>> = {};

    if (courseIds.length > 0) {
      const moduleRows = await db.select().from(modules).where(inArray(modules.courseId, courseIds));
      const moduleIds = moduleRows.map((m) => m.id);
      const topicRows = moduleIds.length
        ? await db.select().from(topics).where(and(inArray(topics.moduleId, moduleIds), eq(topics.isDeleted, false)))
        : [];
      const progressRows = topicRows.length
        ? await db
            .select()
            .from(studentTopicProgress)
            .where(
              and(
                eq(studentTopicProgress.studentId, student.id),
                inArray(
                  studentTopicProgress.topicId,
                  topicRows.map((t) => t.id)
                )
              )
            )
        : [];
      const progressByTopic = new Map(progressRows.map((p) => [p.topicId, p.status]));

      for (const courseId of courseIds) {
        const courseModuleIds = moduleRows.filter((m) => m.courseId === courseId).map((m) => m.id);
        const courseTopics = topicRows.filter((t) => courseModuleIds.includes(t.moduleId));
        const statuses = courseTopics.map((t) => progressByTopic.get(t.id) || "pending");
        perCourseProgress[courseId] = computeTopicCounts(statuses);
      }
      allTopicStatuses = topicRows.map((t) => progressByTopic.get(t.id) || "pending");
    }

    const overallSyllabus = computeTopicCounts(allTopicStatuses);

    // Tests across all enrolled courses
    const testRows = courseIds.length
      ? await db
          .select({ id: tests.id, maxMarks: tests.maxMarks, courseId: tests.courseId })
          .from(tests)
          .where(inArray(tests.courseId, courseIds))
      : [];
    const testIds = testRows.map((t) => t.id);
    const resultRows = testIds.length
      ? await db
          .select()
          .from(testResults)
          .where(and(eq(testResults.studentId, student.id), inArray(testResults.testId, testIds)))
      : [];
    const testMaxById = new Map(testRows.map((t) => [t.id, Number(t.maxMarks)]));
    const testSummary = computeTestSummary(
      resultRows.map((r) => ({ marksObtained: Number(r.marksObtained), maxMarks: testMaxById.get(r.testId) || 0 }))
    );

    // Attendance across all enrolled courses
    const sessionRows = courseIds.length
      ? await db.select().from(classSessions).where(inArray(classSessions.courseId, courseIds))
      : [];
    const sessionIds = sessionRows.map((s) => s.id);
    const attendanceRows = sessionIds.length
      ? await db
          .select()
          .from(attendanceRecords)
          .where(and(eq(attendanceRecords.studentId, student.id), inArray(attendanceRecords.sessionId, sessionIds)))
      : [];
    const attendanceSummary = computeAttendanceSummary(attendanceRows.map((a) => a.status));

    const projectCount = await db
      .select()
      .from(projects)
      .where(and(eq(projects.studentId, student.id), eq(projects.isArchived, false)));

    const recentNotifications = await db
      .select()
      .from(notifications)
      .where(eq(notifications.studentId, student.id))
      .orderBy(notifications.createdAt)
      .limit(20);

    const unreadCount = recentNotifications.filter((n) => !n.isRead).length;

    return Response.json({
      student: {
        id: student.id,
        studentId: student.studentId,
        fullName: student.fullName,
        displayName: student.displayName,
        email: student.email,
        phone: student.phone,
        photoUrl: student.photoUrl,
        status: student.status,
        bio: student.bio,
      },
      enrollments: enrolledRows.map((e) => ({
        ...e,
        progress: perCourseProgress[e.courseId] || computeTopicCounts([]),
      })),
      stats: {
        totalCourses: enrolledRows.length,
        syllabus: overallSyllabus,
        tests: testSummary,
        attendance: attendanceSummary,
        projectsSubmitted: projectCount.length,
      },
      notifications: recentNotifications.slice(-10).reverse(),
      unreadNotifications: unreadCount,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
