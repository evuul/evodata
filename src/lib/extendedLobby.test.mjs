// Verifies Extended lobby categorization without exposing the recovery source.

import test from "node:test";
import assert from "node:assert/strict";
import { buildExtendedLobbyPayload } from "./extendedLobby.js";

test("returns every categorized Blackjack and Poker game", () => {
  const payload = buildExtendedLobbyPayload({
    collectedAt: "2026-08-04T20:00:00.000Z",
    games: [
      { id: "free-bet-blackjack", name: "Free Bet Blackjack", players: 108 },
      { id: "blackjack-table-speed-1-evolution", name: "Speed Blackjack", players: 91, category: "blackjack" },
      { id: "casino-hold-em", name: "Casino Hold'em", players: 220 },
      { id: "three-card-poker", name: "Three Card Poker", players: 35 },
      { id: "teen-patti", name: "Teen Patti", players: 24, category: "poker" },
      { id: "ice-fishing", name: "Ice Fishing", players: 20_000 },
    ],
  });

  assert.deepEqual(payload.categories.blackjack.map((game) => game.id), ["free-bet-blackjack", "blackjack-table-speed-1-evolution"]);
  assert.deepEqual(payload.categories.poker.map((game) => game.id), ["casino-hold-em", "three-card-poker", "teen-patti"]);
  assert.deepEqual(payload.summary, {
    games: 5,
    players: 478,
    blackjackPlayers: 199,
    pokerPlayers: 279,
  });
  assert.equal("source" in payload, false);
});

test("ignores malformed values", () => {
  const payload = buildExtendedLobbyPayload({ games: [
    { id: "free-bet-blackjack", name: "Free Bet Blackjack", players: "n/a" },
    { id: "casino-hold-em", name: "Casino Hold'em", players: -1 },
  ] });

  assert.equal(payload.summary.games, 0);
  assert.equal(payload.summary.players, 0);
});
