// Verifies shared transformations for the live player control panel.

import test from "node:test";
import assert from "node:assert/strict";
import { reconcileGamePeakWithLive, reconcileTodayPeak } from "./livePlayersControlPanel.js";

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

test("a live game value immediately raises a cached game ATH", () => {
  const result = reconcileGamePeakWithLive({
    storedAth: { value: 37_930, at: "2026-07-11T16:54:45.989Z" },
    storedLatest: { value: 18_510, at: "2026-07-31T12:14:36.801Z" },
    liveValue: 42_679,
    liveUpdatedAt: "2026-07-31T16:30:53.736Z",
  });

  assert.deepEqual(result, {
    ath: { value: 42_679, at: "2026-07-31T16:30:53.736Z" },
    latest: { value: 42_679, at: "2026-07-31T16:30:53.736Z" },
  });
});

test("a lower live game value updates latest without lowering ATH", () => {
  const result = reconcileGamePeakWithLive({
    storedAth: { value: 42_679, at: "2026-07-31T16:30:53.736Z" },
    storedLatest: { value: 42_679, at: "2026-07-31T16:30:53.736Z" },
    liveValue: 39_200,
    liveUpdatedAt: "2026-07-31T17:00:00.000Z",
  });

  assert.deepEqual(result, {
    ath: { value: 42_679, at: "2026-07-31T16:30:53.736Z" },
    latest: { value: 39_200, at: "2026-07-31T17:00:00.000Z" },
  });
});

test("a live game value without a timestamp can still raise ATH safely", () => {
  const result = reconcileGamePeakWithLive({
    storedAth: { value: 37_930, at: "invalid" },
    storedLatest: null,
    liveValue: 42_679,
    liveUpdatedAt: null,
  });

  assert.deepEqual(result, {
    ath: { value: 42_679, at: null },
    latest: { value: 42_679, at: null },
  });
});
