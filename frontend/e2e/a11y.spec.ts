import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { signUp } from "./helpers";

const scan = (page: import("@playwright/test").Page) =>
  new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();

test("auth pages have no axe violations", async ({ page }) => {
  for (const path of ["/sign-in", "/sign-up"]) {
    await page.goto(path);
    expect((await scan(page)).violations, path).toEqual([]);
  }
});

test("app pages have no axe violations", async ({ page }) => {
  await signUp(page);
  for (const path of ["/", "/history", "/insights", "/live"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    expect((await scan(page)).violations, path).toEqual([]);
  }
});
