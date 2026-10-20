import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration — activated by roadmap task P4.1 (the repo's first
 * browser tests), satisfying the global requirement §5 #3: every UI change
 * gets a browser check with a minimum of Chromium + Firefox.
 *
 * - Test files are named `*.e2e.ts` (testMatch below). This is deliberate:
 *   Vitest's default include matches `*.spec.ts`/`*.test.ts`, which would
 *   make `npm run test` try to execute browser tests — `*.e2e.ts` keeps the
 *   two runners disjoint without touching any existing test configuration.
 * - The web server is the dev server on a dedicated port. `npm run verify`
 *   already proves the production build; these checks target routing,
 *   direction switching, and focus behavior, which the dev server serves
 *   identically for the shell.
 * - `reuseExistingServer` lets a manually started dev server be reused so
 *   repeated runs stay fast; a fresh run starts its own.
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    viewport: { width: 1280, height: 720 },
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
  ],
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
