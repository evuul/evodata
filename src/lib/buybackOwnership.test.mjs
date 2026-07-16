// Regression tests for the hypothetical full-program buyback ownership helper.
import assert from "node:assert/strict";
import test from "node:test";
import {
  computeFullBuybackMandateSummary,
  computePersonalCurrentProgramSummary,
} from "./buybackOwnership.js";

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
  assert.equal(result.illustrativeBuybackAllocation, 10_000);
  assert.equal(result.dividendIncome, 250);
  assert.equal(result.dividendIncomePct, 0.05);
  assert.equal("totalShareholderReturn" in result, false);
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

test("personal summary only includes executions in the current program", () => {
  const result = computePersonalCurrentProgramSummary({
    profileShares: 1_000,
    lots: [{ shares: 1_000, date: "2025-01-10" }],
    sharesData: [{ date: "2026-04-30", sharesOutstanding: 200 }],
    buybackData: [
      { Datum: "2025-02-11", Antal_aktier: 2_000_000, Transaktionsvärde: 200_000_000 },
      { Datum: "2026-05-19", Antal_aktier: 1_000_000, Transaktionsvärde: 100_000_000 },
      { Datum: "2026-05-21", Antal_aktier: 1_000_000, Transaktionsvärde: 100_000_000 },
    ],
  });

  assert.ok(result);
  assert.equal(result.repurchasedShares, 2_000_000);
  assert.equal(result.currentOutstanding, 198_000_000);
  assert.equal(result.benefitedShares, 1_000);
  assert.ok(Math.abs(result.ownershipLiftPct - (200 / 198 - 1) * 100) < 1e-9);
  assert.ok(Math.abs(result.equivalentExtraShares - 1_000 * (200 / 198 - 1)) < 1e-9);
});

test("personal summary applies buybacks after each current lot purchase", () => {
  const result = computePersonalCurrentProgramSummary({
    profileShares: 1_000,
    lots: [
      { shares: 600, date: "2026-01-10" },
      { shares: 400, date: "2026-05-20" },
    ],
    sharesData: [{ date: "2026-04-30", sharesOutstanding: 200 }],
    buybackData: [
      { Datum: "2026-05-19", Antal_aktier: 1_000_000, Transaktionsvärde: 100_000_000 },
      { Datum: "2026-05-21", Antal_aktier: 1_000_000, Transaktionsvärde: 100_000_000 },
    ],
  });

  const expectedEquivalentShares =
    600 * (200 / 198 - 1) +
    400 * (199 / 198 - 1);
  assert.ok(result);
  assert.equal(result.traceableShares, 1_000);
  assert.equal(result.benefitedShares, 1_000);
  assert.ok(Math.abs(result.equivalentExtraShares - expectedEquivalentShares) < 1e-9);
  assert.ok(Math.abs(result.ownershipLiftPct - (expectedEquivalentShares / 1_000) * 100) < 1e-9);
});

test("personal summary does not invent an effect without purchase dates", () => {
  const result = computePersonalCurrentProgramSummary({
    profileShares: 1_000,
    sharesData: [{ date: "2026-04-30", sharesOutstanding: 200 }],
    buybackData: [
      { Datum: "2026-05-19", Antal_aktier: 1_000_000, Transaktionsvärde: 100_000_000 },
    ],
  });

  assert.ok(result);
  assert.equal(result.traceableShares, 0);
  assert.equal(result.benefitedShares, 0);
  assert.equal(result.ownershipLiftPct, null);
  assert.equal(result.equivalentExtraShares, null);
});

test("personal summary excludes buybacks made on the same day as a purchase", () => {
  const result = computePersonalCurrentProgramSummary({
    profileShares: 1_000,
    lots: [{ shares: 1_000, date: "2026-05-19" }],
    sharesData: [{ date: "2026-04-30", sharesOutstanding: 200 }],
    buybackData: [
      { Datum: "2026-05-19", Antal_aktier: 1_000_000, Transaktionsvärde: 100_000_000 },
    ],
  });

  assert.ok(result);
  assert.equal(result.benefitedShares, 0);
  assert.equal(result.ownershipLiftPct, 0);
  assert.equal(result.equivalentExtraShares, 0);
});

test("full mandate scenario subtracts completed spend before projecting the remainder", () => {
  const actual = computePersonalCurrentProgramSummary({
    profileShares: 1_000,
    lots: [{ shares: 1_000, date: "2026-01-10" }],
    sharesData: [{ date: "2026-04-30", sharesOutstanding: 200 }],
    buybackData: [
      { Datum: "2026-05-19", Antal_aktier: 1_000_000, Transaktionsvärde: 100_000_000 },
    ],
  });
  const result = computeFullBuybackMandateSummary({
    profileShares: 1_000,
    currentPriceSEK: 100,
    fxRate: 1,
    sharesData: [{ date: "2026-04-30", sharesOutstanding: 200 }],
    buybackData: [
      { Datum: "2026-05-19", Antal_aktier: 1_000_000, Transaktionsvärde: 100_000_000 },
    ],
    personalActualSummary: actual,
  });

  assert.ok(result);
  assert.equal(result.remainingMandateSek, 1_900_000_000);
  assert.equal(result.futureRepurchasedShares, 19_000_000);
  assert.equal(result.repurchasedShares, 20_000_000);
  assert.equal(result.postBuybackOutstanding, 180_000_000);
  assert.ok(Math.abs(result.ownershipLiftPct - (200 / 180 - 1) * 100) < 1e-9);
});
