import { expect, test } from "@playwright/test";
import { makeWav, signUp } from "./helpers";

test("file mode streams a playing track and fills the timeline", async ({ page }) => {
  await signUp(page);
  await page.getByRole("link", { name: "Live", exact: true }).click();
  await page.getByText("Play a file").click();
  await page
    .getByLabel("Track")
    .setInputFiles({ name: "mix.wav", mimeType: "audio/wav", buffer: makeWav(12) });
  await page.getByRole("button", { name: "Start listening" }).click();
  await expect(page.getByText("Listening", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("list", { name: "Genre timeline" }).getByRole("listitem"),
  ).not.toHaveText(/appear here/, {
    timeout: 15_000,
  });
  await expect(
    page.getByRole("list", { name: "Top genres right now" }).getByRole("progressbar"),
  ).toHaveCount(5);
  await page.getByRole("button", { name: "Stop" }).click();
  await expect(page.getByText("Ready", { exact: true })).toBeVisible();
});

test("the UI recovers from a dropped socket and resumes the session", async ({ page }) => {
  let connections = 0;
  const sessions: (string | null)[] = [];
  await page.routeWebSocket(/\/ws\/listen/, (ws) => {
    connections++;
    sessions.push(new URL(ws.url()).searchParams.get("session"));
    ws.send(JSON.stringify({ type: "ready", sessionId: "s-1" }));
    let seq = 0;
    ws.onMessage(() => {
      seq++;
      const scores = { jazz: 0.6, blues: 0.3, rock: 0.05, pop: 0.03, metal: 0.02 };
      ws.send(
        JSON.stringify({
          type: "prediction",
          seq,
          scores,
          genre: "jazz",
          confidence: 0.6,
          serverMs: 12,
        }),
      );
      if (connections === 1 && seq === 3) void ws.close({ code: 1011 });
    });
    ws.send("not json");
    ws.send(JSON.stringify({ type: "prediction", seq: "bad" }));
  });
  await signUp(page);
  await page.goto("/live");
  await page.getByText("Play a file").click();
  await page
    .getByLabel("Track")
    .setInputFiles({ name: "mix.wav", mimeType: "audio/wav", buffer: makeWav(20) });
  await page.getByRole("button", { name: "Start listening" }).click();
  await expect(page.getByText("Reconnecting…")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Listening", { exact: true })).toBeVisible({ timeout: 15_000 });
  expect(sessions).toEqual([null, "s-1"]);
  await page.getByText("Connection details").click();
  await expect(page.getByTestId("live-stats")).toHaveAttribute("data-reconnects", "1");
});
