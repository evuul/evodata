// Verifies quarterly annualization and payout scenarios for forward dividends.

import assert from "node:assert/strict";
import test from "node:test";
import { buildAnnualizedDividendProjection } from "./dividendProjection.js";

test("annualizes Q1 and Q2 profit into 25, 50 and 75 percent payout scenarios", () => {
  const projection = buildAnnualizedDividendProjection({
    reports: [
      { year: 2025, quarter: "Q4", adjustedProfitForPeriod: 200 },
      { year: 2026, quarter: "Q1", adjustedProfitForPeriod: 250 },
      { year: 2026, quarter: "Q2", adjustedProfitForPeriod: 260 },
    ],
    sharesOutstandingMillions: 200,
    fxRate: 10,
    portfolioShares: 1_000,
  });

  assert.equal(projection.sourceYear, 2026);
  assert.equal(projection.latestQuarter, "Q2");
  assert.equal(projection.reportedQuarters, 2);
  assert.equal(projection.targetYear, 2027);
  assert.equal(projection.ytdAdjustedProfitEur, 510);
  assert.equal(projection.annualizedAdjustedProfitEur, 1_020);
  assert.deepEqual(
    projection.scenarios.map(({ payoutRatio, dividendPerShare, cash }) => ({
      payoutRatio,
      dividendPerShare,
      cash,
    })),
    [
      { payoutRatio: 0.25, dividendPerShare: 12.75, cash: 12_750 },
      { payoutRatio: 0.5, dividendPerShare: 25.5, cash: 25_500 },
      { payoutRatio: 0.75, dividendPerShare: 38.25, cash: 38_250 },
    ]
  );
});

test("uses reported full-year profit without additional annualization after Q4", () => {
  const projection = buildAnnualizedDividendProjection({
    reports: [
      { year: 2026, quarter: "Q1", adjustedProfitForPeriod: 100 },
      { year: 2026, quarter: "Q2", adjustedProfitForPeriod: 110 },
      { year: 2026, quarter: "Q3", adjustedProfitForPeriod: 120 },
      { year: 2026, quarter: "Q4", adjustedProfitForPeriod: 130 },
    ],
    sharesOutstandingMillions: 100,
    fxRate: 10,
    portfolioShares: 10,
  });

  assert.equal(projection.annualizedAdjustedProfitEur, 460);
  assert.equal(projection.scenarios[1].dividendPerShare, 23);
});

test("does not project from a year with a missing earlier quarter or invalid assumptions", () => {
  const reports = [
    { year: 2026, quarter: "Q2", adjustedProfitForPeriod: 250 },
    { year: 2025, quarter: "Q1", adjustedProfitForPeriod: 200 },
  ];

  const fallback = buildAnnualizedDividendProjection({
    reports,
    sharesOutstandingMillions: 100,
    fxRate: 10,
  });
  assert.equal(fallback.sourceYear, 2025);
  assert.equal(fallback.latestQuarter, "Q1");

  assert.equal(
    buildAnnualizedDividendProjection({ reports, sharesOutstandingMillions: 0, fxRate: 10 }),
    null
  );
  assert.equal(
    buildAnnualizedDividendProjection({ reports, sharesOutstandingMillions: 100, fxRate: null }),
    null
  );
});
