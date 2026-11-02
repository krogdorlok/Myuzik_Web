"use client";
// Transcript-style genre timeline: follows the newest segment unless the listener scrolls up.
import { useEffect, useRef, useState } from "react";
import { genreArt, genreLabel, percent } from "@/lib/genres";
import type { Segment } from "@/hooks/useLiveListen";

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function LiveTimeline({ segments }: { segments: Segment[] }) {
  const list = useRef<HTMLOListElement>(null);
  const [following, setFollowing] = useState(true);

  useEffect(() => {
    const el = list.current;
    if (!el || !following) return;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, [segments, following]);

  return (
    <section aria-labelledby="timeline-heading" className="relative">
      <h2 id="timeline-heading" className="mb-3 font-display text-lg font-bold">
        Timeline
      </h2>
      <ol
        ref={list}
        tabIndex={0}
        aria-label="Genre timeline"
        onScroll={(e) => {
          const el = e.currentTarget;
          setFollowing(el.scrollHeight - el.scrollTop - el.clientHeight < 24);
        }}
        className="h-72 space-y-2 overflow-y-auto rounded-lg border-[0.5px] border-border bg-surface p-3"
      >
        {segments.length === 0 && (
          <li className="p-3 text-sm text-muted">Segments appear here as the genre is detected.</li>
        )}
        {segments.map((s, i) => (
          <li
            key={`${s.startS}-${i}`}
            className="flex animate-page-in items-center gap-3 rounded-md p-2"
          >
            <span
              aria-hidden
              className="h-8 w-8 shrink-0 rounded"
              style={{ background: genreArt(s.genre) }}
            />
            <span className="w-24 shrink-0 text-sm tabular-nums text-muted">
              {clock(s.startS)}–{clock(s.endS)}
            </span>
            <span className="flex-1 font-medium">{genreLabel(s.genre)}</span>
            <span className="text-sm tabular-nums text-muted">{percent(s.confidence)}</span>
          </li>
        ))}
      </ol>
      {!following && (
        <button
          type="button"
          onClick={() => setFollowing(true)}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-4 py-1.5 font-display text-sm font-bold text-background"
        >
          Jump to live
        </button>
      )}
    </section>
  );
}
