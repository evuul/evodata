// Regression tests for buyback ownership helpers.
import assert from "node:assert/strict";
import test from "node:test";
import { computeCurrentBuybackProgramSummary, computeFullBuybackMandateSummary } from "./buybackOwnership.js";

test("full mandate summary increases ownership using current price and shares", () => {
  const result = computeFullBuybackMandateSummary({
    profileShares: 1_000,
    currentPriceSEK: 100,
    fxRate: 1,
    sharesData: [{ date: "2026-04-30", sharesOutstanding: 200 }],
    dividendsReceived: 250,
    totalValue: 500_000,
  });

  assert.ok(result);
  assert.equal(result.mandateSek, 2_000_000_000);
  assert.equal(result.currentOutstanding, 200_000_000);
  assert.equal(result.repurchasedShares, 20_000_000);
  assert.equal(result.postBuybackOutstanding, 180_000_000);
});

test("full mandate summary still returns program metrics without holdings", () => {
  const result = computeFullBuybackMandateSummary({
    profileShares: 0,
    currentPriceSEK: 100,
    fxRate: 1,
    sharesData: [{ date: "2026-04-30", sharesOutstanding: 200 }],
    dividendsReceived: 0,
    totalValue: 0,
  });

  assert.ok(result);
  assert.equal(result.hasHoldings, false);
  assert.equal(result.buybackYieldPct, 10);
  assert.equal(result.ownershipBefore, null);
  assert.equal(result.ownershipAfter, null);
});

test("current program summary values completed mandate buybacks as if cancelled", () => {
  const result = computeCurrentBuybackProgramSummary({
    profileShares: 1_000,
    buybackRows: [
      { Datum: "2026-05-16", Antal_aktier: 50_000, Transaktionsvärde: 35_000_000 },
      { Datum: "2026-05-19", Antal_aktier: 100_000, Transaktionsvärde: 70_000_000 },
      { Datum: "2026-05-20", Antal_aktier: 150_000, Transaktionsvärde: 105_000_000 },
    ],
    sharesData: [{ date: "2026-04-30", sharesOutstanding: 200 }],
    dividendsReceived: 250,
    totalValue: 500_000,
  });

  assert.ok(result);
  assert.equal(result.repurchasedShares, 250_000);
  assert.equal(result.buybackSpend, 175_000_000);
  assert.equal(result.currentOutstanding, 200_000_000);
  assert.equal(result.postBuybackOutstanding, 199_750_000);
  assert.ok(Math.abs(result.buybackBenefit - 875) < 0.000001);
  assert.ok(Math.abs(result.totalShareholderReturn - 1_125) < 0.000001);
  assert.ok(Math.abs(result.ownershipLiftPct - 0.1251564455) < 0.000001);
});
