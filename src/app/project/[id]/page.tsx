import { db } from "@/db";
import { projects, students, courses, projectAttachments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/public/Navbar";
import { Badge, Button } from "@/components/ui";
import Link from "next/link";
import { Download, FileText } from "lucide-react";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const projectId = Number(id);
  if (!Number.isFinite(projectId)) notFound();

  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project || project.isArchived) notFound();

  const isPublic = project.isPublished;
  if (!isPublic) {
    const session = await getSession();
    const isOwner = session?.role === "student" && session.studentId === project.studentId;
    const isStaff = session?.role === "admin" || session?.role === "teacher";
    if (!isOwner && !isStaff) notFound();
  }

  const [student] = await db.select().from(students).where(eq(students.id, project.studentId)).limit(1);
  const course = project.courseId ? (await db.select().from(courses).where(eq(courses.id, project.courseId)).limit(1))[0] : null;
  const attachments = await db.select().from(projectAttachments).where(eq(projectAttachments.projectId, project.id));

  const studentName = project.publishAnonymously ? "Anonymous Student" : student?.displayName || student?.fullName || "Student";

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="mx-auto max-w-4xl px-5 py-12 sm:px-8">
        <Link href="/#projects" className="text-sm text-electric-300 hover:underline">
          ← Back to showcase
        </Link>

        <div className="card-surface mt-5 rounded-2xl p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            {project.category && <Badge color="blue">{project.category}</Badge>}
            {course && <Badge color="purple">{course.name}</Badge>}
            {!project.isPublished && <Badge color="amber">Private Preview</Badge>}
          </div>
          <h1 className="mt-3 text-2xl font-bold text-white sm:text-3xl">{project.title}</h1>
          <p className="mt-1 text-sm text-slate-400">
            By {studentName} · Submitted {new Date(project.createdAt).toLocaleDateString()}
          </p>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{project.description}</p>

          <div className="mt-8 space-y-6">
            {attachments.map((a) => (
              <div key={a.id} className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
                {a.fileType === "pdf" ? (
                  <iframe src={`/api/files/${a.id}`} className="h-[70vh] w-full" title={a.fileName} />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/files/${a.id}`} alt={a.fileName} className="w-full object-contain" />
                )}
                <div className="flex items-center justify-between gap-3 p-3">
                  <span className="flex items-center gap-2 text-xs text-slate-400">
                    <FileText size={14} /> {a.fileName} · {a.fileType.toUpperCase()}
                  </span>
                  {project.allowDownload && (
                    <a href={`/api/files/${a.id}?download=1`}>
                      <Button variant="outline">
                        <Download size={14} /> Download
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            ))}
            {attachments.length === 0 && (
              <p className="text-sm text-slate-500">No files attached to this project.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
