// Checks the equity valuation controls and missing report inputs with mocked APIs.

import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

const testUser = { email: "browser-test@example.com", firstName: "Test", lastName: "User", isSubscriber: false, isAdmin: false, profile: { shares: 0, avgCost: 0 } };

async function mockApis(page) {
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/session") return route.fulfill({ json: { authenticated: true, user: testUser } });
    return route.fulfill({ json: { items: [], data: [], games: [], current: [], latest: [], totalPercent: 0 } });
  });
}

test("fair value margin controls update DCF and retain the versioned custom scenario", async ({ page }, testInfo) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await mockApis(page);
  await page.goto("/?panel=fairvalue");
  await expect(page.getByText("Modell v3 · FCFE", { exact: true })).toBeVisible();
  await expect(page.getByTestId("terminal-share")).toContainText(/\d/);
  await expect(page.getByText(/inte ett statistiskt konfidensintervall/)).toBeVisible();
  await page.getByRole("button", { name: "Eget scenario", exact: true }).click();
  const margin = page.getByRole("slider", { name: "Rörelsemarginal", exact: true });
  await margin.focus();
  await margin.press("Home");
  const low = await page.getByTestId("dcf-value").innerText();
  await margin.press("End");
  await expect(page.getByTestId("dcf-value")).not.toHaveText(low);
  await expect(margin).toHaveValue("75");
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('evodata.valuation.custom-scenario.v3') ?? '{}').margin)).toBe(75);
  await page.reload();
  await page.getByRole("button", { name: "Eget scenario", exact: true }).click();
  await expect(margin).toHaveValue("75");
  await expect(page.getByRole("slider", { name: "Avkastningskrav i EUR (eget kapital)", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.getByRole("button", { name: "Återställ till bas", exact: true }).click();
  await expect(margin).not.toHaveValue("75");
  await page.screenshot({ path: testInfo.outputPath("fair-value-v3.png"), fullPage: true });
  expect(errors).toEqual([]);
});

test("restated reports without verified cash-flow inputs show a data warning", async ({ page }) => {
  await mockApis(page);
  const payload = JSON.parse(await readFile(new URL("../../src/app/data/financialReports.json", import.meta.url), "utf8"));
  payload.financialReports = payload.financialReports.map(({ valuationInputs, ...report }, index, reports) => ({
    ...report, adjustedProfitForPeriod: report.adjustedProfitForPeriod + (index === reports.length - 1 ? 1 : 0),
  }));
  await page.route("**/api/financial-reports**", (route) => route.fulfill({ json: payload }));
  await page.goto("/?panel=fairvalue");
  await expect(page.getByText(/Modellen kan inte beräknas/)).toBeVisible();
  await expect(page.getByText(/Verifierat kassaflödesunderlag saknas/)).toBeVisible();
  await expect(page.getByTestId("dcf-value")).toHaveCount(0);
});
