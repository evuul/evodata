// Regression tests for the indicative free-float calculation.
import assert from "node:assert/strict";
import test from "node:test";
import {
  FREE_FLOAT_OWNER_ASSUMPTIONS,
  buildShareholderRows,
  calculateBuybackPctOfFreeFloat,
  calculateIndicativeFreeFloat,
  calculateShareholderOverview,
  buildInsiderOwnershipTrend,
} from "./buybackFreeFloat.js";

test("keeps Candle Lake's flagged holding in the ownership list", () => {
  const candleLake = FREE_FLOAT_OWNER_ASSUMPTIONS.find((owner) => owner.id === "dart");

  assert.deepEqual(
    { shares: candleLake?.shares, holdingDate: candleLake?.holdingDate },
    { shares: 59_798_619, holdingDate: "2026-07-24" }
  );
});

test("keeps Richard Livingstone's current holding separate from the previous snapshot", () => {
  const current = FREE_FLOAT_OWNER_ASSUMPTIONS.find((owner) => owner.id === "richard-livingstone");
  const [row] = buildShareholderRows({
    totalShares: 199_226_613,
    owners: current ? [current] : [],
    previousOwners: [{ id: "richard-livingstone", shares: 4_056_678 }],
    previousTotalShares: 199_226_613,
  });

  assert.deepEqual(
    { shares: current?.shares, holdingDate: current?.holdingDate },
    { shares: 3_794_978, holdingDate: "2026-07-29" }
  );
  assert.equal(row.changeShares, -261_700);
});

test("uses the latest shareholder snapshot for institutional and pension owners", () => {
  const current = new Map(FREE_FLOAT_OWNER_ASSUMPTIONS.map((owner) => [owner.id, owner]));

  assert.deepEqual(
    [
      current.get("capital-group"),
      current.get("blackrock"),
      current.get("vanguard"),
      current.get("avanza-pension"),
      current.get("futur-pension"),
      current.get("henric-wiman"),
      current.get("avanza-fonder"),
    ].map((owner) => ({ id: owner?.id, shares: owner?.shares, holdingDate: owner?.holdingDate })),
    [
      { id: "capital-group", shares: 8_881_653, holdingDate: "2026-06-30" },
      { id: "blackrock", shares: 6_340_096, holdingDate: "2026-07-31" },
      { id: "vanguard", shares: 5_424_981, holdingDate: "2026-06-30" },
      { id: "avanza-pension", shares: 1_935_448, holdingDate: "2026-07-29" },
      { id: "futur-pension", shares: 1_762_611, holdingDate: "2026-07-29" },
      { id: "henric-wiman", shares: 1_708_776, holdingDate: "2026-07-29" },
      { id: "avanza-fonder", shares: 1_677_678, holdingDate: "2026-07-31" },
    ],
  );
});

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
    previousTotalShares: 100,
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

test("tracks company treasury as a named owner without double-counting free float", () => {
  const result = calculateShareholderOverview({
    totalShares: 100,
    companyTreasuryShares: 15,
    owners: [{ id: "evolution-treasury", name: "Evolution AB (egna aktier)", shares: 15 }],
    previousOwners: [{ id: "evolution-treasury", shares: 10 }],
    previousTotalShares: 100,
  });

  assert.equal(result.rows[0].shares, 15);
  assert.equal(result.rows[0].changeShares, 5);
  assert.equal(result.freeFloat.freeFloatShares, 85);
  assert.equal(result.otherShares, 70);
});

test("sorts named owners by current share count", () => {
  const [largest, second] = buildShareholderRows({
    totalShares: 100,
    owners: [
      { id: "small", name: "Small", shares: 10 },
      { id: "evolution-treasury", name: "Evolution AB (egna aktier)", shares: 20 },
    ],
  });

  assert.equal(largest.id, "evolution-treasury");
  assert.equal(second.id, "small");
});

test("builds insider trend from direct Evolution share transactions only", () => {
  const result = buildInsiderOwnershipTrend([
    { person: "Martin", direction: "buy", volume: 100, instrumentName: "Evolution AB" },
    { person: "Martin", direction: "sell", volume: 25, instrumentName: "Evolution Gaming Group AB" },
    { person: "Martin", direction: "buy", volume: 500, instrumentName: "Warrants 2025/2028" },
  ], { person: "Martin" });

  assert.equal(result.buyShares, 100);
  assert.equal(result.sellShares, 25);
  assert.equal(result.netShares, 75);
  assert.equal(result.direction, "up");
  assert.equal(result.transactionCount, 2);
});
