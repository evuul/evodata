// Verifies normalization and reliability metrics for the isolated Unibet pilot.

import test from "node:test";
import assert from "node:assert/strict";
import {
  createUnibetPilotFailure,
  createUnibetPilotSample,
  normalizeUnibetPilotGames,
  summarizeUnibetPilotHistory,
} from "./unibetPilot.js";

test("normalizes Evolution games and ignores other providers", () => {
  const games = normalizeUnibetPilotGames([
    { name: "Ice Fishing", provider: "Evolution", players: "24 926", href: "/play/ice-fishing#playforreal" },
    { name: "Mega Wheel", provider: "Pragmatic Play Live", players: "4000", href: "/play/mega-wheel" },
    { name: "Crazy Time", provider: " evolution ", players: "13,294", href: "/play/crazy-time" },
  ]);

  assert.deepEqual(games.map(({ id, players }) => ({ id, players })), [
    { id: "ice-fishing", players: 24926 },
    { id: "crazy-time", players: 13294 },
  ]);
});

test("uses a configured game id when a source table maps to one tracked game", () => {
  const games = normalizeUnibetPilotGames([
    { id: "free-bet-blackjack", name: "Infinite Free Bet Blackjack", provider: "Evolution", players: 108 },
  ]);

  assert.deepEqual(games.map(({ id, name, players }) => ({ id, name, players })), [
    { id: "free-bet-blackjack", name: "Infinite Free Bet Blackjack", players: 108 },
  ]);
});

test("creates a standalone sample with a calculated total", () => {
  const sample = createUnibetPilotSample({
    collectedAt: "2026-08-04T10:00:00.000Z",
    sourceUrl: "https://example.test/games",
    rows: [
      { name: "Ice Fishing", provider: "Evolution", players: 20000, href: "/play/ice-fishing" },
      { name: "Crazy Time", provider: "Evolution", players: 10000, href: "/play/crazy-time" },
    ],
  });

  assert.equal(sample.status, "ok");
  assert.equal(sample.gameCount, 2);
  assert.equal(sample.totalPlayers, 30000);
  assert.deepEqual(sample.sourceUrls, ["https://example.test/games"]);
});

test("combines category sources and keeps the highest duplicate count", () => {
  const sample = createUnibetPilotSample({
    sourceUrls: ["https://example.test/gameshows", "https://example.test/roulette"],
    rows: [
      { name: "MONOPOLY Roulette", provider: "Evolution", players: 700 },
      { name: "MONOPOLY Roulette", provider: "Evolution", players: 725 },
      { name: "Gold Vault Roulette", provider: "Evolution", players: 500 },
    ],
  });

  assert.equal(sample.gameCount, 2);
  assert.equal(sample.totalPlayers, 1225);
  assert.deepEqual(sample.sourceUrls, [
    "https://example.test/gameshows",
    "https://example.test/roulette",
  ]);
});

test("summarizes successful, failed and missing pilot runs", () => {
  const history = [
    createUnibetPilotFailure("blocked", "2026-08-04T10:20:00.000Z"),
    { status: "ok", collectedAt: "2026-08-04T10:10:00.000Z", gameCount: 2, totalPlayers: 20, games: [] },
    { status: "ok", collectedAt: "2026-08-04T09:50:00.000Z", gameCount: 2, totalPlayers: 18, games: [] },
  ];
  const summary = summarizeUnibetPilotHistory(history, {
    now: Date.parse("2026-08-04T10:25:00.000Z"),
    expectedIntervalMs: 10 * 60 * 1000,
  });

  assert.equal(summary.runs, 3);
  assert.equal(summary.successfulRuns, 2);
  assert.equal(summary.failedRuns, 1);
  assert.equal(summary.successRate, 2 / 3);
  assert.equal(summary.scheduleCoverage, 3 / 4);
  assert.equal(summary.largestGapMs, 20 * 60 * 1000);
  assert.equal(summary.latestAgeMs, 5 * 60 * 1000);
});

test("rejects an empty or malformed Evolution result", () => {
  assert.throws(
    () => createUnibetPilotSample({ rows: [{ name: "Ice Fishing", provider: "Evolution", players: "n/a" }] }),
    /No Evolution games/
  );
});
