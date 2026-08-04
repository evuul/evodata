// Verifies Extended lobby categorization without exposing the recovery source.

import test from "node:test";
import assert from "node:assert/strict";
import { buildExtendedLobbyPayload } from "./extendedLobby.js";

test("returns every game in the extended sample", () => {
  const payload = buildExtendedLobbyPayload({
    collectedAt: "2026-08-04T20:00:00.000Z",
    games: [
      { id: "casino-hold-em", name: "Casino Hold'em", players: 220 },
      { id: "crazy-time", name: "Crazy Time", players: 35 },
      { id: "auto-roulette", name: "Auto Roulette", players: 24 },
      { id: "ice-fishing", name: "Ice Fishing", players: 20_000 },
    ],
  });

  assert.deepEqual(payload.games.map((game) => game.id), ["casino-hold-em", "crazy-time", "auto-roulette", "ice-fishing"]);
  assert.deepEqual(payload.summary, {
    games: 4,
    players: 20_279,
  });
  assert.equal("source" in payload, false);
});

test("ignores malformed values", () => {
  const payload = buildExtendedLobbyPayload({ games: [
    { id: "casino-hold-em", name: "Casino Hold'em", players: "n/a" },
    { id: "auto-roulette", name: "Auto Roulette", players: -1 },
  ] });

  assert.equal(payload.summary.games, 0);
  assert.equal(payload.summary.players, 0);
});
