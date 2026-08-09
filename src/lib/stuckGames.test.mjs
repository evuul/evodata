// Verifies that recovery samples do not hide a still-frozen primary lobby feed.

import test from "node:test";
import assert from "node:assert/strict";
import { computeTrailingStuckMeta, continueKnownStuckMeta } from "./stuckGames.js";

const previous = {
  id: "auto-roulette",
  players: 2_400,
  stuck: true,
  stuckDays: 2,
  stuckSince: "2026-08-03T10:00:00.000Z",
  stuckLatestAt: "2026-08-05T09:50:00.000Z",
  stuckValue: 2_400,
  stuckRunLength: 20,
};

test("keeps stuck metadata while the primary value remains frozen", () => {
  const result = continueKnownStuckMeta(previous, {
    id: "auto-roulette",
    players: 2_400,
    fetchedAt: "2026-08-05T10:00:00.000Z",
  }, {
    now: Date.parse("2026-08-05T10:00:00.000Z"),
  });

  assert.deepEqual(result, {
    stuck: true,
    stuckDays: 2,
    stuckSince: "2026-08-03T10:00:00.000Z",
    stuckLatestAt: "2026-08-05T10:00:00.000Z",
    stuckValue: 2_400,
    stuckRunLength: 21,
  });
});

test("clears carried stuck metadata as soon as the primary value changes", () => {
  assert.equal(continueKnownStuckMeta(previous, {
    id: "auto-roulette",
    players: 2_401,
    fetchedAt: "2026-08-05T10:00:00.000Z",
  }), null);
});

test("detects four identical samples immediately when recovery does not require a full day", () => {
  const start = Date.parse("2026-08-05T10:00:00.000Z");
  const series = [0, 10, 20, 30].map((minutes) => ({
    ts: start + minutes * 60 * 1000,
    value: 2_400,
  }));

  const stuck = computeTrailingStuckMeta(series, {
    minRun: 4,
    minDays: 0,
    now: start + 30 * 60 * 1000,
  });

  assert.equal(stuck?.stuck, true);
  assert.equal(stuck?.stuckRunLength, 4);
  assert.equal(stuck?.stuckValue, 2_400);
});
