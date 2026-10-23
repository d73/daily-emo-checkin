import { defineConfig } from "@playwright/test";

// End-to-end test against the local dev server (Worker + local D1, AI in practice mode).
// Before the first run: npm run db:migrate:local
export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:5173",
    viewport: { width: 420, height: 860 },
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  },
  webServer: {
    command: "npm run dev -- --port 5173 --strictPort",
    url: "http://localhost:5173",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
