import { expect, test } from "@playwright/test";
import { makeWav, signUp } from "./helpers";

test("upload → progress → result → history → insights → delete", async ({ page }) => {
  await signUp(page);
  await page
    .getByLabel(/Drop a track/)
    .setInputFiles({ name: "demo-track.wav", mimeType: "audio/wav", buffer: makeWav(6) });
  await expect(page.getByRole("heading", { level: 2 })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("progressbar")).toHaveCount(10);

  await page.getByRole("link", { name: "History" }).click();
  await expect(page.getByText("demo-track.wav")).toBeVisible();
  await expect(page.getByText("1 analysis")).toBeVisible();

  await page.getByRole("link", { name: "Insights" }).click();
  await expect(page.getByRole("img", { name: /Genre share across 1 analyses/ })).toBeVisible();

  await page.getByRole("link", { name: "History" }).click();
  await page.getByRole("button", { name: "Delete demo-track.wav" }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByText("Nothing here yet")).toBeVisible();
});

test("non-audio files are rejected before upload", async ({ page }) => {
  await signUp(page);
  await page.getByLabel(/Drop a track/).setInputFiles({
    name: "notes.wav",
    mimeType: "audio/wav",
    buffer: Buffer.from("not really audio"),
  });
  await expect(
    page.getByRole("alert").filter({ hasText: /doesn't look like an MP3, WAV, FLAC or OGG/ }),
  ).toBeVisible();
});
