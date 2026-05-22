// Regression tests for the hypothetical full-program buyback ownership helper.
import assert from "node:assert/strict";
import test from "node:test";
import { computeFullBuybackMandateSummary } from "./buybackOwnership.js";

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
