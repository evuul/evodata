import test from "node:test";
import assert from "node:assert/strict";

import {
  mergeLiveBlankingPoint,
  normalizeBlankingItems,
} from "./blankingSeries.js";

test("normalizeBlankingItems sorts dates, removes duplicates and calculates deltas", () => {
  const result = normalizeBlankingItems([
    { date: "2026-06-05", percent: 9.8 },
    { date: "2026-06-03", percent: 9.4 },
    { date: "2026-06-04", percent: 9.6 },
    { date: "2026-06-04", percent: 9.65 },
  ]);

  assert.deepEqual(result, [
    { date: "2026-06-03", percent: 9.4, delta: null },
    { date: "2026-06-04", percent: 9.65, delta: 0.25 },
    { date: "2026-06-05", percent: 9.8, delta: 0.15 },
  ]);
});

test("mergeLiveBlankingPoint injects the latest live snapshot into the series", () => {
  const result = mergeLiveBlankingPoint(
    [
      { date: "2026-06-03", percent: 9.4 },
      { date: "2026-06-05", percent: 9.8 },
    ],
    { observedDate: "2026-06-06", totalPercent: 10.1 }
  );

  assert.deepEqual(result, [
    { date: "2026-06-03", percent: 9.4, delta: null },
    { date: "2026-06-05", percent: 9.8, delta: 0.4 },
    { date: "2026-06-06", percent: 10.1, delta: 0.3 },
  ]);
});

test("mergeLiveBlankingPoint replaces an existing date when the live snapshot is for the same day", () => {
  const result = mergeLiveBlankingPoint(
    [
      { date: "2026-06-03", percent: 9.4 },
      { date: "2026-06-06", percent: 9.8 },
    ],
    { observedDate: "2026-06-06", totalPercent: 10.1 }
  );

  assert.deepEqual(result, [
    { date: "2026-06-03", percent: 9.4, delta: null },
    { date: "2026-06-06", percent: 10.1, delta: 0.7 },
  ]);
});
