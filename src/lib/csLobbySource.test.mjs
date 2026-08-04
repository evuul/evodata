// Verifies the shared lobby source maps one provider snapshot to tracked games.

import test from "node:test";
import assert from "node:assert/strict";
import { buildLiveLobbyItems, fetchLiveLobbyCounts } from "./csLobbySource.js";

test("buildLiveLobbyItems maps values and preserves a common snapshot timestamp", () => {
  const items = buildLiveLobbyItems({
    createdAt: "2026-08-04T19:50:00.000Z",
    gameShowPlayerCounts: {
      crazyTime: 12_345,
      crazyTimeA: { players: 678 },
    },
  }, [
    { id: "crazy-time", apiSlug: "crazy-time" },
    { id: "crazy-time:a", apiSlug: "crazy-time", apiVariant: "a" },
    { id: "missing", apiSlug: "missing" },
  ]);

  assert.deepEqual(items, [
    { id: "crazy-time", slug: "crazy-time", variant: "default", players: 12_345, fetchedAt: "2026-08-04T19:50:00.000Z", stale: false },
    { id: "crazy-time:a", slug: "crazy-time", variant: "a", players: 678, fetchedAt: "2026-08-04T19:50:00.000Z", stale: false },
    { id: "missing", slug: "missing", variant: "default", players: null, fetchedAt: null, stale: false },
  ]);
});

test("fetchLiveLobbyCounts falls back when the primary lobby source is unavailable", async () => {
  const calls = [];
  const lobby = await fetchLiveLobbyCounts({
    force: true,
    now: Date.parse("2026-08-04T20:00:00.000Z"),
    fetchImpl: async (url) => {
      calls.push(url);
      if (calls.length === 1) throw new Error("Primary unavailable");
      return new Response(JSON.stringify({ createdAt: "2026-08-04T19:59:00.000Z" }), { status: 200 });
    },
  });

  assert.equal(calls.length, 2);
  assert.equal(lobby.createdAt, "2026-08-04T19:59:00.000Z");
});
