"use client";
// Taste profile: headline stats plus the genre donut, with skeleton, empty and error states.
import Link from "next/link";
import { useEffect, useState } from "react";
import { GenreDonut } from "@/components/insights/GenreDonut";
import { Skeleton } from "@/components/ui/Skeleton";
import { api, ApiError } from "@/lib/api";
import { genreArt, genreLabel } from "@/lib/genres";
import type { TasteProfile as Profile } from "@/types";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border-[0.5px] border-border bg-surface p-4 sm:p-5">
      <p className="font-display text-2xl font-extrabold text-accent sm:text-3xl">{value}</p>
      <p className="mt-1 text-xs text-muted sm:text-sm">{label}</p>
    </div>
  );
}

export function TasteProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .tasteProfile()
      .then(setProfile)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Couldn't load your insights."),
      );
  }, []);

  if (error)
    return (
      <p role="alert" className="text-error">
        {error}
      </p>
    );
  if (!profile)
    return (
      <div aria-busy aria-label="Loading insights" className="space-y-4">
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-56" />
      </div>
    );
  if (!profile.top_genre)
    return (
      <div className="rounded-lg border-[0.5px] border-border bg-surface px-6 py-12 text-center">
        <p className="font-display text-lg font-bold">No listening data yet</p>
        <p className="mt-1 text-sm text-muted">
          <Link
            href="/"
            className="text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent"
          >
            Analyse a few tracks
          </Link>{" "}
          to build your taste profile.
        </p>
      </div>
    );

  const top = profile.genre_breakdown[0];
  return (
    <div className="space-y-4">
      <div
        className="relative overflow-hidden rounded-lg p-6"
        style={{ background: genreArt(profile.top_genre) }}
      >
        <p className="text-sm text-muted">Your sound</p>
        <p className="font-display text-4xl font-extrabold">{genreLabel(profile.top_genre)}</p>
      </div>
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <Stat label="Tracks analysed" value={String(profile.total_analyses)} />
        <Stat label="Genres explored" value={String(profile.genre_breakdown.length)} />
        <Stat
          label={`of it is ${genreLabel(top.genre)}`}
          value={`${Math.round(top.percentage)}%`}
        />
      </div>
      <section
        aria-labelledby="breakdown"
        className="rounded-lg border-[0.5px] border-border bg-surface p-6"
      >
        <h2 id="breakdown" className="mb-6 font-display text-lg font-bold">
          Genre breakdown
        </h2>
        <GenreDonut data={profile.genre_breakdown} total={profile.total_analyses} />
      </section>
    </div>
  );
}
