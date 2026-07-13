// Regression tests for the indicative free-float calculation.
import assert from "node:assert/strict";
import test from "node:test";
import { calculateBuybackPctOfFreeFloat, calculateIndicativeFreeFloat } from "./buybackFreeFloat.js";

test("calculates free float after treasury shares and excluded strategic owners", () => {
  const result = calculateIndicativeFreeFloat({
    totalShares: 200_000_000,
    companyTreasuryShares: 5_000_000,
    excludedOwners: [
      { name: "Dart", shares: 50_000_000 },
      { name: "Österbahr", shares: 20_000_000 },
    ],
  });

  assert.equal(result.freeFloatShares, 125_000_000);
  assert.equal(result.excludedOwnerShares, 70_000_000);
  assert.equal(result.freeFloatPct, 62.5);
});

test("returns null when free float is unavailable", () => {
  assert.equal(calculateBuybackPctOfFreeFloat(10, 0), null);
  assert.equal(calculateBuybackPctOfFreeFloat(-10, 100), null);
});
