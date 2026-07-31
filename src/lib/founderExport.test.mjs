// Verifies Founder export validation, aggregation, and CSV serialization.

import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFounderExportRows,
  normalizeFounderExportRequest,
  serializeFounderCsv,
} from "./founderExport.js";

const params = (query) => new URL(`https://example.test/?${query}`).searchParams;

test("validates ranges and game slugs", () => {
  assert.deepEqual(normalizeFounderExportRequest(params("scope=lobby&days=999"), new Set()), {
    ok: true,
    scope: "lobby",
    days: 365,
    game: null,
  });
  assert.equal(normalizeFounderExportRequest(params("scope=game&game=unknown"), new Set(["known"])).ok, false);
});

test("builds completed lobby totals and excludes the current day", () => {
  const aggregates = new Map([
    ["a", new Map([
      ["2026-07-29", { sum: 200, count: 2 }],
      ["2026-07-31", { sum: 999, count: 1 }],
    ])],
    ["b", new Map([["2026-07-29", { sum: 100, count: 2 }]])],
  ]);

  assert.deepEqual(buildFounderExportRows({
    aggregates,
    slugs: ["a", "b"],
    scope: "lobby",
    days: 30,
    todayYmd: "2026-07-31",
  }), [{ date: "2026-07-29", averagePlayers: 150 }]);
});

test("serializes game exports with stable columns", () => {
  const csv = serializeFounderCsv([
    { date: "2026-07-29", game: "crazy-time", averagePlayers: 1234.5 },
  ], { scope: "game" });

  assert.equal(csv, 'date,game,average_players\r\n"2026-07-29","crazy-time","1234.5"');
});
