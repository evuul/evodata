// Verifies that only configured Extended Lobby replacements enter the primary series store.

import assert from "node:assert/strict";
import test from "node:test";
import { selectUnibetTrackedSeriesItems } from "./unibetTrackedGames.js";

const trackedGames = [
  { id: "no-commission-baccarat", unibetId: "no-commission-baccarat" },
  { id: "dragon-tiger", unibetId: "dragon-tiger" },
];

test("selects configured Unibet replacement games with the sample timestamp", () => {
  const result = selectUnibetTrackedSeriesItems(trackedGames, {
    status: "ok",
    collectedAt: "2026-08-05T12:00:00.000Z",
    games: [
      { id: "no-commission-baccarat", players: 757 },
      { id: "dragon-tiger", players: 667 },
      { id: "untracked-game", players: 4_000 },
    ],
  });

  assert.deepEqual(result, [
    { id: "no-commission-baccarat", players: 757, fetchedAt: "2026-08-05T12:00:00.000Z" },
    { id: "dragon-tiger", players: 667, fetchedAt: "2026-08-05T12:00:00.000Z" },
  ]);
});

test("fails closed when the Unibet sample is incomplete", () => {
  assert.deepEqual(selectUnibetTrackedSeriesItems(trackedGames, { status: "error" }), []);
});
