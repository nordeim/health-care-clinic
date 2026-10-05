import { defineConfig, devices } from "@playwright/test";

// E2E layer: boots the PRODUCTION standalone server on an isolated port
// with its own scratch database (db/e2e.db, schema-pushed by the global
// setup), then drives the real UI in Chromium.
//
// Prerequisites: `bun run build` (the standalone server must exist).
// Run with: `bun run test:e2e`.
//
// The unit layer stays in Vitest (see vitest.config.mts — it matches
// *.test.ts only, so these *.spec.ts files are never picked up twice).

const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE_URL = `http://localhost:${PORT}`;
const E2E_DATABASE_URL = "file:../db/e2e.db";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1, // one worker: the specs share a single SQLite file
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  globalSetup: "./tests/e2e/global-setup.ts",
  webServer: {
    command: "bun .next/standalone/server.js",
    url: `${BASE_URL}/api/health`,
    timeout: 60_000,
    reuseExistingServer: !process.env.CI,
    env: {
      ...process.env,
      PORT: String(PORT),
      HOSTNAME: "localhost",
      NODE_ENV: "production",
      DATABASE_URL: E2E_DATABASE_URL,
      // Explicit test signing key: previously this only worked because bun
      // auto-loads .env into process.env — `npx playwright test` (or a CI
      // runner without .env) made every login 500 (production signing
      // throws without AUTH_SECRET). Never inherit secrets implicitly.
      AUTH_SECRET: process.env.AUTH_SECRET ?? "e2e-insecure-test-secret",
    } as Record<string, string>,
  },
});
