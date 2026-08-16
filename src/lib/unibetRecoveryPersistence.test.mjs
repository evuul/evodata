// Verifies clean Unibet series handoff and immediate primary-feed fallback.

import test from "node:test";
import assert from "node:assert/strict";
import {
  buildRecoveredLatestPlayersSnapshot,
  partitionPrimarySeriesItems,
  persistRecoverySeriesItems,
  selectUnibetRecoverySeriesItems,
} from "./unibetRecoveryPersistence.js";

const collectedAt = "2026-08-05T10:00:00.000Z";
const snapshotItems = [
  { id: "auto-roulette", players: 2_400, stuck: true },
  { id: "crazy-time", players: 10_000, stuck: false },
  { id: "missing-recovery", players: 100, stuck: true },
];
const primaryItems = [
  { id: "auto-roulette", players: 2_400, fetchedAt: collectedAt },
  { id: "crazy-time", players: 10_000, fetchedAt: collectedAt },
  { id: "missing-recovery", players: 100, fetchedAt: collectedAt },
];
const pilotSample = {
  status: "ok",
  collectedAt,
  games: [{ id: "auto-roulette", players: 2_650 }],
  seriesSavedGameIds: ["auto-roulette"],
};

test("hands fresh recovered games to Unibet and keeps healthy primary games", () => {
  const result = partitionPrimarySeriesItems(primaryItems, snapshotItems, pilotSample, {
    now: Date.parse("2026-08-05T10:01:00.000Z"),
  });

  assert.deepEqual(result.primary.map((item) => item.id), ["crazy-time", "missing-recovery"]);
  assert.deepEqual(result.deferred.map((item) => item.id), ["auto-roulette"]);
  assert.deepEqual(result.recoveryItems, [
    { id: "auto-roulette", players: 2_650, fetchedAt: collectedAt },
  ]);
});

test("keeps the old primary behavior when Unibet is stale or failed", () => {
  const stale = partitionPrimarySeriesItems(primaryItems, snapshotItems, pilotSample, {
    now: Date.parse("2026-08-05T10:06:00.001Z"),
  });
  const failed = partitionPrimarySeriesItems(primaryItems, snapshotItems, {
    status: "error",
    collectedAt,
  });

  assert.deepEqual(stale.primary, primaryItems);
  assert.deepEqual(stale.deferred, []);
  assert.deepEqual(failed.primary, primaryItems);
  assert.deepEqual(failed.deferred, []);
});

test("keeps primary fallback when collection succeeded but the series write did not", () => {
  const result = partitionPrimarySeriesItems(primaryItems, snapshotItems, {
    ...pilotSample,
    seriesSavedGameIds: [],
  }, {
    now: Date.parse("2026-08-05T10:01:00.000Z"),
  });

  assert.deepEqual(result.primary, primaryItems);
  assert.deepEqual(result.deferred, []);
});

test("restores the primary series immediately when its frozen value changes", () => {
  const recoveredPrimary = primaryItems.map((item) =>
    item.id === "auto-roulette" ? { ...item, players: 2_401 } : item
  );
  const result = partitionPrimarySeriesItems(recoveredPrimary, snapshotItems, pilotSample, {
    now: Date.parse("2026-08-05T10:01:00.000Z"),
  });

  assert.deepEqual(result.primary, recoveredPrimary);
  assert.deepEqual(result.deferred, []);
});

test("selects only stuck games that have a matching Unibet value", () => {
  const selected = selectUnibetRecoverySeriesItems(snapshotItems, pilotSample, {
    now: Date.parse("2026-08-05T10:01:00.000Z"),
  });

  assert.deepEqual(selected.map((item) => item.id), ["auto-roulette"]);
});

test("materializes recovered games into the latest player snapshot", () => {
  const result = buildRecoveredLatestPlayersSnapshot({
    items: snapshotItems,
    updatedAt: "2026-08-05T09:50:00.000Z",
    materializedAt: "2026-08-05T09:51:00.000Z",
  }, pilotSample, {
    now: Date.parse("2026-08-05T10:01:00.000Z"),
  });

  assert.deepEqual(result.applied, [
    { id: "auto-roulette", players: 2_650, fetchedAt: collectedAt },
  ]);
  assert.deepEqual(result.snapshot.items[0], {
    id: "auto-roulette",
    players: 2_650,
    fetchedAt: collectedAt,
    stale: false,
    stuck: false,
    stuckDays: null,
    stuckSince: null,
    stuckLatestAt: null,
    stuckValue: null,
    stuckRunLength: 0,
  });
  assert.equal(result.snapshot.updatedAt, collectedAt);
  assert.equal(result.snapshot.materializedAt, "2026-08-05T10:01:00.000Z");
});

test("does not rewrite a snapshot when no stuck game can be recovered", () => {
  const snapshot = { items: [{ id: "crazy-time", players: 10_000, stuck: false }] };
  const result = buildRecoveredLatestPlayersSnapshot(snapshot, pilotSample, {
    now: Date.parse("2026-08-05T10:01:00.000Z"),
  });

  assert.equal(result.snapshot, snapshot);
  assert.deepEqual(result.applied, []);
});

test("persists recovery samples independently so one failed game does not block others", async () => {
  const calls = [];
  const persisted = await persistRecoverySeriesItems([
    { id: "auto-roulette", players: 2_650, fetchedAt: collectedAt },
    { id: "fan-tan", players: 700, fetchedAt: collectedAt },
  ], async (id, fetchedAt, players) => {
    calls.push({ id, fetchedAt, players });
    if (id === "fan-tan") throw new Error("write failed");
  });

  assert.deepEqual(persisted, {
    savedGameIds: ["auto-roulette"],
    failedGameIds: ["fan-tan"],
  });
  assert.deepEqual(calls, [
    { id: "auto-roulette", players: 2_650, fetchedAt: collectedAt },
    { id: "fan-tan", players: 700, fetchedAt: collectedAt },
  ]);
});
