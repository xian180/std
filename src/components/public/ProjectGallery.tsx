"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { FileImage, FileText, Search, UserRound, X, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge, Button, EmptyState, Input, Select, Skeleton } from "@/components/ui";

type Attachment = { id: number; fileType: string; fileName: string };
type ProjectItem = {
  id: number;
  title: string;
  description: string | null;
  category: string | null;
  studentName: string;
  courseName: string | null;
  allowDownload: boolean;
  attachments: Attachment[];
};

export function ProjectGallery() {
  const [items, setItems] = useState<ProjectItem[] | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [qInput, setQInput] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<{ project: ProjectItem; attachment: Attachment } | null>(null);

  const pageSize = 12;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (category) params.set("category", category);
      params.set("page", String(page));
      const res = await fetch(`/api/public/projects?${params.toString()}`);
      const data = await res.json();
      setItems(data.results || []);
      setTotal(data.total || 0);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [q, category, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetch("/api/public/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories || []))
      .catch(() => {});
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section id="projects" className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">Student Project Showcase</h2>
          <p className="mt-1 text-sm text-slate-400">Explore approved projects published by our students.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <Input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setPage(1);
                  setQ(qInput);
                }
              }}
              placeholder="Search projects..."
              className="min-w-[220px] pl-9"
            />
          </div>
          <Select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {loading && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-72 w-full" />
          ))}
        </div>
      )}

      {!loading && items && items.length === 0 && (
        <EmptyState
          icon="🗂️"
          title="No projects available yet"
          description="Approved student projects will appear here once published by the institute."
        />
      )}

      {!loading && items && items.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((p, idx) => {
              const thumb = p.attachments[0];
              return (
                <article
                  key={p.id}
                  className="hover-lift animate-fade-in-up card-surface group flex flex-col overflow-hidden rounded-2xl"
                  style={{ animationDelay: `${(idx % 8) * 40}ms` }}
                >
                  <button
                    onClick={() => thumb && setLightbox({ project: p, attachment: thumb })}
                    className="relative block aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-navy-700 to-navy-900"
                  >
                    {thumb ? (
                      thumb.fileType === "pdf" ? (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-400">
                          <FileText size={40} />
                          <span className="text-xs">PDF Document</span>
                        </div>
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`/api/files/${thumb.id}`}
                          alt={p.title}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        />
                      )
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-500">
                        <FileImage size={36} />
                      </div>
                    )}
                    <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur">
                      {thumb ? thumb.fileType : "N/A"}
                    </span>
                  </button>
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {p.category && <Badge color="blue">{p.category}</Badge>}
                      {p.courseName && <Badge color="purple">{p.courseName}</Badge>}
                    </div>
                    <h3 className="line-clamp-1 text-base font-semibold text-white">{p.title}</h3>
                    <p className="line-clamp-2 flex-1 text-sm text-slate-400">{p.description}</p>
                    <div className="mt-2 flex items-center justify-between border-t border-white/5 pt-3">
                      <span className="flex items-center gap-1.5 text-xs text-slate-400">
                        <UserRound size={14} /> {p.studentName}
                      </span>
                      <Link href={`/project/${p.id}`} className="text-xs font-medium text-electric-300 hover:text-electric-400">
                        View Project →
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-3">
              <Button variant="ghost" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                <ChevronLeft size={16} /> Prev
              </Button>
              <span className="text-sm text-slate-400">
                Page {page} of {totalPages}
              </span>
              <Button variant="ghost" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                Next <ChevronRight size={16} />
              </Button>
            </div>
          )}
        </>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl bg-[#0d1730] p-4" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setLightbox(null)}
              className="absolute right-3 top-3 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
              aria-label="Close preview"
            >
              <X size={18} />
            </button>
            {lightbox.attachment.fileType === "pdf" ? (
              <iframe src={`/api/files/${lightbox.attachment.id}`} className="h-[75vh] w-full rounded-xl" title={lightbox.project.title} />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/files/${lightbox.attachment.id}`} alt={lightbox.project.title} className="max-h-[75vh] w-full rounded-xl object-contain" />
            )}
            <div className="mt-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-white">{lightbox.project.title}</h3>
                <p className="text-sm text-slate-400">{lightbox.project.studentName}</p>
              </div>
              {lightbox.project.allowDownload && (
                <a href={`/api/files/${lightbox.attachment.id}?download=1`} className="shrink-0">
                  <Button variant="outline">
                    <Download size={16} /> Download
                  </Button>
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
