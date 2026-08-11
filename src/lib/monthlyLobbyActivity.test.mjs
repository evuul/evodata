// Verifies monthly lobby activity aggregation for year-over-year comparisons.

import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMonthlyLobbyActivity,
  filterMonthlyComparisonRows,
  findLatestMonthlyComparison,
  mergeDailyLobbyHistory,
  resolveMonthlyComparisonYears,
} from "./monthlyLobbyActivity.js";

test("merges historical and live totals with live values taking precedence", () => {
  assert.deepEqual(
    mergeDailyLobbyHistory(
      [
        { Datum: "2025-06-01", Players: 40_000 },
        { Datum: "2025-06-02", Players: 41_000 },
      ],
      [
        { date: "2025-06-02", avgPlayers: 42_000 },
        { date: "2026-06-01", avgPlayers: 50_000 },
      ]
    ),
    [
      { date: "2025-06-01", avgPlayers: 40_000 },
      { date: "2025-06-02", avgPlayers: 42_000 },
      { date: "2026-06-01", avgPlayers: 50_000 },
    ]
  );
});

test("selects the two most recent years with valid daily lobby data", () => {
  const years = resolveMonthlyComparisonYears([
    { date: "2024-12-31", avgPlayers: 100 },
    { date: "2025-06-01", avgPlayers: 200 },
    { date: "2026-06-01", avgPlayers: 300 },
  ]);

  assert.deepEqual(years, [2025, 2026]);
});

test("starts the 2025 comparison window in November", () => {
  assert.deepEqual(
    filterMonthlyComparisonRows([
      { date: "2025-10-31", avgPlayers: 50_000 },
      { date: "2025-11-01", avgPlayers: 55_000 },
      { date: "2026-01-01", avgPlayers: 60_000 },
    ]),
    [
      { date: "2025-11-01", players: 55_000 },
      { date: "2026-01-01", players: 60_000 },
    ]
  );
});

test("averages each calendar month separately and preserves coverage days", () => {
  const rows = [
    { date: "2025-06-01", avgPlayers: 40_000 },
    { date: "2025-06-02", avgPlayers: 44_000 },
    { date: "2026-06-01", avgPlayers: 50_000 },
    { date: "2026-06-02", avgPlayers: 54_000 },
    { date: "2026-07-01", avgPlayers: 60_000 },
  ];
  const activity = buildMonthlyLobbyActivity(rows, [2025, 2026]);
  const june = activity[5];
  const july = activity[6];

  assert.deepEqual(june, {
    month: 6,
    monthSv: "Jun",
    monthEn: "Jun",
    "2025": 42_000,
    "2025Days": 2,
    "2026": 52_000,
    "2026Days": 2,
  });
  assert.equal(july["2025"], null);
  assert.equal(july["2025Days"], 0);
  assert.equal(july["2026"], 60_000);
  assert.equal(july["2026Days"], 1);
});

test("finds the latest month with data for both comparison years", () => {
  const activity = buildMonthlyLobbyActivity([
    { date: "2025-06-01", avgPlayers: 40_000 },
    { date: "2026-06-01", avgPlayers: 50_000 },
    { date: "2026-07-01", avgPlayers: 60_000 },
  ], [2025, 2026]);

  assert.deepEqual(findLatestMonthlyComparison(activity, [2025, 2026]), {
    month: 6,
    monthSv: "Jun",
    monthEn: "Jun",
    "2025": 40_000,
    "2025Days": 1,
    "2026": 50_000,
    "2026Days": 1,
    previousYear: "2025",
    currentYear: "2026",
    changePct: 25,
  });
});

test("does not treat a missing monthly value as zero", () => {
  const activity = buildMonthlyLobbyActivity([
    { date: "2025-12-01", avgPlayers: 60_000 },
    { date: "2026-08-01", avgPlayers: 70_000 },
  ], [2025, 2026]);

  assert.equal(findLatestMonthlyComparison(activity, [2025, 2026]), null);
});
