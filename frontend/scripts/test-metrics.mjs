// `npm run metrics:tests [-- --projects=chromium,firefox]`: runs the backend, unit and e2e suites and writes
// counts, coverage and the browser projects that actually ran to docs/metrics/tests.json.
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const arg = process.argv.find((a) => a.startsWith("--projects="));
const projects = arg
  ? arg.slice(11).split(",")
  : ["chromium", "firefox", "webkit", "mobile-chrome", "mobile-safari"];
const run = (cmd, opts = {}) =>
  execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"], ...opts });

const pytest = run("~/.venvs/myuzik-backend/bin/python -m pytest -q -p no:warnings", {
  cwd: "../backend",
  shell: "/bin/zsh",
});
const [, backendPassed] = pytest.match(/(\d+) passed/) ?? [];

run("npx vitest run --coverage --reporter=json --outputFile=coverage/vitest.json");
const vitest = JSON.parse(readFileSync("coverage/vitest.json", "utf8"));
const coverage = JSON.parse(readFileSync("coverage/coverage-summary.json", "utf8")).total;

const e2e = JSON.parse(
  run(`npx playwright test --reporter=json ${projects.map((p) => `--project=${p}`).join(" ")}`, {
    env: { ...process.env, PERF: "1" },
    maxBuffer: 64 << 20,
  }),
);
const result = {
  backend_pytest_passed: Number(backendPassed),
  unit_tests: { total: vitest.numTotalTests, passed: vitest.numPassedTests },
  unit_coverage_pct: { lines: coverage.lines.pct, branches: coverage.branches.pct },
  e2e: {
    passed: e2e.stats.expected,
    failed: e2e.stats.unexpected,
    flaky: e2e.stats.flaky,
    skipped: e2e.stats.skipped,
  },
  e2e_projects: projects,
  axe_violations: e2e.stats.unexpected === 0 ? 0 : "see failing a11y tests",
  command: `cd frontend && npm run metrics:tests${arg ? ` -- ${arg}` : ""}`,
  commit: run("git rev-parse --short HEAD").trim(),
  date: new Date().toISOString().slice(0, 10),
};
writeFileSync("../docs/metrics/tests.json", JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result, null, 2));
