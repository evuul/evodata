// Regression tests for the valuation signal buyback support.
import assert from "node:assert/strict";
import test from "node:test";
import { computeValuationSignal } from "./valuationSignal.js";

const reports = [
  { year: 2025, quarter: "Q1", adjustedEarningsPerShare: 10, ocfPerShare: 12, adjustedEBITDA: 500, operatingRevenues: 500, cashAndCashEquivalents: 1000, equityPerShare: 20, adjustedEBITDAMargin: 59, asia: 100 },
  { year: 2025, quarter: "Q2", adjustedEarningsPerShare: 10, ocfPerShare: 12, adjustedEBITDA: 500, operatingRevenues: 500, cashAndCashEquivalents: 1000, equityPerShare: 20, adjustedEBITDAMargin: 59, asia: 100 },
  { year: 2025, quarter: "Q3", adjustedEarningsPerShare: 10, ocfPerShare: 12, adjustedEBITDA: 500, operatingRevenues: 500, cashAndCashEquivalents: 1000, equityPerShare: 20, adjustedEBITDAMargin: 59, asia: 100 },
  { year: 2025, quarter: "Q4", adjustedEarningsPerShare: 10, ocfPerShare: 12, adjustedEBITDA: 500, operatingRevenues: 500, cashAndCashEquivalents: 1000, equityPerShare: 20, adjustedEBITDAMargin: 59, asia: 100 },
  { year: 2026, quarter: "Q1", adjustedEarningsPerShare: 10, ocfPerShare: 12, adjustedEBITDA: 500, operatingRevenues: 550, cashAndCashEquivalents: 1000, equityPerShare: 20, adjustedEBITDAMargin: 59, asia: 105 },
  { year: 2026, quarter: "Q2", adjustedEarningsPerShare: 10, ocfPerShare: 12, adjustedEBITDA: 500, operatingRevenues: 550, cashAndCashEquivalents: 1000, equityPerShare: 20, adjustedEBITDAMargin: 59, asia: 106 },
  { year: 2026, quarter: "Q3", adjustedEarningsPerShare: 10, ocfPerShare: 12, adjustedEBITDA: 500, operatingRevenues: 550, cashAndCashEquivalents: 1000, equityPerShare: 20, adjustedEBITDAMargin: 59, asia: 107 },
  { year: 2026, quarter: "Q4", adjustedEarningsPerShare: 10, ocfPerShare: 12, adjustedEBITDA: 500, operatingRevenues: 550, cashAndCashEquivalents: 1000, equityPerShare: 20, adjustedEBITDAMargin: 59, asia: 108 },
];

const sharesData = [{ date: "2026-04-30", sharesOutstanding: 200 }];

test("buyback mandate contributes to valuation signal metrics and score", () => {
  const signal = computeValuationSignal({
    reports,
    currentPriceSEK: 100,
    marketCapSEK: 100 * 200_000_000,
    fxRate: 1,
    sharesData,
    buybackMandateCashEUR: 2_000_000_000,
  });

  assert.equal(signal.ok, true);
  assert.equal(signal.buybackSupportPoints, 4);
  assert.ok(Math.abs((signal.metrics.buybackMandateYieldPct ?? 0) - 10) < 0.0001);
  assert.ok(Math.abs((signal.metrics.buybackBoostPct ?? 0) - 11.1111111111) < 0.01);
  assert.ok(signal.score >= signal.baseScore);
});
