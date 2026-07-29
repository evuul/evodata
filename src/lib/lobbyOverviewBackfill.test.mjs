// Verifies deterministic lobby gap handling and recalculated trend metadata.

import assert from "node:assert/strict";
import test from "node:test";

import {
  recomputeTrendDelta,
  withManualDailyOverrides,
} from "./lobbyOverviewBackfill.js";

test("recomputes lobby trend from the first and last daily total", () => {
  assert.deepEqual(
    recomputeTrendDelta([
      { date: "2026-01-01", avgPlayers: 100 },
      { date: "2026-01-02", avgPlayers: 125 },
    ]),
    {
      start: { date: "2026-01-01", value: 100 },
      end: { date: "2026-01-02", value: 125 },
      absolute: 25,
      percent: 25,
    }
  );
});

test("fills only the configured historical gap and rebuilds aggregate totals", () => {
  const result = withManualDailyOverrides(
    {
      dailyTotals: [],
      slugDaily: {
        game: [
          { date: "2026-02-20", avg: 100 },
          { date: "2026-02-25", avg: 110 },
        ],
      },
      averages: {},
    },
    "2026-03-01"
  );

  assert.deepEqual(
    result.slugDaily.game.map((row) => row.date),
    [
      "2026-02-20",
      "2026-02-21",
      "2026-02-22",
      "2026-02-23",
      "2026-02-24",
      "2026-02-25",
    ]
  );
  assert.equal(result.dailyTotals.length, 6);
  assert.ok(result.dailyTotals.every((row) => Number.isFinite(row.avgPlayers)));
  assert.equal(result.averages.days7.length, 6);
});
