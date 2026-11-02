import { defineConfig, devices } from "@playwright/test";

const ci = !!process.env.CI;
const prod = ci || !!process.env.PERF;
const fakeMic = {
  launchOptions: { args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] },
};

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: ci,
  retries: ci ? 1 : 0,
  reporter: ci ? [["github"], ["json", { outputFile: "playwright-report/results.json" }]] : "list",
  use: { baseURL: process.env.BASE_URL ?? "http://localhost:3000", trace: "retain-on-failure" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"], ...fakeMic } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "mobile-chrome", use: { ...devices["Pixel 7"], ...fakeMic } },
    { name: "mobile-safari", use: { ...devices["iPhone 14"] } },
  ],
  webServer: {
    command: prod ? "npm run start" : "npm run dev",
    url: "http://localhost:3000/sign-in",
    reuseExistingServer: !prod,
  },
});
