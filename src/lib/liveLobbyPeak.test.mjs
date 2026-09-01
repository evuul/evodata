// Covers the lobby-peak input filter shared with the live dashboard.

import assert from "node:assert/strict";
import test from "node:test";

import { buildLobbyUniverseKey, summarizeObservedLobby } from "./liveLobbyPeak.js";

test("summarizeObservedLobby excludes stuck and stale games from a persisted peak", () => {
  const summary = summarizeObservedLobby([
    { id: "one", players: 70_000, fetchedAt: "2026-08-02T15:12:00.000Z" },
    { id: "two", players: 27_775, fetchedAt: "2026-08-02T15:12:00.000Z" },
    { id: "stuck", players: 10_000, fetchedAt: "2026-08-02T15:12:00.000Z", stuck: true },
    { id: "stale", players: 5_000, fetchedAt: "2026-08-02T15:12:00.000Z", stale: true },
  ]);

  assert.deepEqual(summary, {
    totalPlayers: 97_775,
    measuredAt: "2026-08-02T15:12:00.000Z",
    includedGames: 2,
    universeKey: buildLobbyUniverseKey(["one", "two"]),
  });
});

test("summarizeObservedLobby rejects rows that became stale after materialization", () => {
  const summary = summarizeObservedLobby(
    [{ id: "one", players: 100, fetchedAt: "2026-08-02T15:00:00.000Z" }],
    { now: Date.parse("2026-08-02T15:30:01.000Z"), maxAgeMs: 30 * 60 * 1000 }
  );

  assert.deepEqual(summary, {
    totalPlayers: null,
    measuredAt: null,
    includedGames: 0,
    universeKey: null,
  });
});

test("buildLobbyUniverseKey is independent of item order", () => {
  assert.equal(buildLobbyUniverseKey(["two", "one"]), buildLobbyUniverseKey(["one", "two"]));
});
