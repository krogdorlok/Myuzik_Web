"use client";
// History with a genre filter (synced to ?genre=) and Prev/Next pagination.
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { HistoryItem } from "@/components/history/HistoryItem";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { PAGE_SIZE, useHistory } from "@/hooks/useHistory";
import { GENRES, genreLabel } from "@/lib/genres";

export function HistoryList() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const genre = params.get("genre") ?? undefined;
  const page = Math.max(0, Number(params.get("page")) || 0);
  const { data, error, remove, retry } = useHistory(genre, page);
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  useEffect(() => {
    if (data && data.items.length === 0 && page > 0)
      navigate({ genre, page: Math.min(page, pages) - 1 });
  });

  function navigate(next: { genre?: string; page?: number }) {
    const q = new URLSearchParams();
    if (next.genre) q.set("genre", next.genre);
    if (next.page) q.set("page", String(next.page));
    router.replace(q.size ? `${pathname}?${q}` : pathname, { scroll: false });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p aria-live="polite" className="text-sm text-muted">
          {data ? `${data.total} ${data.total === 1 ? "analysis" : "analyses"}` : " "}
        </p>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted">Genre</span>
          <select
            value={genre ?? ""}
            onChange={(e) => navigate({ genre: e.target.value || undefined })}
            className="rounded-md border-[0.5px] border-[#2a2a2a] bg-[#141414] px-3 py-2"
          >
            <option value="">All</option>
            {GENRES.map((g) => (
              <option key={g} value={g}>
                {genreLabel(g)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between rounded-lg border-[0.5px] border-error/40 p-4 text-sm"
        >
          <span className="text-error">{error}</span>
          <Button variant="ghost" size="sm" onClick={retry}>
            Retry
          </Button>
        </div>
      )}

      {!data && !error && (
        <div aria-busy aria-label="Loading history" className="space-y-3">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-[74px]" />
          ))}
        </div>
      )}

      {data && data.items.length === 0 && (
        <div className="rounded-lg border-[0.5px] border-border bg-surface px-6 py-12 text-center">
          <p className="font-display text-lg font-bold">
            {genre ? `No ${genreLabel(genre)} yet` : "Nothing here yet"}
          </p>
          <p className="mt-1 text-sm text-muted">
            <Link
              href="/"
              className="text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent"
            >
              Analyse a track
            </Link>{" "}
            and it will show up here.
          </p>
        </div>
      )}

      {data && data.items.length > 0 && (
        <ul className="space-y-3">
          {data.items.map((item) => (
            <HistoryItem key={item.id} item={item} onDelete={remove} />
          ))}
        </ul>
      )}

      {pages > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-between pt-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={page === 0}
            onClick={() => navigate({ genre, page: page - 1 })}
          >
            Previous
          </Button>
          <span className="text-sm text-muted">
            Page {page + 1} of {pages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page + 1 >= pages}
            onClick={() => navigate({ genre, page: page + 1 })}
          >
            Next
          </Button>
        </nav>
      )}
    </div>
  );
}
