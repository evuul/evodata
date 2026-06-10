import assert from "node:assert/strict";
import test from "node:test";

import {
  buildLiveHeaderPlayerMetrics,
  buildMaintenanceWarningParts,
} from "./liveHeaderPlayers.js";

const playerGames = [
  { id: "a", label: "Game A" },
  { id: "b", label: "Game B" },
  { id: "c", label: "Game C" },
  { id: "d", label: "Game D" },
];

test("buildLiveHeaderPlayerMetrics ranks active games and excludes stuck from totals", () => {
  const metrics = buildLiveHeaderPlayerMetrics({
    playerGames,
    liveGames: {
      a: { players: 100, updated: "now" },
      b: { players: 300 },
      c: { players: 500, stuck: true, stuckDays: "2.4", stuckValue: "500" },
      d: { players: 0 },
    },
    gameColors: { b: "#111111" },
  });

  assert.deepEqual(metrics.top3.map((game) => game.id), ["b", "a", "d"]);
  assert.equal(metrics.top3[0].color, "#111111");
  assert.equal(metrics.totalPlayers, 400);
  assert.equal(metrics.playersValue, 400);
  assert.equal(metrics.stuckLiveGamesCount, 1);
  assert.deepEqual(metrics.zeroPlayerGames, [
    { id: "d", label: "Game D", players: 0, stale: false, stuck: false },
  ]);
});

test("buildLiveHeaderPlayerMetrics applies simulation to displayed value", () => {
  const metrics = buildLiveHeaderPlayerMetrics({
    playerGames,
    liveGames: {
      a: { players: 100 },
      b: { players: 50 },
    },
    simulateLobby: true,
    simulationMultiplier: 1.2,
  });

  assert.equal(metrics.totalPlayers, 150);
  assert.equal(metrics.simulatedTotalPlayers, 180);
  assert.equal(metrics.playersValue, 180);
});

test("buildMaintenanceWarningParts formats the visible labels and overflow count", () => {
  assert.deepEqual(
    buildMaintenanceWarningParts([
      { id: "a", label: "A" },
      { id: "b", label: "B" },
      { id: "c", label: "C" },
    ], 2),
    {
      shown: "A, B",
      moreCount: 1,
    }
  );
  assert.equal(buildMaintenanceWarningParts([]), null);
});
