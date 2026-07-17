// Verifies the latest quarterly report snapshot against Evolution's published figures.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const data = JSON.parse(
  readFileSync(new URL("../app/data/financialReports.json", import.meta.url), "utf8"),
);
const shareSnapshots = JSON.parse(
  readFileSync(new URL("../app/data/amountOfShares.json", import.meta.url), "utf8"),
);
const buybacks = JSON.parse(
  readFileSync(new URL("../app/data/buybackData.json", import.meta.url), "utf8"),
);
const reports = data.financialReports;
const latest = reports.at(-1);

function assertClose(actual, expected, tolerance = 0.000001) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  );
}

test("Q2 2026 contains the published headline and per-share figures", () => {
  assert.deepEqual(
    {
      period: `${latest.quarter} ${latest.year}`,
      revenue: latest.operatingRevenues,
      ebitda: latest.adjustedEBITDA,
      ebitdaMargin: latest.adjustedEBITDAMargin,
      operatingProfit: latest.adjustedOperatingProfit,
      operatingMargin: latest.adjustedOperatingMargin,
      profit: latest.adjustedProfitForPeriod,
      profitMargin: latest.adjustedProfitMargin,
      earningsPerShare: latest.adjustedEarningsPerShare,
      equityPerShare: latest.equityPerShare,
      operatingCashFlowPerShare: latest.ocfPerShare,
    },
    {
      period: "Q2 2026",
      revenue: 517.791,
      ebitda: 340.987,
      ebitdaMargin: 65.9,
      operatingProfit: 297.782,
      operatingMargin: 57.5,
      profit: 251.437,
      profitMargin: 48.6,
      earningsPerShare: 1.27,
      equityPerShare: 21.82,
      operatingCashFlowPerShare: 1.49,
    },
  );
});

test("Q2 2026 product and geographic revenue reconcile with total revenue", () => {
  assertClose(latest.liveCasino + latest.rng, latest.operatingRevenues);

  const geographicRevenue =
    latest.europe +
    latest.asia +
    latest.northAmerica +
    latest.latAm +
    latest.other;

  assertClose(geographicRevenue, latest.operatingRevenues, 0.01);
  assert.equal(latest.regulatedMarket, 49);
});

test("Q2 2026 cash and cash-flow figures preserve quarter continuity", () => {
  const previous = reports.at(-2);

  assert.equal(latest.cashStart, previous.cashEnd);
  assert.equal(latest.cashEnd, 1153.539);
  assert.equal(latest.cashAndCashEquivalents, latest.cashEnd);
  assert.equal(latest.operatingCashFlow, 293.044);
  assert.equal(latest.investingCashFlow, 66.282);
  assert.equal(latest.financingCashFlow, -304.389);
  assert.equal(latest.buybacksCashFlow, -303.21);
  assertClose(
    latest.freeCashFlow,
    latest.operatingCashFlow + latest.investingCashFlow,
  );
});

test("Q2 2026 share snapshot reconciles with reported buybacks", () => {
  const previousSnapshot = shareSnapshots.at(-2);
  const latestSnapshot = shareSnapshots.at(-1);
  const quarterBuybacks = buybacks.filter(
    (row) => row.Datum >= "2026-05-19" && row.Datum <= "2026-06-30",
  );
  const repurchasedShares = quarterBuybacks.reduce(
    (sum, row) => sum + row.Antal_aktier,
    0,
  );

  assert.deepEqual(latestSnapshot, {
    date: "2026-06-30",
    sharesOutstanding: 194.085085,
  });
  assert.equal(repurchasedShares, 5_141_528);
  assertClose(
    previousSnapshot.sharesOutstanding - repurchasedShares / 1_000_000,
    latestSnapshot.sharesOutstanding,
  );
});
