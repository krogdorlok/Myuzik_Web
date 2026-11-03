// Regenerates the README metrics table from docs/metrics/*.json, so every published number has a source.
// usage: node scripts/metrics-table.mjs
import { readFileSync, writeFileSync } from "node:fs";

const load = (name) => JSON.parse(readFileSync(new URL(`../docs/metrics/${name}.json`, import.meta.url)));
const [model, exp, live, perf, tests] = ["model", "model-export", "live", "perf", "tests"].map(load);
const lh = Object.values(perf.lighthouse_mobile);
const min = (key) => Math.min(...lh.map((s) => s[key])) * 100;
const home = perf.first_load_js_kb["/"];
const pct = (a, b) => Math.round((1 - a / b) * 100);

const rows = [
  ["Live latency (frame → prediction)", `p50 ${live.latency_ms.p50} ms · p95 ${live.latency_ms.p95} ms`, "live.json"],
  ["Live upstream bandwidth", `${(live.upstream_bytes_per_second / 1000).toFixed(1)} kB/s (${pct(live.upstream_bytes_per_second, live.raw_capture_bytes_per_second)}% below raw 48 kHz float capture)`, "live.json"],
  ["Reconnect recovery after a forced drop", `${live.reconnect_recovery_ms.join(", ")} ms, ${live.frames_dropped} frames dropped in ${live.duration_s} s`, "live.json"],
  ["Lighthouse mobile (/sign-in, /, /insights, /live)", `performance ${min("performance") === 100 ? "100" : `≥ ${min("performance")}`} · accessibility ${min("accessibility")}`, "perf.json"],
  ["First Load JS, /", `${home.before} kB → ${home.after} kB`, "perf.json"],
  ["Model accuracy (held-out GTZAN, n=" + model.n_clips + ")", `${(model.accuracy * 100).toFixed(1)}% · macro-F1 ${model.macro_f1.toFixed(3)}`, "model.json"],
  ["VGGish LiteRT vs TensorFlow (2.88 s window)", `${exp.median_latency_ms.live_window_2_88s.litert} ms vs ${exp.median_latency_ms.live_window_2_88s.tensorflow} ms, max embedding diff ${exp.embedding_max_abs_diff_tf_vs_litert.toExponential(1)}`, "model-export.json"],
  ["Tests", `${tests.unit_tests.passed} unit (${tests.unit_coverage_pct.lines}% lines, ${tests.unit_coverage_pct.branches}% branches) · ${tests.e2e.passed} Playwright on ${tests.e2e_projects.join(", ")} · ${tests.backend_pytest_passed} pytest · ${tests.failing_axe_specs} failing axe specs`, "tests.json"],
];

const table = [
  "| Metric | Result | Source |",
  "| --- | --- | --- |",
  ...rows.map(([m, r, f]) => `| ${m} | ${r} | [${f}](docs/metrics/${f}) |`),
].join("\n");
const readme = new URL("../README.md", import.meta.url);
const text = readFileSync(readme, "utf8").replace(/(<!-- metrics:start -->)[\s\S]*?(<!-- metrics:end -->)/, `$1\n${table}\n$2`);
writeFileSync(readme, text);
