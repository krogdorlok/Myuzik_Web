// Prediction result: generated genre art (or Spotify album art), headline genre, and the full score distribution.
import Image from "next/image";
import { GenreBar } from "@/components/result/GenreBar";
import { Button } from "@/components/ui/Button";
import { genreArt, genreLabel, percent } from "@/lib/genres";
import type { PredictionResult } from "@/types";

interface ResultCardProps {
  result: PredictionResult;
  filename: string;
  onReset: () => void;
}

export function ResultCard({ result, filename, onReset }: ResultCardProps) {
  const scores = Object.entries(result.all_scores).sort(([, a], [, b]) => b - a);
  const match = result.spotify_match;
  return (
    <article
      aria-labelledby="result-genre"
      className="overflow-hidden rounded-lg border-[0.5px] border-border bg-surface"
    >
      <div className="relative h-44 sm:h-56" style={{ background: genreArt(result.genre) }}>
        {match && (
          <Image
            src={match.album_art_url}
            alt={`${match.album} cover`}
            fill
            sizes="(max-width: 768px) 100vw, 720px"
            className="object-cover opacity-60"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent" />
        <div className="absolute bottom-0 p-6">
          <p className="text-sm text-muted">{filename}</p>
          <h2
            id="result-genre"
            tabIndex={-1}
            className="font-display text-4xl font-extrabold outline-none sm:text-5xl"
          >
            {genreLabel(result.genre)}
          </h2>
          <p className="mt-1 text-accent">{percent(result.confidence)} confident</p>
        </div>
      </div>
      <div className="space-y-6 p-6">
        {match && (
          <p className="text-sm text-muted">
            Sounds like <span className="text-text">{match.track_name}</span> by {match.artist}
          </p>
        )}
        <ol aria-label="Score for each genre" className="space-y-2.5">
          {scores.map(([genre, score], i) => (
            <GenreBar key={genre} genre={genre} score={score} index={i} top={i === 0} />
          ))}
        </ol>
        <Button variant="secondary" onClick={onReset}>
          Analyse another track
        </Button>
      </div>
    </article>
  );
}
