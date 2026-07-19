import { defineConfig, devices } from "@playwright/test";

// E2E runs against an isolated SQLite database (prisma/test.db) that the
// global setup force-resets and re-seeds before every run — dev.db is never
// touched. The dev server is booted on a dedicated port so a regular
// `pnpm dev` session on :3000 can keep running side by side.
const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;
const TEST_DATABASE_URL = "file:./test.db";

// DB reset/seed happens in e2e/reset-test-db.ts (chained in the test:e2e
// script) rather than globalSetup: Playwright boots the webServer before
// globalSetup runs, and the server must find a seeded DB immediately.
export default defineConfig({
  testDir: "./e2e",
  // Single worker: the three flows mutate the shared SQLite test DB and the
  // dev server compiles pages on demand — serial keeps runs deterministic.
  fullyParallel: false,
  workers: 1,
  retries: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: `pnpm exec next dev --turbopack --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      AUTH_URL: BASE_URL,
    },
  },
});
