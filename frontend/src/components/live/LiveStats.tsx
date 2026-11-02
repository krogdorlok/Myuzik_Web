// Connection diagnostics; the data-* attributes are what scripts/measure-live.ts records.
import { percentile, type LiveStats as Stats } from "@/lib/liveSocket";

export function LiveStats({ stats }: { stats: Stats | null }) {
  const p50 = stats && percentile(stats.latenciesMs, 50);
  const p95 = stats && percentile(stats.latenciesMs, 95);
  const seconds = stats ? (performance.now() - stats.startedAt) / 1000 : 0;
  const rows: [string, string][] = [
    ["Latency p50", p50 === null || !stats ? "—" : `${Math.round(p50)} ms`],
    ["Latency p95", p95 === null || !stats ? "—" : `${Math.round(p95)} ms`],
    [
      "Upstream",
      stats && seconds > 0 ? `${(stats.bytesSent / seconds / 1000).toFixed(1)} kB/s` : "—",
    ],
    ["Dropped frames", String(stats?.framesDropped ?? 0)],
    ["Reconnects", String(stats?.reconnects ?? 0)],
  ];
  return (
    <details className="rounded-lg border-[0.5px] border-border bg-surface p-4 text-sm">
      <summary className="cursor-pointer font-medium">Connection details</summary>
      <dl
        data-testid="live-stats"
        data-p50={p50 ?? ""}
        data-p95={p95 ?? ""}
        data-bytes={stats?.bytesSent ?? 0}
        data-seconds={seconds}
        data-frames={stats?.framesSent ?? 0}
        data-predictions={stats?.latenciesMs.length ?? 0}
        data-dropped={stats?.framesDropped ?? 0}
        data-reconnects={stats?.reconnects ?? 0}
        data-recovery={stats?.recoveryMs.join(",") ?? ""}
        className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-5"
      >
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-muted">{label}</dt>
            <dd className="tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
