// Verifies total-lobby hourly baselines and full-lobby live comparisons.

import assert from "node:assert/strict";
import test from "node:test";
import {
  buildHourlyBaselineFromTotalSeries,
  buildHourlyLobbyPayload,
} from "./hourlyLobbyBaseline.js";

function stockholmTimestamp(day, hour, minute = 0) {
  return Date.parse(`${day}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+02:00`);
}

test("builds a dynamic hourly baseline from complete lobby samples", () => {
  const points = [];
  for (const day of ["2026-08-01", "2026-08-02"]) {
    for (let hour = 0; hour < 24; hour += 1) {
      points.push({ ts: stockholmTimestamp(day, hour, 0), value: 1_000 + hour * 10 });
      points.push({ ts: stockholmTimestamp(day, hour, 10), value: 1_000 + hour * 10 });
      points.push({ ts: stockholmTimestamp(day, hour, 20), value: 1_000 + hour * 10 });
    }
  }

  const baseline = buildHourlyBaselineFromTotalSeries(points, {
    days: 60,
    now: new Date("2026-08-02T22:30:00.000Z"),
  });

  assert.equal(baseline.distinctDays, 2);
  assert.equal(baseline.isComplete, false);
  assert.equal(baseline.hourlyByHour.length, 24);
  assert.deepEqual(baseline.hourlyByHour[8], {
    hour: "08",
    baselineAvg: 1_080,
    samples: 6,
    distinctDays: 2,
  });
});

test("uses a median when a total-lobby hour contains a severe upward outlier", () => {
  const points = [100, 105, 110, 1_000].map((value, index) => ({
    ts: stockholmTimestamp("2026-08-01", 9, index * 10),
    value,
  }));
  const baseline = buildHourlyBaselineFromTotalSeries(points, {
    days: 60,
    now: new Date("2026-08-01T21:30:00.000Z"),
  });

  assert.equal(baseline.hourlyByHour[9].baselineAvg, 108);
});

test("uses the full current lobby total for every hourly comparison", () => {
  const baseline = {
    hourlyByHour: Array.from({ length: 24 }, (_, hour) => ({
      hour: String(hour).padStart(2, "0"),
      baselineAvg: 1_000 + hour,
      samples: 24,
      distinctDays: 4,
    })),
    distinctDays: 4,
    samples: 576,
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
    now: new Date("2026-08-30T12:30:00.000Z"),
  });

  assert.equal(payload.hourlyByHour.every((row) => row.currentTotal === 4_000), true);
  assert.equal(payload.hourlyByHour.every((row) => row.comparableGames === 2), true);
  assert.equal(payload.coverage.remainingDays, 56);
  assert.equal(payload.hourlyComparison.hour, "14");
});
