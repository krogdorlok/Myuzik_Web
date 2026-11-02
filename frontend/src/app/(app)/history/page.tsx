"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { useHistory } from "@/hooks/useHistory";
import { getInitials } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { logger } from "@/lib/logger";

export default function HistoryPage() {
  const { items, total, isLoading, error, fetch, deleteItem } = useHistory();
  const [filter, setFilter] = useState<string>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const handleDelete = async (id: string) => {
    if (deletingId === id) {
      try {
        await deleteItem(id);
        setDeletingId(null);
      } catch (err) {
        logger.error({ err }, "delete failed");
      }
    } else {
      setDeletingId(id);
    }
  };

  const filteredItems = filter === "all" ? items : items.filter((item) => item.genre === filter);

  const genres = ["all", ...Array.from(new Set(items.map((item) => item.genre.toLowerCase())))];

  return (
    <div>
      <div className="mb-8">
        <h1 className="mb-2 font-display text-3xl font-extrabold text-text">History</h1>
        <p className="text-muted">{total} analyses</p>
      </div>

      {error && (
        <p role="alert" className="mb-6 text-sm text-error">
          {error}
        </p>
      )}

      <div className="mb-6">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-md border border-border bg-surface px-4 py-2 text-text"
        >
          {genres.map((genre) => (
            <option key={genre} value={genre}>
              {genre.charAt(0).toUpperCase() + genre.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="text-center text-muted">Loading...</div>
      ) : filteredItems.length === 0 ? (
        <Card className="py-12 text-center">
          <p className="text-muted">No history yet. Upload some music!</p>
          <Link href="/">
            <button className="mt-4 text-accent hover:underline">Go to upload</button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => (
            <Card key={item.id} className="flex items-center gap-4">
              <div className="relative flex h-12 w-12 items-center justify-center rounded bg-surface">
                {item.spotify_match?.album_art_url ? (
                  <Image
                    src={item.spotify_match.album_art_url}
                    alt=""
                    fill
                    sizes="48px"
                    className="rounded object-cover"
                  />
                ) : (
                  <span className="font-display text-xs font-bold text-muted">
                    {getInitials(item.genre)}
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate font-display font-semibold text-text">{item.filename}</p>
                <p className="text-sm text-muted">
                  {item.genre} · {Math.round(item.confidence * 100)}%
                </p>
                <p className="text-xs text-muted">{formatDate(item.created_at)}</p>
              </div>

              <button
                onClick={() => handleDelete(item.id)}
                className="p-2 text-muted transition-colors hover:text-error"
              >
                {deletingId === item.id ? "Confirm?" : "×"}
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
