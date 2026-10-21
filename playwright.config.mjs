// Runs deterministic browser checks against a separate local Next development server.

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3100",
    locale: "sv-SE",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], locale: "sv-SE" } },
    { name: "mobile", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium", locale: "sv-SE" } },
  ],
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    timeout: 120_000,
    env: { NEXT_PUBLIC_API_BASE_URL: "", NEXT_PUBLIC_AUTH_DISABLED: "false" },
  },
});
