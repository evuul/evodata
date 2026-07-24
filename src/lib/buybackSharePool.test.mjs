// Regression tests for the illustrative intraday share-pool calculation.
import assert from "node:assert/strict";
import test from "node:test";
import { calculateBuybackPace, calculateIllustrativeSharePool } from "./buybackSharePool.js";

test("spreads the latest reported trading-week pace across 24 hours", () => {
  const result = calculateBuybackPace({ latestWeekShares: 1_000_000, tradingDays: 5 });

  assert.equal(result.dailyShares, 200_000);
  assert.equal(result.sharesPerSecond, 200_000 / 86_400);
});

test("moves the illustrative share pool between outstanding and treasury shares", () => {
  const result = calculateIllustrativeSharePool({
    totalShares: 1_000,
    verifiedTreasuryShares: 100,
    latestWeekShares: 100,
    tradingDays: 5,
    secondsElapsed: 43_200,
  });

  assert.equal(result.outstandingShares, 900);
  assert.equal(result.illustrativeBoughtToday, 10);
  assert.equal(result.illustrativeTreasuryShares, 110);
  assert.equal(result.illustrativeOutstandingShares, 890);
});
