// Verifies total-lobby hourly baselines and full-lobby live comparisons.

import assert from "node:assert/strict";
import test from "node:test";
import {
  buildHourlyBaselineFromTotalSeries,
  buildHourlyLobbyPayload,
  HOURLY_BASELINE_SOURCE,
  hourlyCoverageStage,
  preferLastReadyHourlyBaseline,
  shouldReuseHourlyLobbyBaseline,
} from "./hourlyLobbyBaseline.js";
import { buildLobbyUniverseKey } from "./liveLobbyPeak.js";

function stockholmTimestamp(day, hour, minute = 0) {
  return Date.parse(`${day}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+02:00`);
}

test("builds a dynamic hourly baseline from matching lobby samples", () => {
  const universeKey = buildLobbyUniverseKey(["one", "two"]);
  const points = [];
  for (const day of ["2026-08-01", "2026-08-02", "2026-08-03"]) {
    for (let hour = 0; hour < 24; hour += 1) {
      points.push({ ts: stockholmTimestamp(day, hour, 0), value: 1_000 + hour * 10, universeKey, includedGames: 2 });
      points.push({ ts: stockholmTimestamp(day, hour, 10), value: 1_000 + hour * 10, universeKey, includedGames: 2 });
      points.push({ ts: stockholmTimestamp(day, hour, 20), value: 1_000 + hour * 10, universeKey, includedGames: 2 });
    }
  }

  const baseline = buildHourlyBaselineFromTotalSeries(points, {
    days: 60,
    now: new Date("2026-08-03T22:30:00.000Z"),
  });

  assert.equal(baseline.distinctDays, 3);
  assert.equal(baseline.isComplete, false);
  assert.equal(baseline.hourlyByHour.length, 24);
  assert.equal(baseline.readyHours, 24);
  assert.equal(baseline.comparableGames, 2);
  assert.deepEqual(baseline.hourlyByHour[8], {
    hour: "08",
    baselineAvg: 1_080,
    samples: 9,
    distinctDays: 3,
    coverageStage: "preliminary",
  });
});

test("uses a median when a total-lobby hour contains a severe upward outlier", () => {
  const universeKey = buildLobbyUniverseKey(["one"]);
  const points = [100, 105, 110, 1_000].map((value, index) => ({
    ts: stockholmTimestamp(`2026-08-0${index + 1}`, 9, 10),
    value,
    universeKey,
    includedGames: 1,
  }));
  const baseline = buildHourlyBaselineFromTotalSeries(points, {
    days: 60,
    now: new Date("2026-08-04T21:30:00.000Z"),
  });

  assert.equal(baseline.hourlyByHour[9].baselineAvg, 108);
});

test("weights each observed day equally when collection cadence differs", () => {
  const universeKey = buildLobbyUniverseKey(["one"]);
  const points = [
    ...[0, 10, 20, 30, 40, 50].map((minute) => ({
      ts: stockholmTimestamp("2026-08-01", 9, minute),
      value: 100,
      universeKey,
      includedGames: 1,
    })),
    { ts: stockholmTimestamp("2026-08-02", 9, 10), value: 200, universeKey, includedGames: 1 },
    { ts: stockholmTimestamp("2026-08-03", 9, 10), value: 300, universeKey, includedGames: 1 },
  ];

  const baseline = buildHourlyBaselineFromTotalSeries(points, {
    now: new Date("2026-08-03T21:30:00.000Z"),
  });

  assert.equal(baseline.hourlyByHour[9].baselineAvg, 200);
  assert.equal(baseline.hourlyByHour[9].samples, 8);
  assert.equal(baseline.hourlyByHour[9].distinctDays, 3);
});

test("selects the game universe with the broadest day coverage", () => {
  const oneDayUniverse = buildLobbyUniverseKey(["one"]);
  const threeDayUniverse = buildLobbyUniverseKey(["one", "two"]);
  const points = [
    ...[0, 10, 20, 30, 40, 50].map((minute) => ({
      ts: stockholmTimestamp("2026-08-01", 9, minute),
      value: 100,
      universeKey: oneDayUniverse,
      includedGames: 1,
    })),
    ...["2026-08-01", "2026-08-02", "2026-08-03"].map((day) => ({
      ts: stockholmTimestamp(day, 9, 5),
      value: 200,
      universeKey: threeDayUniverse,
      includedGames: 2,
    })),
  ];

  const baseline = buildHourlyBaselineFromTotalSeries(points, {
    now: new Date("2026-08-03T21:30:00.000Z"),
  });

  assert.equal(baseline.universeKey, threeDayUniverse);
  assert.equal(baseline.comparableGames, 2);
  assert.equal(baseline.hourlyByHour[9].baselineAvg, 200);
});

test("compares the full current lobby total only with the current hour", () => {
  const universeKey = buildLobbyUniverseKey(["one", "two"]);
  const baseline = {
    hourlyByHour: Array.from({ length: 24 }, (_, hour) => ({
      hour: String(hour).padStart(2, "0"),
      baselineAvg: 1_000 + hour,
      samples: 24,
      distinctDays: 4,
    })),
    distinctDays: 4,
    samples: 576,
    readyHours: 24,
    minimumDistinctDays: 3,
    universeKey,
    comparableGames: 2,
    computedAt: "2026-08-30T12:00:00.000Z",
  };
  const payload = buildHourlyLobbyPayload({
    baseline,
    latestSnapshot: {
      items: [
        { id: "one", players: 1_500, fetchedAt: "2026-08-30T12:00:00.000Z" },
        { id: "two", players: 2_500, fetchedAt: "2026-08-30T12:00:00.000Z" },
        { id: "stuck", players: 900, stuck: true, fetchedAt: "2026-08-30T12:00:00.000Z" },
      ],
      updatedAt: "2026-08-30T12:00:00.000Z",
    },
    now: new Date("2026-08-30T12:10:00.000Z"),
  });

  const currentHour = payload.hourlyByHour.find((row) => row.isCurrentHour);
  assert.equal(currentHour.currentTotal, 4_000);
  assert.equal(currentHour.deltaPct, 294.5);
  assert.equal(
    payload.hourlyByHour.filter((row) => !row.isCurrentHour).every(
      (row) => row.currentTotal === null && row.deltaPct === null
    ),
    true
  );
  assert.equal(payload.hourlyByHour.every((row) => row.comparableGames === 2), true);
  assert.equal(payload.coverage.remainingDays, 56);
  assert.equal(payload.hourlyComparison.hour, "14");
});

test("does not compare totals from different game universes", () => {
  const baseline = {
    hourlyByHour: [{ hour: "14", baselineAvg: 1_000, samples: 12 }],
    universeKey: buildLobbyUniverseKey(["one", "two"]),
    readyHours: 1,
  };
  const payload = buildHourlyLobbyPayload({
    baseline,
    latestSnapshot: {
      items: [{ id: "one", players: 1_500, fetchedAt: "2026-08-30T12:00:00.000Z" }],
    },
    now: new Date("2026-08-30T12:10:00.000Z"),
  });

  assert.equal(payload.hourlyComparison, null);
  assert.equal(payload.coverage.universeMatches, false);
  assert.equal(payload.hourlyByHour.every((row) => row.currentTotal === null), true);
});

test("reports collection progress without publishing a one-sample average", () => {
  const universeKey = buildLobbyUniverseKey(["one"]);
  const baseline = buildHourlyBaselineFromTotalSeries([
    { ts: stockholmTimestamp("2026-08-01", 9, 0), value: 100, universeKey, includedGames: 1 },
  ], {
    now: new Date("2026-08-01T21:00:00.000Z"),
  });
  const payload = buildHourlyLobbyPayload({ baseline, latestSnapshot: null });

  assert.equal(payload.ready, false);
  assert.equal(payload.coverage.samples, 1);
  assert.equal(payload.coverage.readyHours, 0);
  assert.equal(payload.coverage.minimumDistinctDays, 3);
});

test("classifies hourly coverage by distinct-day quality", () => {
  assert.equal(hourlyCoverageStage(2), "collecting");
  assert.equal(hourlyCoverageStage(3), "preliminary");
  assert.equal(hourlyCoverageStage(7), "building");
  assert.equal(hourlyCoverageStage(60), "complete");
});

test("reuses a materialized baseline when no newer lobby sample exists", () => {
  const baseline = {
    source: HOURLY_BASELINE_SOURCE,
    sourceLatestSampleAt: "2026-08-30T12:10:00.000Z",
    readyHours: 4,
  };

  assert.equal(shouldReuseHourlyLobbyBaseline(baseline, {
    ts: Date.parse("2026-08-30T12:10:00.000Z"),
  }), true);
  assert.equal(shouldReuseHourlyLobbyBaseline(baseline, {
    ts: Date.parse("2026-08-30T12:20:00.000Z"),
  }), false);
});

test("keeps the last ready baseline instead of replacing it with an empty rebuild", () => {
  const existing = { source: HOURLY_BASELINE_SOURCE, readyHours: 8 };
  const emptyCandidate = { source: HOURLY_BASELINE_SOURCE, readyHours: 0 };
  const readyCandidate = { source: HOURLY_BASELINE_SOURCE, readyHours: 9 };

  assert.equal(preferLastReadyHourlyBaseline(existing, emptyCandidate), existing);
  assert.equal(preferLastReadyHourlyBaseline(existing, readyCandidate), readyCandidate);
  assert.equal(
    preferLastReadyHourlyBaseline({ source: "legacy", readyHours: 8 }, emptyCandidate),
    emptyCandidate
  );
});
