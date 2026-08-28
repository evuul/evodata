// Verifies hourly baseline aggregation, outlier handling, and live comparison metadata.

import assert from "node:assert/strict";
import test from "node:test";
import {
  buildHourlyLobbyPayload,
  computeHourBaseline,
} from "./hourlyLobbyBaseline.js";

function hourBuckets(hour, values) {
  return values.map((avg, index) => ({
    bucket: `${hour}:${String(index * 5).padStart(2, "0")}`,
    avg,
    samples: 20,
  }));
}

test("computes a sample-weighted hourly average", () => {
  const result = computeHourBaseline({
    buckets: [
      { bucket: "08:00", avg: 100, samples: 20 },
      { bucket: "08:05", avg: 200, samples: 40 },
      { bucket: "08:10", avg: 999, samples: 5 },
    ],
  }, "08");

  assert.deepEqual(result, {
    hour: "08",
    baselineAvg: 167,
    samples: 60,
  });
});

test("uses the median when a small set of buckets has a severe upward outlier", () => {
  const result = computeHourBaseline({
    buckets: hourBuckets("09", [100, 105, 110, 1_000]),
  }, "09");

  assert.equal(result.baselineAvg, 108);
  assert.equal(result.samples, 80);
});

test("builds 24 rows, excludes stuck games, and reports actual coverage", () => {
  const activeBuckets = Array.from({ length: 24 }, (_, hour) => ({
    bucket: `${String(hour).padStart(2, "0")}:00`,
    avg: 1_000 + hour * 10,
    samples: 30,
  }));
  const payload = buildHourlyLobbyPayload({
    baseline: {
      buckets: activeBuckets,
      healthyBucketsBySlug: { active: activeBuckets },
      distinctDays: 35,
      samples: 5_000,
      computedAt: "2026-08-28T18:00:00.000Z",
      source: "baseline-total-v1",
    },
    latestSnapshot: {
      items: [
        { id: "active", players: 1_500 },
        { id: "stuck", players: 9_000, stuck: true },
      ],
      updatedAt: "2026-08-28T19:25:00.000Z",
    },
    now: new Date("2026-08-28T19:30:00.000Z"),
  });

  assert.equal(payload.hourlyByHour.length, 24);
  assert.equal(payload.hourlyByHour.every((row) => row.currentTotal === 1_500), true);
  assert.equal(payload.hourlyComparison.hour, "21");
  assert.equal(payload.hourlyComparison.isCurrentHour, true);
  assert.deepEqual(payload.coverage, {
    requestedDays: 60,
    distinctDays: 35,
    samples: 5_000,
    computedAt: "2026-08-28T18:00:00.000Z",
    source: "healthy-game-baseline-v1",
    trackedGames: 2,
    healthyGames: 1,
    comparableGames: 1,
  });
});

test("uses the same healthy game universe for live and historical totals", () => {
  const fullDayBuckets = Array.from({ length: 24 }, (_, hour) => ({
    bucket: `${String(hour).padStart(2, "0")}:00`,
    avg: 100,
    samples: 20,
  }));
  const payload = buildHourlyLobbyPayload({
    baseline: { healthyBucketsBySlug: { healthy: fullDayBuckets, incomplete: [] } },
    latestSnapshot: {
      items: [
        { id: "healthy", players: 150 },
        { id: "incomplete", players: 500 },
        { id: "frozen", players: 900, stuck: true },
      ],
    },
  });

  assert.equal(payload.hourlyByHour.every((row) => row.baselineAvg === 100), true);
  assert.equal(payload.hourlyByHour.every((row) => row.currentTotal === 150), true);
  assert.equal(payload.coverage.comparableGames, 1);
});
