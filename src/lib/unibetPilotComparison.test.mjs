// Verifies the admin comparison only uses matching fresh player values.

import test from "node:test";
import assert from "node:assert/strict";
import { buildUnibetPilotComparison } from "./unibetPilotComparison.js";

const sample = {
  status: "ok",
  collectedAt: "2026-08-04T18:50:00.000Z",
  games: [
    { id: "auto-roulette", players: 2_500 },
    { id: "fan-tan", players: 700 },
  ],
};

test("compares matching games and reports recoverable stuck rows", () => {
  const result = buildUnibetPilotComparison({
    updatedAt: "2026-08-04T18:49:00.000Z",
    items: [
      { id: "auto-roulette", players: 2_400, stuck: true },
      { id: "fan-tan-live", players: 600, stuck: true },
      { id: "crazy-time", players: 13_000, stuck: false },
    ],
  }, sample, { now: Date.parse("2026-08-04T19:00:00.000Z") });

  assert.deepEqual(result, {
    available: true,
    collectedAt: "2026-08-04T18:50:00.000Z",
    primaryUpdatedAt: "2026-08-04T18:49:00.000Z",
    matchedGames: 2,
    recoveredGames: 2,
    primaryTotal: 3_000,
    pilotTotal: 3_200,
    difference: 200,
    differencePct: 200 / 3_000 * 100,
  });
});
