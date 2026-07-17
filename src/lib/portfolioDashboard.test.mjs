// Verifies the personal portfolio dashboard calculations and timeline.

import test from "node:test";
import assert from "node:assert/strict";
import {
  buildOwnershipImpact,
  buildPortfolioTimeline,
  buildReturnBreakdown,
  calculateReturnBarWidthPct,
} from "./portfolioDashboard.js";

test("buildReturnBreakdown separates price return and dividends", () => {
  const result = buildReturnBreakdown({ totalCost: 100_000, totalValue: 118_000, dividendsReceived: 7_000 });
  assert.equal(result.investedCapital, 100_000);
  assert.equal(result.marketValue, 118_000);
  assert.equal(result.marketReturn, 18_000);
  assert.equal(result.dividends, 7_000);
  assert.equal(result.totalReturn, 25_000);
  assert.equal(result.marketReturnPct, 18);
  assert.ok(Math.abs(result.dividendReturnPct - 7) < 1e-9);
  assert.equal(result.totalReturnPct, 25);
});

test("buildReturnBreakdown handles an empty portfolio safely", () => {
  const result = buildReturnBreakdown({ totalCost: 0, totalValue: 0, dividendsReceived: -20 });
  assert.equal(result.totalReturn, 0);
  assert.equal(result.totalReturnPct, null);
});

test("calculateReturnBarWidthPct scales contributions against invested capital", () => {
  assert.ok(Math.abs(calculateReturnBarWidthPct({ value: -337_586, investedCapital: 1_320_266 }) - 25.5695) < 0.0001);
  assert.ok(Math.abs(calculateReturnBarWidthPct({ value: 73_118, investedCapital: 1_320_266 }) - 5.5381) < 0.0001);
});

test("calculateReturnBarWidthPct handles empty and above-capital values safely", () => {
  assert.equal(calculateReturnBarWidthPct({ value: 100, investedCapital: 0 }), 0);
  assert.equal(calculateReturnBarWidthPct({ value: 250, investedCapital: 100 }), 100);
  assert.equal(calculateReturnBarWidthPct({ value: null, investedCapital: 100 }), 0);
});

test("buildPortfolioTimeline combines eligible dividends and transactions", () => {
  const result = buildPortfolioTimeline({
    transactions: [
      { type: "buy", date: "2024-01-10", shares: 100, price: 800 },
      { type: "buy", date: "2025-05-12", shares: 50, price: 700 },
    ],
    historicalDividends: [
      { exDate: "2024-04-29", paymentDate: "2024-05-08", dividendPerShare: 30 },
      { exDate: "2025-05-12", paymentDate: "2025-05-20", dividendPerShare: 32 },
    ],
    calendarEvents: [{ id: "q3", date: "2026-10-23", titleSv: "Q3" }],
    todayYmd: "2026-07-16",
  });

  assert.equal(result.source, "transactions");
  assert.equal(result.upcoming[0].id, "q3");
  assert.equal(result.history.find((item) => item.exDate === "2025-05-12").cash, 3_200);
});

test("buildPortfolioTimeline falls back to dated lots", () => {
  const result = buildPortfolioTimeline({
    lots: [{ date: "2023-01-01", shares: 25, price: 900 }],
    historicalDividends: [{ exDate: "2024-04-29", dividendPerShare: 30 }],
    todayYmd: "2025-01-01",
  });

  assert.equal(result.source, "lots");
  assert.equal(result.history[0].cash, 750);
});

test("buildOwnershipImpact expresses the lift as equivalent shares", () => {
  const result = buildOwnershipImpact({ shares: 1_000, ownershipLiftPct: 1.8 });
  assert.ok(Math.abs(result.equivalentExtraShares - 18) < 1e-9);
  assert.equal(buildOwnershipImpact({ shares: 1_000, ownershipLiftPct: null }).equivalentExtraShares, null);
});
