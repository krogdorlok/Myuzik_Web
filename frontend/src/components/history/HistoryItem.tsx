"use client";
// A history row with an inline two-step delete; focus moves into the confirmation and back out of it.
import { useEffect, useRef, useState } from "react";
import { genreArt, genreLabel, percent } from "@/lib/genres";
import { formatTime } from "@/lib/utils";
import type { HistoryItem as Item } from "@/types";

const action = "rounded-md px-3 py-1.5 text-sm hover:bg-border";

export function HistoryItem({ item, onDelete }: { item: Item; onDelete: (id: string) => void }) {
  const [confirming, setConfirming] = useState<boolean | null>(null);
  const confirm = useRef<HTMLButtonElement>(null);
  const remove = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (confirming === null) return;
    (confirming ? confirm : remove).current?.focus();
  }, [confirming]);

  return (
    <li className="flex items-center gap-4 rounded-lg border-[0.5px] border-border bg-surface p-3 pr-4">
      <div
        aria-hidden
        className="h-12 w-12 shrink-0 rounded-md"
        style={{ background: genreArt(item.genre) }}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{item.filename}</p>
        <p className="text-sm text-muted">
          <span className="text-text">{genreLabel(item.genre)}</span> · {percent(item.confidence)} ·{" "}
          <time dateTime={item.created_at}>{formatTime(item.created_at)}</time>
        </p>
      </div>
      {confirming ? (
        <div role="group" aria-label={`Delete ${item.filename}?`} className="flex gap-1">
          <button
            ref={confirm}
            type="button"
            onClick={() => onDelete(item.id)}
            className={`${action} text-error`}
          >
            Delete
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className={`${action} text-muted`}
          >
            Keep
          </button>
        </div>
      ) : (
        <button
          ref={remove}
          type="button"
          onClick={() => setConfirming(true)}
          aria-label={`Delete ${item.filename}`}
          className={`${action} text-muted hover:text-text`}
        >
          Remove
        </button>
      )}
    </li>
  );
}
