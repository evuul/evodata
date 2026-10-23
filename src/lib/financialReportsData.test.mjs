// Verifies the latest quarterly report snapshot against Evolution's published figures.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { normalizeValuationCashFlow, readValuationBalance, valuationSourceUrls } from "./valuationFundamentals.js";
import { computeFairValueInsights } from "./fairValueUtils.js";

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
const q2 = reports.find((report) => report.year === 2026 && report.quarter === "Q2");
const q3 = reports.at(-1);

function assertClose(actual, expected, tolerance = 0.000001) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  );
}

test("Q3 2026 contains the reported quarter rather than nine-month figures", () => {
  assert.deepEqual({
    period: `${q3.quarter} ${q3.year}`, revenue: q3.operatingRevenues,
    live: q3.liveCasino, rng: q3.rng, adjustedEBITDA: q3.adjustedEBITDA,
    ebitda: q3.ebitda, ebitdaMargin: q3.ebitdaMargin, adjustedEBITDAMargin: q3.adjustedEBITDAMargin,
    operatingProfit: q3.adjustedOperatingProfit, operatingMargin: q3.adjustedOperatingMargin,
    profit: q3.adjustedProfitForPeriod, profitMargin: q3.adjustedProfitMargin,
    eps: q3.adjustedEarningsPerShare, equity: q3.equityPerShare, ocf: q3.ocfPerShare,
    fte: q3.averageNumberOfFTEs,
  }, {
    period: "Q3 2026", revenue: 526.125, live: 443.038, rng: 83.087,
    adjustedEBITDA: 345.932, ebitda: 333.835, ebitdaMargin: 63.5, adjustedEBITDAMargin: 65.8,
    operatingProfit: 290.264, operatingMargin: 55.2, profit: 243.299, profitMargin: 46.2,
    eps: 1.31, equity: 19.78, ocf: 1.97, fte: 17.04,
  });
  assertClose(q3.liveCasino + q3.rng, q3.operatingRevenues);
  assertClose(q3.europe + q3.asia + q3.northAmerica + q3.latAm + q3.other, q3.operatingRevenues, 0.1);
  assert.equal(q3.regulatedMarket, 49);
  assert.equal(q3.Top5Customers, null);
});

test("Q3 cash flows and balance reconcile and keep the valuation model available", () => {
  assert.equal(q3.cashStart, q2.cashEnd);
  assert.equal(q3.cashEnd, 656.408);
  assert.equal(q3.cashAndCashEquivalents, q3.cashEnd);
  assertClose(q3.cashStart + q3.operatingCashFlow + q3.investingCashFlow + q3.financingCashFlow + q3.cashTranslationDifference, q3.cashEnd);
  assertClose(q3.operatingCashFlow - q3.valuationInputs.capexIntangible - q3.valuationInputs.capexTangible, q3.freeCashFlow);
  assertClose(q3.freeCashFlow, 334.061);
  assert.ok(normalizeValuationCashFlow(q3));
  assert.deepEqual(readValuationBalance(q3), { cash: 656.408, restrictedCash: 12.297, netCurrentTaxLiabilities: 411.303, financialDebtExcludingLeases: 0 });
  assert.deepEqual(valuationSourceUrls([q3]), [q3.sourceUrl]);
  assert.equal(readFileSync(new URL(`../../public${q3.sourceUrl}`, import.meta.url)).subarray(0, 4).toString(), "%PDF");
});

test("Q3 valuation inputs reconcile with the published rolling year to September 2026", () => {
  const rows = reports.slice(-4);
  const sum = (field) => rows.reduce((total, row) => total + row.valuationInputs[field], 0);
  for (const [field, expected] of Object.entries({ operatingCashFlow: 1301.602, capexIntangible: 65.85, capexTangible: 73.901, leaseRepayments: 18.751, interestReceived: 13.816, taxPaid: 94.174, taxExpense: 188.228, nonTaxableNonRecurringProfit: 51.667 })) {
    assertClose(sum(field), expected);
  }
  const shares = shareSnapshots.at(-1);
  assert.deepEqual(shares, { date: "2026-09-30", sharesOutstanding: 182.301029 });
  assert.equal(183_058_121 - 757_092, Math.round(shares.sharesOutstanding * 1_000_000));
});

test("the full valuation uses Q3 cash and avoids counting Q3 buybacks twice", () => {
  const result = computeFairValueInsights({ reports, buybackData: buybacks, sharesData: shareSnapshots, fxRate: 11, currentPriceSEK: 700 });
  assert.equal(result.dataQuality.status, "caution");
  assert.deepEqual(result.dataQuality.warnings, ["cash_below_reserve"]);
  assert.equal(result.buybackInfo.reportedShares, 182_301_029);
  assert.equal(result.buybackInfo.currentShares, 181_151_494);
  assert.equal(result.scenarios.length, 4);
  assert.ok(result.scenarios.every((scenario) => Number.isFinite(scenario.impliedPriceSEK)));
});

test("Q2 2026 contains the published headline and per-share figures", () => {
  assert.deepEqual(
    {
      period: `${q2.quarter} ${q2.year}`,
      revenue: q2.operatingRevenues,
      ebitda: q2.adjustedEBITDA,
      ebitdaMargin: q2.adjustedEBITDAMargin,
      operatingProfit: q2.adjustedOperatingProfit,
      operatingMargin: q2.adjustedOperatingMargin,
      profit: q2.adjustedProfitForPeriod,
      profitMargin: q2.adjustedProfitMargin,
      earningsPerShare: q2.adjustedEarningsPerShare,
      equityPerShare: q2.equityPerShare,
      operatingCashFlowPerShare: q2.ocfPerShare,
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

test("2024 adjusted EBITDA excludes non-recurring other operating revenue", () => {
  const q3 = reports.find((report) => report.year === 2024 && report.quarter === "Q3");
  const q4 = reports.find((report) => report.year === 2024 && report.quarter === "Q4");

  assert.deepEqual(
    [q3, q4].map(({ adjustedEBITDA, adjustedEBITDAMargin }) => ({
      adjustedEBITDA,
      adjustedEBITDAMargin,
    })),
    [
      { adjustedEBITDA: 355.607, adjustedEBITDAMargin: 68.5 },
      { adjustedEBITDA: 363.557, adjustedEBITDAMargin: 68.1 },
    ],
  );
});

test("Q2 2026 product and geographic revenue reconcile with total revenue", () => {
  assertClose(q2.liveCasino + q2.rng, q2.operatingRevenues);

  const geographicRevenue =
    q2.europe +
    q2.asia +
    q2.northAmerica +
    q2.latAm +
    q2.other;

  assertClose(geographicRevenue, q2.operatingRevenues, 0.01);
  assert.equal(q2.regulatedMarket, 49);
});

test("Q2 2026 cash and cash-flow figures preserve quarter continuity", () => {
  const previous = reports.find((report) => report.year === 2026 && report.quarter === "Q1");

  assert.equal(q2.cashStart, previous.cashEnd);
  assert.equal(q2.cashEnd, 1153.539);
  assert.equal(q2.cashAndCashEquivalents, q2.cashEnd);
  assert.equal(q2.operatingCashFlow, 293.044);
  assert.equal(q2.investingCashFlow, 66.282);
  assert.equal(q2.financingCashFlow, -304.389);
  assert.equal(q2.buybacksCashFlow, -303.21);
  assertClose(
    q2.freeCashFlow,
    q2.valuationInputs.operatingCashFlow - q2.valuationInputs.capexIntangible - q2.valuationInputs.capexTangible,
  );
});

test("Q2 2026 share snapshot reconciles with reported buybacks", () => {
  const previousSnapshot = shareSnapshots.find((row) => row.date === "2026-04-30");
  const latestSnapshot = shareSnapshots.find((row) => row.date === "2026-06-30");
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


test("valuation cash-flow inputs reconcile with the published rolling year to June 2026", () => {
  const rows = reports.slice(reports.indexOf(q2) - 3, reports.indexOf(q2) + 1);
  const sum = (field) => rows.reduce((total, row) => total + row.valuationInputs[field], 0);
  assertClose(sum('operatingCashFlow'), 1307.429);
  assertClose(sum('capexIntangible'), 65.916);
  assertClose(sum('capexTangible'), 71.582);
  assertClose(sum('leaseRepayments'), 19.028);
  assertClose(sum('interestReceived'), 12.841);
  assertClose(sum('taxPaid'), 95.998);
  assertClose(sum('taxExpense'), 188.212);
  assertClose(sum('nonTaxableNonRecurringProfit'), 51.667);
  assertClose(q2.freeCashFlow, 258.365);
  assert.ok(rows.every((row) => row.valuationInputs.sourceUrls.every((url) => url.startsWith('https://'))));
});
