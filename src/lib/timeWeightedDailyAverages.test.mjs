// Verifies that daily lobby averages account for the duration each sample represents.

import assert from "node:assert/strict";
import test from "node:test";

import { dailyAverages } from "./csStore.js";

test("dailyAverages weights observations by the time until the next sample", () => {
  const rows = dailyAverages([
    { ts: Date.parse("2026-08-07T00:00:00.000Z"), value: 100 },
    { ts: Date.parse("2026-08-07T01:00:00.000Z"), value: 300 },
    { ts: Date.parse("2026-08-07T04:00:00.000Z"), value: 100 },
  ]);

  assert.deepEqual(rows, [
    {
      date: "2026-08-07",
      avg: 250,
      coverageMs: 4 * 60 * 60 * 1000,
      samples: 3,
    },
  ]);
});

test("dailyAverages does not let a cross-day gap affect either day", () => {
  const rows = dailyAverages([
    { ts: Date.parse("2026-08-07T20:00:00.000Z"), value: 100 },
    { ts: Date.parse("2026-08-07T21:00:00.000Z"), value: 200 },
    { ts: Date.parse("2026-08-08T00:00:00.000Z"), value: 300 },
    { ts: Date.parse("2026-08-08T01:00:00.000Z"), value: 400 },
  ]);

  assert.deepEqual(rows, [
    {
      date: "2026-08-07",
      avg: 100,
      coverageMs: 60 * 60 * 1000,
      samples: 2,
    },
    {
      date: "2026-08-08",
      avg: 300,
      coverageMs: 60 * 60 * 1000,
      samples: 2,
    },
  ]);
});
