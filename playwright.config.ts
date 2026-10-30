import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// End-to-end tests: real browsers clicking through the app, at phone and laptop sizes.
// Run with `pnpm test:e2e` (starts the dev server if it isn't running). They use the dev
// database from .env.local, and each test deletes the job it created.

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

export default defineConfig({
  testDir: "e2e",
  // Named *.e2e.ts so Vitest (`pnpm test`) doesn't pick them up.
  testMatch: "*.e2e.ts",
  timeout: 120_000,
  // One at a time: the tests share one dev server and one database.
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3000",
    // Uses the Chrome installed on this computer, so there's no browser to download.
    channel: "chrome",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "phone", use: { ...devices["Pixel 7"], channel: "chrome" } },
    { name: "laptop", use: { ...devices["Desktop Chrome"], channel: "chrome" } },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
