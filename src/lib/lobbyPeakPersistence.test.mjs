// Covers the max-only rule used when concurrent requests persist lobby peaks.

import assert from "node:assert/strict";
import test from "node:test";

import { maybeUpdateDailyLobbyPeak, selectHigherLobbyPeak } from "./csStore.js";

test("selectHigherLobbyPeak never lets a later lower value replace a peak", () => {
  const existing = {
    value: 118_348,
    date: "2026-08-07",
    at: "2026-08-07T16:27:00.000Z",
  };
  const delayedLowerObservation = {
    value: 112_944,
    date: "2026-08-07",
    at: "2026-08-07T16:49:00.000Z",
  };

  assert.equal(selectHigherLobbyPeak(existing, delayedLowerObservation), existing);
});

test("selectHigherLobbyPeak preserves the first timestamp when values are equal", () => {
  const existing = {
    value: 118_348,
    date: "2026-08-07",
    at: "2026-08-07T16:27:00.000Z",
  };
  const duplicate = {
    value: 118_348,
    date: "2026-08-07",
    at: "2026-08-07T16:37:00.000Z",
  };

  assert.equal(selectHigherLobbyPeak(existing, duplicate), existing);
});

test("selectHigherLobbyPeak accepts a genuine new high", () => {
  const existing = { value: 116_074 };
  const newHigh = { value: 118_348 };

  assert.equal(selectHigherLobbyPeak(existing, newHigh), newHigh);
});

test("maybeUpdateDailyLobbyPeak keeps the daily high after a delayed lower observation", async () => {
  const high = await maybeUpdateDailyLobbyPeak(118_348, "2026-08-09T16:27:00.000Z");
  const lower = await maybeUpdateDailyLobbyPeak(112_944, "2026-08-09T16:49:00.000Z");

  assert.equal(high?.value, 118_348);
  assert.equal(lower?.value, 118_348);
  assert.equal(lower?.at, "2026-08-09T16:27:00.000Z");
});
