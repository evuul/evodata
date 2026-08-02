// Covers the lobby-peak input filter shared with the live dashboard.

import assert from "node:assert/strict";
import test from "node:test";

import { summarizeObservedLobby } from "./liveLobbyPeak.js";

test("summarizeObservedLobby excludes stuck and stale games from a persisted peak", () => {
  const summary = summarizeObservedLobby([
    { players: 70_000, fetchedAt: "2026-08-02T15:12:00.000Z" },
    { players: 27_775, fetchedAt: "2026-08-02T15:12:00.000Z" },
    { players: 10_000, fetchedAt: "2026-08-02T15:12:00.000Z", stuck: true },
    { players: 5_000, fetchedAt: "2026-08-02T15:12:00.000Z", stale: true },
  ]);

  assert.deepEqual(summary, {
    totalPlayers: 97_775,
    measuredAt: "2026-08-02T15:12:00.000Z",
    includedGames: 2,
  });
});
