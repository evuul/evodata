// Verifies the lightweight Unibet API collector and its input boundaries.

import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_UNIBET_PILOT_API_URLS,
  DEFAULT_UNIBET_PILOT_TIMEOUT_MS,
  collectUnibetPilotSample,
  extractUnibetPilotRows,
} from "./unibetPilotCollector.js";

test("uses a short timeout for the direct Unibet API", () => {
  assert.equal(DEFAULT_UNIBET_PILOT_TIMEOUT_MS, 8_000);
  assert.ok(DEFAULT_UNIBET_PILOT_TIMEOUT_MS < 15_000);
  assert.equal(DEFAULT_UNIBET_PILOT_API_URLS.length, 3);
});

test("keeps Evolution live games and excludes blackjack and poker", () => {
  const rows = extractUnibetPilotRows({
    gameList: [
      { gameId: "icefishing_TABLE-1@evolution", liveCasino: { gameName: "Ice Fishing", gameType: "icefishing", players: 24_000 } },
      { gameId: "blackjack_TABLE-1@evolution", liveCasino: { gameName: "Blackjack", gameType: "blackjack", players: 150 } },
      { gameId: "poker_TABLE-1@evolution", liveCasino: { gameName: "Poker", gameType: "poker", players: 20 } },
      { gameId: "wheel_TABLE-1@pragmatic", liveCasino: { gameName: "Mega Wheel", gameType: "wheel", players: 2_000 } },
    ],
  });

  assert.deepEqual(rows, [{
    name: "Ice Fishing",
    provider: "Evolution",
    players: 24_000,
    href: "icefishing_TABLE-1@evolution",
  }]);
});

test("creates a sample from the direct API response", async () => {
  const sample = await collectUnibetPilotSample({
    apiUrl: "https://example.test/live-games",
    fetchImpl: async () => new Response(JSON.stringify({
      gameList: [
        { gameId: "crazytime_TABLE-1@evolution", liveCasino: { gameName: "Crazy Time", gameType: "crazytime", players: 8_000 } },
      ],
    })),
  });

  assert.equal(sample.source, "unibet-livecasino-api-pilot");
  assert.equal(sample.gameCount, 1);
  assert.equal(sample.totalPlayers, 8_000);
});

test("merges the game-show, roulette, and baccarat lists", async () => {
  const sample = await collectUnibetPilotSample({
    apiUrls: ["https://example.test/gameshows", "https://example.test/roulette", "https://example.test/baccarat"],
    fetchImpl: async (url) => new Response(JSON.stringify({
      gameList: [{
        gameId: url.includes("roulette") ? "autoroulette_TABLE-1@evolution" : "bacbo_TABLE-1@evolution",
        liveCasino: {
          gameName: url.includes("roulette") ? "Auto-Roulette" : "Bac Bo",
          gameType: url.includes("roulette") ? "roulette" : "bacbo",
          players: url.includes("roulette") ? 2_100 : 2_000,
        },
      }],
    })),
  });

  assert.equal(sample.sourceUrls.length, 3);
  assert.deepEqual(sample.games.map((game) => game.id), ["auto-roulette", "bac-bo"]);
});

test("reports a failed Unibet API response", async () => {
  await assert.rejects(
    collectUnibetPilotSample({
      fetchImpl: async () => new Response(null, { status: 503 }),
    }),
    /HTTP 503/
  );
});
