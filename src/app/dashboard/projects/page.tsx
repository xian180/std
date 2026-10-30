"use client";

import { useEffect, useState } from "react";
import { Download, Eye, FileText, FolderGit2 } from "lucide-react";
import { Badge, Card, EmptyState, SectionHeading, Skeleton } from "@/components/ui";

type Attachment = { id: number; fileName: string; fileType: string; fileSize: number };
type Feedback = { id: number; message: string; createdAt: string };
type ProjectItem = {
  id: number;
  title: string;
  description: string | null;
  category: string | null;
  status: string;
  isPublished: boolean;
  allowDownload: boolean;
  createdAt: string;
  courseName: string | null;
  attachments: Attachment[];
  feedback: Feedback[];
};

const STATUS_COLOR: Record<string, "green" | "amber" | "red"> = { approved: "green", pending: "amber", rejected: "red" };

function formatSize(bytes: number) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function MyProjectsPage() {
  const [projects, setProjects] = useState<ProjectItem[] | null>(null);

  useEffect(() => {
    fetch("/api/student/projects")
      .then((r) => r.json())
      .then((d) => setProjects(d.projects || []));
  }, []);

  if (!projects) return <Skeleton className="h-96" />;

  return (
    <div className="space-y-6">
      <SectionHeading title="My Projects" description="Your personal project portfolio. The institute controls public publication." />

      {projects.length === 0 ? (
        <EmptyState icon={<FolderGit2 />} title="No projects submitted yet" description="Projects uploaded by your teacher or the institute on your behalf will appear here." />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => {
            const thumb = p.attachments[0];
            return (
              <Card key={p.id} className="flex flex-col gap-3">
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-black/30">
                  {thumb ? (
                    thumb.fileType === "pdf" ? (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-400">
                        <FileText size={32} /> <span className="text-xs">PDF Document</span>
                      </div>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/api/files/${thumb.id}`} alt={p.title} className="h-full w-full object-cover" />
                    )
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-500">No preview</div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge color={STATUS_COLOR[p.status] || "gray"}>{p.status}</Badge>
                  {p.isPublished ? <Badge color="blue">Published on homepage</Badge> : <Badge color="gray">Private</Badge>}
                  {p.category && <Badge color="purple">{p.category}</Badge>}
                </div>
                <h3 className="font-semibold text-white">{p.title}</h3>
                <p className="line-clamp-2 text-sm text-slate-400">{p.description}</p>
                <p className="text-xs text-slate-500">
                  {p.courseName ? `${p.courseName} · ` : ""}Submitted {new Date(p.createdAt).toLocaleDateString()}
                </p>
                {p.attachments.length > 0 && (
                  <div className="space-y-1.5 border-t border-white/5 pt-2">
                    {p.attachments.map((a) => (
                      <div key={a.id} className="flex items-center justify-between text-xs text-slate-400">
                        <span className="truncate">
                          {a.fileName} ({a.fileType.toUpperCase()}, {formatSize(a.fileSize)})
                        </span>
                        <span className="flex shrink-0 gap-2">
                          <a href={`/api/files/${a.id}`} target="_blank" rel="noreferrer" className="text-electric-300 hover:underline">
                            <Eye size={14} />
                          </a>
                          {p.allowDownload && (
                            <a href={`/api/files/${a.id}?download=1`} className="text-electric-300 hover:underline">
                              <Download size={14} />
                            </a>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {p.feedback.length > 0 && (
                  <div className="rounded-xl bg-electric-500/10 p-3 text-xs text-electric-200">
                    <p className="mb-1 font-semibold">Teacher Feedback</p>
                    {p.feedback.map((f) => (
                      <p key={f.id} className="mt-1">
                        {f.message}
                      </p>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
