// Verifies missing values, stuck metadata, and freshness handling for live-player snapshots.

import test from "node:test";
import assert from "node:assert/strict";
import {
  finiteNumberOrNull,
  isPlayerSampleFresh,
  normalizeLatestPlayerSnapshotItem,
} from "./livePlayerSnapshot.js";

test("keeps missing player values null instead of converting them to zero", () => {
  assert.equal(finiteNumberOrNull(null), null);
  assert.equal(finiteNumberOrNull(undefined), null);
  assert.equal(finiteNumberOrNull(""), null);
  assert.equal(finiteNumberOrNull(0), 0);

  assert.deepEqual(normalizeLatestPlayerSnapshotItem({ id: "dragon-tiger", players: null }), {
    id: "dragon-tiger",
    players: null,
    fetchedAt: null,
    ageSeconds: null,
    stale: true,
    stuck: false,
    stuckDays: null,
    stuckSince: null,
    stuckLatestAt: null,
    stuckValue: null,
    stuckRunLength: 0,
  });
});

test("removes stale stuck metadata when a game is no longer marked stuck", () => {
  const item = normalizeLatestPlayerSnapshotItem({
    id: "crazy-time",
    players: 8_000,
    fetchedAt: "2026-08-15T19:59:00.000Z",
    stuck: false,
    stuckDays: 3,
    stuckValue: 7_500,
    stuckRunLength: 40,
  }, Date.parse("2026-08-15T20:00:00.000Z"));

  assert.equal(item.stale, false);
  assert.equal(item.stuckDays, null);
  assert.equal(item.stuckValue, null);
  assert.equal(item.stuckRunLength, 0);
});

test("marks an old persisted value stale even if an older snapshot omitted the flag", () => {
  const item = normalizeLatestPlayerSnapshotItem({
    id: "dragon-tiger",
    players: 750,
    fetchedAt: "2026-08-15T15:10:00.000Z",
  }, Date.parse("2026-08-15T20:00:00.000Z"));

  assert.equal(item.players, 750);
  assert.equal(item.stale, true);
});

test("accepts only non-future samples within the configured freshness window", () => {
  const now = Date.parse("2026-08-15T20:00:00.000Z");
  const maxAgeMs = 20 * 60 * 1000;

  assert.equal(isPlayerSampleFresh("2026-08-15T19:40:00.000Z", { now, maxAgeMs }), true);
  assert.equal(isPlayerSampleFresh("2026-08-15T19:39:59.999Z", { now, maxAgeMs }), false);
  assert.equal(isPlayerSampleFresh("2026-08-15T20:00:01.000Z", { now, maxAgeMs }), false);
  assert.equal(isPlayerSampleFresh(null, { now, maxAgeMs }), false);
});
