import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/tests/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      include: ["src/components/**", "src/hooks/**", "src/lib/**", "src/types/**"],
      // Covered by Playwright in real browsers instead: Web Audio graph, server-only code, the vitals beacon.
      exclude: ["src/lib/liveAudio.ts", "src/lib/server/**", "src/lib/logger.ts", "src/components/layout/WebVitals.tsx"],
      thresholds: { lines: 85, branches: 85 },
      reporter: ["text-summary", "json-summary"],
    },
  },
});
