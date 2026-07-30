// Verifies shared transformations for the live player control panel.

import test from "node:test";
import assert from "node:assert/strict";
import { reconcileTodayPeak } from "./livePlayersControlPanel.js";

test("current live total raises an older peak from the same Stockholm day", () => {
  const result = reconcileTodayPeak({
    storedPeak: { value: 68_103, at: "2026-07-30T14:37:00.000Z" },
    liveTotal: 84_115,
    liveUpdatedAt: "2026-07-30T16:00:00.000Z",
    todayYmd: "2026-07-30",
  });

  assert.deepEqual(result, {
    value: 84_115,
    at: "2026-07-30T16:00:00.000Z",
    date: "2026-07-30",
  });
});

test("stored peak remains when it is higher than the current live total", () => {
  const result = reconcileTodayPeak({
    storedPeak: { value: 90_000, at: "2026-07-30T15:00:00.000Z", date: "2026-07-30" },
    liveTotal: 84_115,
    liveUpdatedAt: "2026-07-30T16:00:00.000Z",
    todayYmd: "2026-07-30",
  });

  assert.deepEqual(result, {
    value: 90_000,
    at: "2026-07-30T15:00:00.000Z",
    date: "2026-07-30",
  });
});

test("a stale live snapshot from another day cannot raise today's peak", () => {
  const result = reconcileTodayPeak({
    storedPeak: { value: 68_103, at: "2026-07-30T14:37:00.000Z" },
    liveTotal: 84_115,
    liveUpdatedAt: "2026-07-29T16:00:00.000Z",
    todayYmd: "2026-07-30",
  });

  assert.deepEqual(result, {
    value: 68_103,
    at: "2026-07-30T14:37:00.000Z",
    date: null,
  });
});
