"use client";
// Live Listen: stream the mic or a playing file and watch the genre change in real time.
import { useEffect, useRef, useState } from "react";
import { LiveStats } from "@/components/live/LiveStats";
import { LiveTimeline } from "@/components/live/LiveTimeline";
import { SourcePicker, type Source } from "@/components/live/SourcePicker";
import { GenreBar } from "@/components/result/GenreBar";
import { Button } from "@/components/ui/Button";
import { useLiveListen } from "@/hooks/useLiveListen";
import { genreArt, genreLabel } from "@/lib/genres";
import { cn } from "@/lib/utils";

const STATUS = {
  idle: "Ready",
  connecting: "Connecting…",
  live: "Listening",
  reconnecting: "Reconnecting…",
  error: "Stopped",
};

export default function LivePage() {
  const { status, error, current, timeline, stats, start, stop } = useLiveListen();
  const [source, setSource] = useState<Source>({ mode: "mic" });
  const audio = useRef<HTMLAudioElement>(null);
  const [take, setTake] = useState(0);
  const running = status !== "idle" && status !== "error";
  useEffect(() => {
    if (!running) setTake((t) => t + 1);
  }, [running]);
  const top =
    current &&
    Object.entries(current.scores)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

  function toggle() {
    if (running) return void stop();
    if (source.mode === "mic") return void start({ kind: "mic" });
    if (audio.current) void start({ kind: "file", element: audio.current });
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-extrabold sm:text-4xl">Live Listen</h1>
        <p className="mt-2 text-muted">Genre predictions stream in about once a second.</p>
      </header>

      <div className="space-y-4 rounded-lg border-[0.5px] border-border bg-surface p-4 sm:p-6">
        <SourcePicker
          source={source}
          onChange={setSource}
          disabled={running}
          audioRef={audio}
          take={take}
        />
        <div className="flex items-center justify-between gap-4">
          <p className="flex items-center gap-2 text-sm" aria-live="polite">
            <span
              aria-hidden
              className={cn(
                "h-2 w-2 rounded-full",
                status === "live"
                  ? "animate-pulse bg-accent"
                  : status === "error"
                    ? "bg-error"
                    : "bg-muted",
              )}
            />
            {STATUS[status]}
          </p>
          <Button onClick={toggle} disabled={!running && source.mode === "file" && !source.file}>
            {running ? "Stop" : "Start listening"}
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        )}
      </div>

      <section
        aria-labelledby="now-heading"
        className="overflow-hidden rounded-lg border-[0.5px] border-border bg-surface"
      >
        <div
          className="p-6 transition-[background] duration-500"
          style={{ background: current ? genreArt(current.genre) : undefined }}
        >
          <h2 id="now-heading" className="text-sm text-muted">
            Now
          </h2>
          <p className="font-display text-4xl font-extrabold">
            {current ? genreLabel(current.genre) : "—"}
          </p>
          <p className="sr-only" aria-live="polite">
            {timeline.length > 0 && `Now ${genreLabel(timeline[timeline.length - 1].genre)}`}
          </p>
        </div>
        {top && (
          <ol aria-label="Top genres right now" className="space-y-2.5 p-6 pt-2">
            {top.map(([genre, score], i) => (
              <GenreBar key={genre} genre={genre} score={score} index={i} top={i === 0} live />
            ))}
          </ol>
        )}
      </section>

      <LiveTimeline segments={timeline} />
      <LiveStats stats={stats} />
    </div>
  );
}
