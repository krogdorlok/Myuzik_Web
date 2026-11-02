// `npm run perf`: First Load JS per route (gzip, as `next build` reports it) and Lighthouse mobile scores for
// signed-out and signed-in pages, merged into docs/metrics/perf.json. Fails if a budget is missed.
import { execSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { chromium, expect, test } from "@playwright/test";
import { signUp } from "./helpers";

test.skip(!process.env.PERF, "perf run only");
test.describe.configure({ mode: "serial" });
test.setTimeout(240_000);

const OUT = "../docs/metrics/perf.json";
const BUDGET = { performance: 0.9, accessibility: 1 };
const report = (): Record<string, unknown> =>
  existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};
const save = (patch: Record<string, unknown>) =>
  writeFileSync(
    OUT,
    JSON.stringify(
      {
        ...report(),
        ...patch,
        commit: execSync("git rev-parse --short HEAD").toString().trim(),
        date: new Date().toISOString().slice(0, 10),
      },
      null,
      2,
    ) + "\n",
  );

test("first-load JS per route", () => {
  const manifest = JSON.parse(readFileSync(".next/app-build-manifest.json", "utf8"))
    .pages as Record<string, string[]>;
  const kb = (files: string[]) =>
    Math.round(
      files
        .filter((f) => f.endsWith(".js"))
        .reduce((n, f) => n + gzipSync(readFileSync(join(".next", f))).length, 0) / 102.4,
    ) / 10;
  const routes = [
    "/(auth)/sign-in/page",
    "/(app)/page",
    "/(app)/history/page",
    "/(app)/insights/page",
    "/(app)/live/page",
  ];
  const baseline = Object.fromEntries(
    [
      ...readFileSync("../docs/metrics/perf-baseline.txt", "utf8").matchAll(
        /^[├└┌] ○ (\/\S*)\s+\S+ k?B\s+([\d.]+) kB/gm,
      ),
    ].map((m) => [m[1], Number(m[2])]),
  );
  const pretty = (r: string) => r.replace(/\/\([^)]+\)/, "").replace(/\/page$/, "") || "/";
  save({
    first_load_js_kb: Object.fromEntries(
      routes.map((r) => [
        pretty(r),
        {
          before: baseline[pretty(r)] ?? null,
          after: kb([...new Set([...manifest["/layout"], ...manifest[r]])]),
        },
      ]),
    ),
    first_load_js_note:
      "gzip of route + layout chunks from .next/app-build-manifest.json; 'before' is the M0 build",
  });
});

test("lighthouse mobile budgets", async ({ baseURL }) => {
  const { default: lighthouse } = await import("lighthouse");
  const port = 9333;
  const context = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), "lh-")), {
    args: [`--remote-debugging-port=${port}`],
  });
  const page = await context.newPage();
  const scores: Record<string, Record<string, number>> = {};
  const audit = async (path: string) => {
    const result = await lighthouse(`${baseURL}${path}`, {
      port,
      output: "json",
      onlyCategories: ["performance", "accessibility"],
      disableStorageReset: true,
    });
    expect(result!.lhr.runtimeError?.code, `${path} lighthouse run`).toBeUndefined();
    const c = result!.lhr.categories;
    scores[path] = {
      performance: c.performance.score!,
      accessibility: c.accessibility.score!,
      lcp_ms: Math.round(result!.lhr.audits["largest-contentful-paint"].numericValue!),
      cls: result!.lhr.audits["cumulative-layout-shift"].numericValue!,
    };
  };
  await signUp(page);
  for (const path of ["/", "/insights", "/live", "/sign-in"]) await audit(path);
  await context.close();
  save({
    lighthouse_mobile: scores,
    lighthouse_note:
      "Lighthouse 12 default mobile config (simulated Moto G Power, slow 4G), production build, local machine",
  });
  for (const [path, s] of Object.entries(scores)) {
    expect(s.performance, `${path} performance`).toBeGreaterThanOrEqual(BUDGET.performance);
    expect(s.accessibility, `${path} accessibility`).toBe(BUDGET.accessibility);
  }
});
