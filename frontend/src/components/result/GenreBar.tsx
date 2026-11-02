// One labelled score bar. Static bars grow from zero with a 50 ms stagger; live bars glide between updates.
import { genreLabel, percent } from "@/lib/genres";
import { cn } from "@/lib/utils";

interface GenreBarProps {
  genre: string;
  score: number;
  index: number;
  top?: boolean;
  live?: boolean;
}

export function GenreBar({ genre, score, index, top = false, live = false }: GenreBarProps) {
  return (
    <li className="grid grid-cols-[6rem_1fr_3rem] items-center gap-3 text-sm">
      <span className={top ? "text-text" : "text-muted"}>{genreLabel(genre)}</span>
      <div
        role="progressbar"
        aria-label={`${genreLabel(genre)} confidence`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(score * 100)}
        className="h-2 overflow-hidden rounded-full bg-border"
      >
        <div
          className={cn(
            "h-full origin-left rounded-full",
            live ? "transition-[width] duration-500 ease-out" : "animate-bar-in",
            top ? "bg-accent" : "bg-accent-dim",
          )}
          style={{ width: percent(score), animationDelay: live ? undefined : `${index * 50}ms` }}
        />
      </div>
      <span className="text-right tabular-nums text-muted">{percent(score)}</span>
    </li>
  );
}
