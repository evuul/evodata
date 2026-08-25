// Verifies that fresh Unibet data repairs only primary-feed games marked as stuck.

import test from "node:test";
import assert from "node:assert/strict";
import {
  applyUnibetPilotFallback,
  getUnibetPilotGameId,
  isFreshUnibetPilotSample,
} from "./unibetPilotFallback.js";

const collectedAt = "2026-08-04T18:50:00.000Z";
const sample = {
  status: "ok",
  collectedAt,
  games: [
    { id: "auto-roulette", players: 2_500 },
    { id: "fan-tan", players: 700 },
  ],
};

test("uses a fresh pilot value only for games marked stuck", () => {
  const result = applyUnibetPilotFallback([
    {
      id: "auto-roulette",
      players: 2_458,
      stuck: true,
      stale: false,
      stuckDays: 2,
      stuckSince: "2026-08-02T10:00:00.000Z",
      stuckLatestAt: "2026-08-04T18:40:00.000Z",
      stuckValue: 2_458,
      stuckRunLength: 20,
    },
    { id: "crazy-time", players: 13_000, stuck: false, stale: false },
    { id: "fan-tan-live", players: 599, stuck: true, stale: false },
  ], sample, { now: Date.parse("2026-08-04T19:00:00.000Z") });

  assert.deepEqual(result.applied.map(({ id, players }) => ({ id, players })), [
    { id: "auto-roulette", players: 2_500 },
    { id: "fan-tan-live", players: 700 },
  ]);
  assert.equal(result.items[0].players, 2_500);
  assert.equal(result.items[0].stuck, false);
  assert.equal(result.items[0].stuckDays, null);
  assert.equal(result.items[0].stuckSince, null);
  assert.equal(result.items[0].stuckLatestAt, null);
  assert.equal(result.items[0].stuckValue, null);
  assert.equal(result.items[0].stuckRunLength, 0);
  assert.equal(result.items[1].players, 13_000);
  assert.equal(result.items[2].players, 700);
  assert.equal(result.items[2].stuck, false);
});

test("fills an explicitly missing primary value when the caller opts in", () => {
  const result = applyUnibetPilotFallback([
    { id: "ice-fishing", players: null, fetchedAt: null, stale: true, stuck: false },
    { id: "crazy-time", players: 12_000, fetchedAt: "2026-08-05T12:00:00.000Z", stale: false, stuck: false },
  ], {
    status: "ok",
    collectedAt: "2026-08-05T12:01:00.000Z",
    games: [{ id: "ice-fishing", players: 20_389 }],
  }, {
    now: Date.parse("2026-08-05T12:02:00.000Z"),
    allowMissing: true,
  });

  assert.deepEqual(result.applied, [{
    id: "ice-fishing",
    players: 20_389,
    fetchedAt: "2026-08-05T12:01:00.000Z",
  }]);
  assert.equal(result.items[0].players, 20_389);
  assert.equal(result.items[1].players, 12_000);
});

test("rejects an old or malformed pilot sample", () => {
  assert.equal(isFreshUnibetPilotSample(sample, { now: Date.parse("2026-08-04T19:20:01.000Z") }), false);
  const result = applyUnibetPilotFallback([{ id: "auto-roulette", players: 2_458, stuck: true }], sample, {
    now: Date.parse("2026-08-04T19:20:01.000Z"),
  });
  assert.equal(result.applied.length, 0);
  assert.equal(result.items[0].stuck, true);
});

test("maps tracked names to Unibet's public live-casino names", () => {
  assert.equal(getUnibetPilotGameId("crazy-time:a"), "crazy-time-a");
  assert.equal(getUnibetPilotGameId("extra-chili-epic-spins"), "extra-chilli-epic-spins");
  assert.equal(getUnibetPilotGameId("craps-live"), "craps");
  assert.equal(getUnibetPilotGameId("war-live"), "war");
});
