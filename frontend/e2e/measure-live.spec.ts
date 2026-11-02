// `npm run measure:live`: streams a looping 30 s track in file mode for 60 s against the real backend,
// force-closes the socket at 30 s, and writes the client-side stats to docs/metrics/live.json.
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { expect, test, type WebSocketRoute } from "@playwright/test";
import { makeWav, signUp } from "./helpers";

test.skip(!process.env.MEASURE, "measurement run only");
test.setTimeout(120_000);

test("measure live streaming", async ({ page, browserName }) => {
  let socket: WebSocketRoute | null = null;
  // Playwright proxies the socket (adding one local hop) so the run can force a disconnect mid-stream.
  await page.routeWebSocket(/\/ws\/listen/, (ws) => {
    socket = ws;
    ws.connectToServer();
  });
  await signUp(page);
  await page.goto("/live");
  await page.getByText("Play a file").click();
  await page
    .getByLabel("Track")
    .setInputFiles({ name: "30s-mix.wav", mimeType: "audio/wav", buffer: makeWav(30) });
  await page.getByRole("button", { name: "Start listening" }).click();
  await expect(page.getByText("Listening", { exact: true })).toBeVisible();

  await page.waitForTimeout(30_000);
  await socket!.close({ code: 1011, reason: "measurement: forced drop" });
  await page.waitForTimeout(30_000);

  const stats = page.getByTestId("live-stats");
  const read = async (name: string) => (await stats.getAttribute(`data-${name}`)) ?? "";
  const seconds = Number(await read("seconds"));
  const predictions = Number(await read("predictions"));
  const result = {
    latency_ms: {
      p50: Math.round(Number(await read("p50"))),
      p95: Math.round(Number(await read("p95"))),
    },
    latency_definition:
      "frame sent → matching prediction received (network + server inference); excludes the 0.96 s of audio a frame takes to fill",
    predictions_per_minute: Math.round((predictions / seconds) * 60),
    upstream_bytes_per_second: Math.round(Number(await read("bytes")) / seconds),
    raw_capture_bytes_per_second: 48_000 * 4,
    frames_sent: Number(await read("frames")),
    frames_dropped: Number(await read("dropped")),
    reconnects: Number(await read("reconnects")),
    reconnect_recovery_ms: (await read("recovery"))
      .split(",")
      .filter(Boolean)
      .map((v) => Math.round(Number(v))),
    duration_s: Math.round(seconds),
    setup: `${browserName}, file mode, synthetic 30 s WAV looped, local backend, through Playwright's WebSocket proxy`,
    command: "cd frontend && npm run measure:live",
    commit: execSync("git rev-parse --short HEAD").toString().trim(),
    date: new Date().toISOString().slice(0, 10),
  };
  writeFileSync("../docs/metrics/live.json", JSON.stringify(result, null, 2) + "\n");
  expect(result.reconnects).toBe(1);
  expect(predictions).toBeGreaterThan(40);
});
