import { expect, test } from "@playwright/test";
import { signUp } from "./helpers";

test("signed-out visitors are redirected and returned after sign-in", async ({ page }) => {
  await page.goto("/history");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fhistory$/);
});

test("session token lives in an httpOnly cookie that JS cannot read", async ({ page, context }) => {
  await signUp(page);
  const token = (await context.cookies()).find((c) => c.name === "token");
  expect(token?.httpOnly).toBe(true);
  expect(token?.sameSite).toBe("Lax");
  expect(await page.evaluate(() => document.cookie)).not.toContain("token");
});

test("the proxy refuses to relay token-issuing endpoints", async ({ request }) => {
  const res = await request.post("/api/proxy/auth/login", {
    data: { email: "a@b.co", password: "x" },
  });
  expect(res.status()).toBe(404);
});

test("cross-origin writes through the proxy are blocked", async ({ request }) => {
  const res = await request.delete("/api/proxy/history/00000000-0000-0000-0000-000000000000", {
    headers: { origin: "https://evil.example" },
  });
  expect(res.status()).toBe(403);
});

test("wrong password shows an inline error; sign out ends the session", async ({ page }) => {
  const email = await signUp(page);
  await page.getByLabel(/Account menu/).click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in/);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Invalid email or password" }),
  ).toBeVisible();
  await page.goto("/");
  await expect(page).toHaveURL(/\/sign-in/);
});

test("pages ship a nonce-based CSP and hardening headers", async ({ page }) => {
  const res = await page.goto("/sign-in");
  const headers = res!.headers();
  expect(headers["content-security-policy"]).toMatch(/script-src 'self' 'nonce-[^']+'/);
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
});

test("encoded slashes cannot smuggle a token endpoint through the proxy", async ({ request }) => {
  for (const path of [
    "auth%2Flogin",
    "auth%2Fregister",
    "..%2Fhealth",
    "history%2F..%2Fauth%2Flogin",
  ]) {
    expect((await request.post(`/api/proxy/${path}`, { data: {} })).status(), path).toBe(404);
  }
});

test("auth routes reject cross-origin and non-JSON requests (login CSRF)", async ({
  request,
  baseURL,
}) => {
  const evil = await request.post("/api/auth/login", {
    headers: { origin: "https://evil.example", "content-type": "text/plain" },
    data: '{"email":"a@b.co","password":"x"}',
  });
  expect(evil.status()).toBe(403);
  const plain = await request.post("/api/auth/login", {
    headers: { origin: baseURL!, "content-type": "text/plain" },
    data: '{"email":"a@b.co","password":"x"}',
  });
  expect(plain.status()).toBe(415);
});

test("?next= cannot redirect off-site after sign-in", async ({ page, baseURL }) => {
  const email = await signUp(page);
  await page.getByLabel(/Account menu/).click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await page.goto("/sign-in?next=/%5Cevil.example");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => url.pathname !== "/sign-in");
  expect(new URL(page.url()).origin).toBe(baseURL);
});

test("the vitals beacon rejects junk instead of erroring", async ({ request }) => {
  const post = (data: string) =>
    request.post("/api/vitals", {
      data: Buffer.from(data),
      headers: { "content-type": "application/json" },
    });
  expect((await post('{"name":"LCP","value":1,"page":42}')).status()).toBe(204);
  expect((await post("{not json")).status()).toBe(400);
  expect(
    (await post(JSON.stringify({ name: "LCP", value: 1, page: "x".repeat(2000) }))).status(),
  ).toBe(413);
  // 600 × "é" is 600 characters but 1,200 bytes: the cap must count bytes.
  expect(
    (await post(JSON.stringify({ name: "LCP", value: 1, page: "é".repeat(600) }))).status(),
  ).toBe(413);
});
