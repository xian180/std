"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, UserRound, X } from "lucide-react";

type Result = { studentId: string; name: string; photoUrl: string | null; courses: string[] };

export function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Result[] | null>(null);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  async function runSearch() {
    const q = query.trim();
    if (q.length < 2) {
      setError("Please enter at least 2 characters.");
      return;
    }
    setError("");
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/search/students?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results || []);
    } catch {
      setError("Search failed. Please try again.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function selectStudent(studentId: string) {
    router.push(`/login?studentId=${encodeURIComponent(studentId)}`);
  }

  return (
    <div className="relative mx-auto w-full max-w-2xl">
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-2 shadow-xl shadow-black/20 backdrop-blur">
        <Search className="ml-2 shrink-0 text-slate-400" size={20} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && runSearch()}
          placeholder="Search by Student ID or Name"
          aria-label="Search by Student ID or Name"
          className="w-full bg-transparent px-1 py-2.5 text-sm text-white outline-none placeholder:text-slate-500"
        />
        {query && (
          <button
            aria-label="Clear search"
            onClick={() => {
              setQuery("");
              setResults(null);
              setSearched(false);
            }}
            className="text-slate-500 hover:text-slate-300"
          >
            <X size={16} />
          </button>
        )}
        <button
          onClick={runSearch}
          disabled={loading}
          className="btn-primary flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white sm:px-5"
        >
          {loading ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
          <span className="hidden sm:inline">Find Student</span>
        </button>
      </div>

      {error && <p className="mt-2 text-sm text-rose-400">{error}</p>}

      {searched && !loading && (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0d1730] shadow-2xl shadow-black/40">
          {results && results.length > 0 ? (
            <ul className="max-h-80 divide-y divide-white/5 overflow-y-auto">
              {results.map((r) => (
                <li key={r.studentId}>
                  <button
                    onClick={() => selectStudent(r.studentId)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/5"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-blue-300">
                      <UserRound size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-white">{r.name}</span>
                      <span className="block truncate text-xs text-slate-400">
                        ID: {r.studentId}
                        {r.courses.length > 0 ? ` · ${r.courses.join(", ")}` : ""}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-6 text-center text-sm text-slate-400">
              No matching student found. Please check the Student ID or name and try again.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
