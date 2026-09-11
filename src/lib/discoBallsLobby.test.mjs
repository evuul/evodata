// Verifies Disco Balls flows from Unibet into both lobbies and tracked history.

import assert from "node:assert/strict";
import test from "node:test";
import { GAMES, PRIMARY_TRACKED_GAMES, UNIBET_TRACKED_GAMES, getGameColor } from "../config/games.js";
import { collectUnibetPilotSample } from "./unibetPilotCollector.js";
import { buildExtendedLobbyPayload } from "./extendedLobby.js";
import { applyUnibetPilotFallback } from "./unibetPilotFallback.js";
import { selectUnibetTrackedSeriesItems } from "./unibetTrackedGames.js";

test("tracks Disco Balls through Unibet in the regular lobby", () => {
  assert.deepEqual(GAMES.filter((game) => game.id === "disco-balls"), [
    { id: "disco-balls", label: "Disco Balls", source: "unibet", unibetId: "disco-balls", dailyTrackingFrom: "2026-09-10" },
  ]);
  assert.equal(PRIMARY_TRACKED_GAMES.some((game) => game.id === "disco-balls"), false);
  assert.notEqual(getGameColor("disco-balls"), "#ffffff");
});

for (const players of [1564, 0]) {
  test(`delivers Disco Balls to both lobbies and history with ${players} players`, async () => {
    const sample = await collectUnibetPilotSample({
      apiUrl: "https://example.test/gameshows",
      fetchImpl: async () => Response.json({ gameList: [{
        gameId: "discoballs_TABLE-DiscoBalls000001@evolution",
        liveCasino: { gameName: "Disco Balls", gameType: "discoballs", players },
      }] }),
    });

    assert.deepEqual(buildExtendedLobbyPayload(sample).games, [
      { id: "disco-balls", name: "Disco Balls", players, category: "gameshows" },
    ]);
    const regular = applyUnibetPilotFallback(
      [{ id: "disco-balls", players: null }], sample, { allowMissing: true }
    );
    assert.equal(regular.items[0].players, players);
    assert.deepEqual(selectUnibetTrackedSeriesItems(UNIBET_TRACKED_GAMES, sample), [
      { id: "disco-balls", players, fetchedAt: sample.collectedAt },
    ]);
  });
}

test("does not invent Disco Balls readings when the source omits the game", () => {
  const sample = { status: "ok", collectedAt: new Date().toISOString(), games: [] };
  const items = [{ id: "disco-balls", players: null }];
  assert.deepEqual(applyUnibetPilotFallback(items, sample, { allowMissing: true }).items, items);
  assert.deepEqual(selectUnibetTrackedSeriesItems(UNIBET_TRACKED_GAMES, sample), []);
});
