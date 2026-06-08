import test from "node:test";
import assert from "node:assert/strict";

import { buildDaysToCoverEstimate } from "./shortActivitySummary.js";

test("buildDaysToCoverEstimate prefers live short context over historical fallback", () => {
  const shortHistory = [{ date: "2026-06-05", percent: 5.28 }];
  const currentShortContext = {
    currentShortInterestDate: "2026-06-08",
    currentShortInterestPercent: 5.38,
    currentShortInterestSource: "fi-live",
  };

  const summary = buildDaysToCoverEstimate(
    shortHistory,
    ["2026-06-05", "2026-06-06"],
    1_000_000,
    { volumeAverage20: 500_000 },
    currentShortContext
  );

  assert.equal(summary.currentShortInterestDate, "2026-06-08");
  assert.equal(summary.currentShortInterestPercent, 5.38);
  assert.equal(summary.currentShortInterestShares, 10_718_392);
  assert.equal(summary.averageDailyVolumeShares, 500_000);
  assert.equal(summary.daysToCoverEstimate, 21.44);
});

test("buildDaysToCoverEstimate falls back to the latest historical short value", () => {
  const shortHistory = [{ date: "2026-06-05", percent: 5.28 }];

  const summary = buildDaysToCoverEstimate(
    shortHistory,
    ["2026-06-05", "2026-06-06"],
    1_000_000,
    { volumeAverage20: 500_000 }
  );

  assert.equal(summary.currentShortInterestDate, "2026-06-05");
  assert.equal(summary.currentShortInterestPercent, 5.28);
  assert.equal(summary.currentShortInterestShares, 10_519_165);
  assert.equal(summary.daysToCoverEstimate, 21.04);
});
