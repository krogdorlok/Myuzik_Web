// Dependency-free SVG donut: each slice is a stroke-dasharray arc on one circle.
import { genreLabel } from "@/lib/genres";

const COLORS = [
  "#c8ff57",
  "#6a8a30",
  "#f0ede6",
  "#8a8a8a",
  "#3d4f1c",
  "#a3cc45",
  "#565656",
  "#d9f99d",
  "#2a2a2a",
  "#4d7c0f",
];
const R = 15.9155; // circumference of 100, so dash lengths are percentages

export function GenreDonut({
  data,
  total,
}: {
  data: { genre: string; percentage: number }[];
  total: number;
}) {
  let offset = 25;
  return (
    <figure className="flex flex-col items-center gap-6 sm:flex-row">
      <svg
        viewBox="0 0 42 42"
        className="h-44 w-44 shrink-0"
        role="img"
        aria-labelledby="donut-title"
      >
        <title id="donut-title">Genre share across {total} analyses</title>
        {data.map((d, i) => {
          const slice = (
            <circle
              key={d.genre}
              cx="21"
              cy="21"
              r={R}
              fill="none"
              stroke={COLORS[i % COLORS.length]}
              strokeWidth="5"
              strokeDasharray={`${d.percentage} ${100 - d.percentage}`}
              strokeDashoffset={offset}
            />
          );
          offset -= d.percentage;
          return slice;
        })}
        <text
          x="21"
          y="22.5"
          textAnchor="middle"
          className="fill-text font-display text-[6px] font-extrabold"
        >
          {total}
        </text>
      </svg>
      <figcaption>
        <ul className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          {data.map((d, i) => (
            <li key={d.genre} className="flex items-center gap-2">
              <span
                aria-hidden
                className="h-2.5 w-2.5 rounded-sm"
                style={{ background: COLORS[i % COLORS.length] }}
              />
              {genreLabel(d.genre)} <span className="text-muted">{Math.round(d.percentage)}%</span>
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}
