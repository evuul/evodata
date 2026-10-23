// Verifies Q3 report publication, documented forecast errors and Q4 calibration.

import { test, expect } from "@playwright/test";

const testUser = { email: "browser-test@example.com", firstName: "Test", lastName: "User", isSubscriber: false, isAdmin: false, profile: { shares: 0, avgCost: 0 } };

async function mockApis(page, { signedIn = false } = {}) {
  let authenticated = signedIn;
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.startsWith("/api/calendar/")) return route.continue();
    if (path === "/api/auth/session") return route.fulfill({ json: { authenticated, user: authenticated ? testUser : null } });
    if (path === "/api/auth/login" || path === "/api/auth/register") {
      authenticated = true;
      return route.fulfill({ json: { user: testUser } });
    }
    if (path === "/api/extended-lobby") return route.fulfill({ status: 503, json: { error: "Test service unavailable" } });
    return route.fulfill({ json: { items: [], data: [], games: [], current: [], latest: [], totalPercent: 0 } });
  });
}

test("Q3 report exposes the published data and downloadable source", async ({ page, request }) => {
  await mockApis(page, { signedIn: true });
  await page.goto("/?panel=report");
  await expect(page.getByRole("heading", { name: "Senaste rapportdata för Q3 2026", exact: true })).toBeVisible();
  const pdfLink = page.getByRole("link", { name: "Läs rapporten (PDF)", exact: true });
  await expect(pdfLink).toHaveAttribute("href", "/reports/evo-q3-2026-swe-2026-10-23-final.pdf");
  const pdf = await request.get(await pdfLink.getAttribute("href"));
  expect(pdf.ok()).toBeTruthy();
  expect(pdf.headers()["content-type"]).toContain("application/pdf");
});

test("forecast preserves the Q3 estimate and moves the calibrated model to Q4", async ({ page }, testInfo) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.clock.install({ time: new Date("2026-10-23T08:00:00Z") });
  await mockApis(page, { signedIn: true });
  await page.route("**/api/auth/session", (route) => route.fulfill({ json: { authenticated: true, user: { ...testUser, isSubscriber: true } } }));
  const forecastDailyTotals = Array.from({ length: 22 }, (_, index) => ({
    date: `2026-10-${String(index + 1).padStart(2, "0")}`, avgPlayers: 76440,
  }));
  await page.route("**/api/casinoscores/lobby/overview**", (route) => route.fulfill({ json: { forecastDailyTotals, generatedAt: "2026-10-22T22:00:27.768Z" } }));
  await page.goto("/?panel=gameshow");
  const outcome = page.getByRole("region", { name: "Prognos mot utfall", exact: true });
  await expect(outcome).toBeVisible();
  await expect(outcome).toContainText("564,8 MEUR");
  await expect(outcome).toContainText("526,125 MEUR");
  await expect(outcome).toContainText("+7.35%");
  await expect(outcome).toContainText("+8.75%");
  await expect(outcome).toContainText("-0.10%");
  await expect(page.getByText("Q4 2026", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/500,2/).first()).toBeVisible();
  await expect(page.getByText("Q1 2026", { exact: true })).toBeVisible();
  await expect(outcome).toContainText("88/92 dagar");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.screenshot({ path: testInfo.outputPath("q3-forecast-outcome.png"), fullPage: true });
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.getByRole("region", { name: "Forecast versus actual", exact: true })).toContainText("+7.35%");
  expect(errors).toEqual([]);
});
