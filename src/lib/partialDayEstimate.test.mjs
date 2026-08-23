// Verifies the conservative blend used for a partially observed tracking day.

import assert from "node:assert/strict";
import test from "node:test";

import { estimatePartialDayAverages } from "./partialDayEstimate.js";

test("blends observed coverage with the prior seven-day per-game baseline", () => {
  const dailyAggregates = new Map([
    [
      "crazy-time",
      new Map([
        ["2026-08-21", { sum: 1_000, count: 1 }],
        ["2026-08-20", { sum: 1_000, count: 1 }],
      ]),
    ],
  ]);
  const weightedDailyBySlug = new Map([
    ["crazy-time", [{ date: "2026-08-22", avg: 1_200, coverageMs: 12 * 60 * 60 * 1000 }]],
  ]);

  const result = estimatePartialDayAverages({
    perSlugData: [{ slug: "crazy-time", daily: [{ date: "2026-08-22", avg: 1_200 }] }],
    dailyAggregates,
    weightedDailyBySlug,
  });

  assert.deepEqual(result.estimatedDates, ["2026-08-22"]);
  assert.deepEqual(result.perSlugData[0].daily[0], {
    date: "2026-08-22",
    avg: 1_100,
    estimated: true,
    observedCoveragePct: 50,
    estimateMethod: "observed-plus-7-day-baseline",
  });
});

test("does not estimate days without sufficient observed coverage", () => {
  const result = estimatePartialDayAverages({
    perSlugData: [{ slug: "crazy-time", daily: [{ date: "2026-08-22", avg: 1_200 }] }],
    dailyAggregates: new Map([["crazy-time", new Map([["2026-08-21", { sum: 1_000, count: 1 }]])]]),
    weightedDailyBySlug: new Map([["crazy-time", [{ date: "2026-08-22", avg: 1_200, coverageMs: 60 * 60 * 1000 }]]]),
  });

  assert.equal(result.estimatedDates.length, 0);
  assert.equal(result.perSlugData[0].daily[0].estimated, undefined);
});
