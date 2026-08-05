// Verifies Extended lobby categorization without exposing the recovery source.

import test from "node:test";
import assert from "node:assert/strict";
import { buildExtendedLobbyPayload } from "./extendedLobby.js";

test("returns every game in the extended sample", () => {
  const payload = buildExtendedLobbyPayload({
    collectedAt: "2026-08-04T20:00:00.000Z",
    games: [
      { id: "casino-hold-em", name: "Casino Hold'em", players: 220 },
      { id: "crazy-time", name: "Crazy Time", players: 35, category: "gameshows" },
      { id: "auto-roulette", name: "Auto Roulette", players: 24 },
      { id: "speed-baccarat", name: "Speed Baccarat", players: 20_000, category: "baccarat" },
    ],
  });

  assert.deepEqual(payload.games.map((game) => game.id), ["casino-hold-em", "crazy-time", "auto-roulette", "speed-baccarat"]);
  assert.deepEqual(payload.games.map((game) => game.category), ["gameshows", "gameshows", "roulette", "baccarat"]);
  assert.deepEqual(payload.summary, {
    games: 4,
    players: 20_279,
    categories: {
      gameshows: { games: 2, players: 255 },
      roulette: { games: 1, players: 24 },
      baccarat: { games: 1, players: 20_000 },
    },
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
  assert.deepEqual(payload.summary.categories, {
    gameshows: { games: 0, players: 0 },
    roulette: { games: 0, players: 0 },
    baccarat: { games: 0, players: 0 },
  });
});

test("categorizes localized roulette names in legacy samples", () => {
  const payload = buildExtendedLobbyPayload({ games: [
    { id: "turkce-lightning-rulet", name: "Türkçe Lightning Rulet", players: 491 },
    { id: "ruletka-live", name: "Ruletka Live", players: 6 },
  ] });

  assert.deepEqual(payload.games.map((game) => game.category), ["roulette", "roulette"]);
});
