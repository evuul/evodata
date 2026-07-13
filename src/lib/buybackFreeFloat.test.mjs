// Regression tests for the indicative free-float calculation.
import assert from "node:assert/strict";
import test from "node:test";
import {
  buildShareholderRows,
  calculateBuybackPctOfFreeFloat,
  calculateIndicativeFreeFloat,
  calculateShareholderOverview,
} from "./buybackFreeFloat.js";

test("calculates free float after treasury shares and excluded strategic owners", () => {
  const result = calculateIndicativeFreeFloat({
    totalShares: 200_000_000,
    companyTreasuryShares: 5_000_000,
    excludedOwners: [
      { name: "Dart", shares: 50_000_000, excludeFromStrategicFloat: true },
      { name: "Österbahr", shares: 20_000_000, excludeFromStrategicFloat: true },
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

test("builds ownership changes from a previous snapshot", () => {
  const [row] = buildShareholderRows({
    totalShares: 100,
    owners: [{ id: "dart", name: "Dart", shares: 60 }],
    previousOwners: [{ id: "dart", shares: 55 }],
  });

  assert.equal(row.changeShares, 5);
  assert.equal(row.changePctPoints, 5);
});

test("keeps non-strategic named owners in the adjusted share base", () => {
  const result = calculateShareholderOverview({
    totalShares: 100,
    companyTreasuryShares: 5,
    owners: [
      { id: "dart", shares: 50, excludeFromStrategicFloat: true },
      { id: "fund", shares: 20, excludeFromStrategicFloat: false },
    ],
  });

  assert.equal(result.freeFloat.freeFloatShares, 45);
  assert.equal(result.otherShares, 25);
});
