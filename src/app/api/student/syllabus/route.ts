import { db } from "@/db";
import { enrollments, courses, modules, topics, studentTopicProgress } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { requireStudentSelf, errorResponse } from "@/lib/authz";
import { computeTopicCounts } from "@/lib/calculations";

export async function GET(req: Request) {
  try {
    const session = await requireStudentSelf();
    const { searchParams } = new URL(req.url);
    const courseIdParam = searchParams.get("courseId");

    const enrolledCourses = await db
      .select({ courseId: courses.id, courseName: courses.name, category: courses.category })
      .from(enrollments)
      .innerJoin(courses, eq(enrollments.courseId, courses.id))
      .where(eq(enrollments.studentId, session.studentId));

    if (enrolledCourses.length === 0) {
      return Response.json({ courses: [], selectedCourseId: null, modules: [], summary: computeTopicCounts([]) });
    }

    const selectedCourseId = courseIdParam ? Number(courseIdParam) : enrolledCourses[0].courseId;
    const isEnrolled = enrolledCourses.some((c) => c.courseId === selectedCourseId);
    if (!isEnrolled) {
      return Response.json({ error: "You are not enrolled in this course." }, { status: 403 });
    }

    const moduleRows = await db
      .select()
      .from(modules)
      .where(eq(modules.courseId, selectedCourseId))
      .orderBy(modules.orderIndex);
    const moduleIds = moduleRows.map((m) => m.id);
    const topicRows = moduleIds.length
      ? await db
          .select()
          .from(topics)
          .where(and(inArray(topics.moduleId, moduleIds), eq(topics.isDeleted, false)))
          .orderBy(topics.orderIndex)
      : [];
    const progressRows = topicRows.length
      ? await db
          .select()
          .from(studentTopicProgress)
          .where(
            and(
              eq(studentTopicProgress.studentId, session.studentId),
              inArray(
                studentTopicProgress.topicId,
                topicRows.map((t) => t.id)
              )
            )
          )
      : [];
    const progressByTopic = new Map(progressRows.map((p) => [p.topicId, p]));

    const moduleList = moduleRows.map((m) => ({
      id: m.id,
      title: m.title,
      topics: topicRows
        .filter((t) => t.moduleId === m.id)
        .map((t) => {
          const p = progressByTopic.get(t.id);
          return {
            id: t.id,
            title: t.title,
            status: p?.status || "pending",
            completedAt: p?.completedAt || null,
            remarks: p?.remarks || null,
          };
        }),
    }));

    const allStatuses = topicRows.map((t) => progressByTopic.get(t.id)?.status || "pending");

    return Response.json({
      courses: enrolledCourses,
      selectedCourseId,
      modules: moduleList,
      summary: computeTopicCounts(allStatuses),
    });
  } catch (err) {
    return errorResponse(err);
  }
}
