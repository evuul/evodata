// Verifies that dashboard panels request only the datasets they render.

import assert from "node:assert/strict";
import test from "node:test";

import { getDashboardPanelDataKeys } from "./dashboardPanelData.js";

test("operational panels do not preload unrelated static analysis datasets", () => {
  for (const panel of ["live", "extended", "releases", "calendar", "short", "money", "faq"]) {
    assert.deepEqual(getDashboardPanelDataKeys(panel), [], panel);
  }
});

test("financial panels load only their required datasets", () => {
  assert.deepEqual(getDashboardPanelDataKeys("financial"), ["financialReports", "dividendData"]);
  assert.deepEqual(getDashboardPanelDataKeys("gameshow"), ["financialReports", "averagePlayersData"]);
  assert.deepEqual(getDashboardPanelDataKeys("report"), ["financialReports"]);
  assert.deepEqual(getDashboardPanelDataKeys("buybacks"), ["financialReports", "dividendData"]);
  assert.deepEqual(getDashboardPanelDataKeys("fairvalue"), ["financialReports", "buybackData", "sharesData"]);
});

test("capital allocation adds buyback and share history only when selected", () => {
  assert.deepEqual(getDashboardPanelDataKeys("cash", "cash"), ["financialReports"]);
  assert.deepEqual(getDashboardPanelDataKeys("cash", "allocation"), [
    "financialReports",
    "dividendData",
    "buybackData",
    "sharesData",
  ]);
});
