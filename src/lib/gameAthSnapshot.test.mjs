// Verifies historical ATH seeding and incremental snapshot updates.

import test from "node:test";
import assert from "node:assert/strict";

import {
  buildGameAthSnapshot,
  computeGameAthFromDailyMap,
  mergeGameAthSnapshot,
  normalizeGameAthSnapshot,
} from "./gameAthSnapshot.js";

test("computeGameAthFromDailyMap preserves the prior record", () => {
  const rows = new Map([
    ["2026-01-01", { max: 100, maxTs: Date.parse("2026-01-01T12:00:00Z") }],
    ["2026-01-02", { max: 130, maxTs: Date.parse("2026-01-02T12:00:00Z") }],
    ["2026-01-03", { max: 125, maxTs: Date.parse("2026-01-03T12:00:00Z") }],
  ]);

  assert.deepEqual(computeGameAthFromDailyMap(rows), {
    value: 130,
    at: "2026-01-02T12:00:00.000Z",
    previousValue: 100,
    previousAt: "2026-01-01T12:00:00.000Z",
  });
});

test("buildGameAthSnapshot seeds all available games from daily aggregates", () => {
  const aggregates = new Map([
    ["game-a", new Map([["2026-01-01", { max: 50, maxTs: 1_767_268_800_000 }]])],
    ["game-b", new Map([["2026-01-01", { max: 75, maxTs: 1_767_268_900_000 }]])],
  ]);

  const snapshot = buildGameAthSnapshot(aggregates, ["game-a", "game-b", "missing"], "2026-01-04T00:00:00.000Z");

  assert.equal(snapshot.games["game-a"].value, 50);
  assert.equal(snapshot.games["game-b"].value, 75);
  assert.equal(snapshot.games.missing, undefined);
});

test("mergeGameAthSnapshot updates only genuine new records", () => {
  const current = {
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    games: {
      "game-a": { value: 100, at: "2026-01-01T00:00:00.000Z", previousValue: 90, previousAt: null },
    },
  };

  const unchanged = mergeGameAthSnapshot(current, [
    { id: "game-a", players: 99, fetchedAt: "2026-01-02T00:00:00.000Z" },
  ]);
  assert.equal(unchanged.changed, false);
  assert.equal(unchanged.snapshot.games["game-a"].value, 100);

  const updated = mergeGameAthSnapshot(current, [
    { id: "game-a", players: 110, fetchedAt: "2026-01-03T00:00:00.000Z" },
  ], "2026-01-03T00:00:00.000Z");
  assert.equal(updated.changed, true);
  assert.deepEqual(updated.snapshot.games["game-a"], {
    value: 110,
    at: "2026-01-03T00:00:00.000Z",
    previousValue: 100,
    previousAt: "2026-01-01T00:00:00.000Z",
  });
});

test("normalizeGameAthSnapshot rejects malformed entries", () => {
  const snapshot = normalizeGameAthSnapshot({
    games: {
      valid: { value: "42", at: "2026-01-01T00:00:00.000Z" },
      invalid: { value: "nope" },
    },
  });

  assert.deepEqual(Object.keys(snapshot.games), ["valid"]);
  assert.equal(snapshot.games.valid.value, 42);
});
