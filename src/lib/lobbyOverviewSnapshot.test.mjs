// Verifies that recent materialized days extend longer lobby snapshots safely.

import assert from "node:assert/strict";
import test from "node:test";

import {
  appendDailyAggregateDateToOverview,
  composeLobbyOverviewSnapshots,
} from "./lobbyOverviewSnapshot.js";

test("recent snapshot values replace matching days and preserve older history", () => {
  const result = composeLobbyOverviewSnapshots(
    {
      dailyTotals: [
        { date: "2026-08-20", avgPlayers: 60_000 },
        { date: "2026-08-22", avgPlayers: 53_895 },
      ],
      slugDaily: { game: [{ date: "2026-08-20", avg: 100 }, { date: "2026-08-22", avg: 80 }] },
      ath: { value: 118_000 },
    },
    {
      dailyTotals: [
        { date: "2026-08-22", avgPlayers: 57_928 },
        { date: "2026-08-23", avgPlayers: 62_000 },
      ],
      slugDaily: { game: [{ date: "2026-08-22", avg: 90, estimated: true }, { date: "2026-08-23", avg: 110 }] },
      estimatedDates: ["2026-08-22"],
      ath: { value: 117_000 },
    },
    180
  );

  assert.deepEqual(result.dailyTotals, [
    { date: "2026-08-20", avgPlayers: 60_000 },
    { date: "2026-08-22", avgPlayers: 57_928 },
    { date: "2026-08-23", avgPlayers: 62_000 },
  ]);
  assert.equal(result.slugDaily.game[1].avg, 90);
  assert.equal(result.slugDaily.game[1].estimated, true);
  assert.equal(result.ath.value, 118_000);
  assert.deepEqual(result.estimatedDates, ["2026-08-22"]);
});

test("appends one completed aggregate day without reading raw samples", () => {
  const dailyAggregates = new Map([
    ["game-a", new Map([["2026-08-23", { sum: 300, count: 2 }]])],
    ["game-b", new Map([["2026-08-23", { sum: 500, count: 2 }]])],
  ]);
  const result = appendDailyAggregateDateToOverview(
    { dailyTotals: [{ date: "2026-08-22", avgPlayers: 350 }], slugDaily: {} },
    dailyAggregates,
    "2026-08-23",
    90,
    new Set(["game-a"])
  );

  assert.deepEqual(result.dailyTotals.at(-1), { date: "2026-08-23", avgPlayers: 400 });
  assert.deepEqual(result.forecastDailyTotals, [{ date: "2026-08-23", avgPlayers: 150 }]);
  assert.deepEqual(result.slugDaily["game-b"], [{ date: "2026-08-23", avg: 250 }]);
});
