"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Logo } from "@/components/layout/Logo";
import { Card } from "@/components/ui/Card";
import { useHistory } from "@/hooks/useHistory";
import { getGenreImage, getInitials } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import type { HistoryItem } from "@/types";

export default function HistoryPage() {
  const { items, total, isLoading, fetch, deleteItem } = useHistory();
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
        console.error(err);
      }
    } else {
      setDeletingId(id);
    }
  };

  const filteredItems =
    filter === "all" ? items : items.filter((item) => item.genre === filter);

  const genres = [
    "all",
    ...Array.from(new Set(items.map((item) => item.genre.toLowerCase()))),
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-extrabold text-text mb-2">
          History
        </h1>
        <p className="text-muted">{total} analyses</p>
      </div>

      <div className="mb-6">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-surface border border-border rounded-md px-4 py-2 text-text"
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
        <Card className="text-center py-12">
          <p className="text-muted">No history yet. Upload some music!</p>
          <Link href="/">
            <button className="mt-4 text-accent hover:underline">Go to upload</button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => (
            <Card key={item.id} className="flex items-center gap-4">
              <div className="w-12 h-12 rounded bg-surface flex items-center justify-center">
                {item.spotify_match?.album_art_url ? (
                  <img
                    src={item.spotify_match.album_art_url}
                    alt=""
                    className="w-full h-full object-cover rounded"
                  />
                ) : (
                  <span className="text-xs font-display font-bold text-muted">
                    {getInitials(item.genre)}
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-text font-display font-semibold truncate">
                  {item.filename}
                </p>
                <p className="text-sm text-muted">
                  {item.genre} · {Math.round(item.confidence * 100)}%
                </p>
                <p className="text-xs text-muted">{formatDate(item.created_at)}</p>
              </div>

              <button
                onClick={() => handleDelete(item.id)}
                className="p-2 text-muted hover:text-error transition-colors"
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
