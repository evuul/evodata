// Verifies the approved interpolation stays explicit and cannot become measured source data.

import test from "node:test";
import assert from "node:assert/strict";
import { applyApprovedLobbyTrendEstimates, normalizeLobbyTrendRows } from "./lobbyTrendEstimates.js";
import { applyRegularLobbyDailyToOverview } from "./regularLobbyDailySnapshot.js";

const before = { date: "2026-09-08", avgPlayers: 75544.71 };
const after = { date: "2026-09-10", avgPlayers: 75347.38 };
function overview() {
  return {
    dailyTotals: [before, after], rawDailyTotals: [before, after], forecastDailyTotals: [before, after],
    slugDaily: {}, estimatedDates: [],
    dailyQuality: {
      "2026-09-08": { complete: true },
      "2026-09-09": { complete: false, slots: 134, expectedSlots: 144, missingHours: [11] },
      "2026-09-10": { complete: true },
    },
  };
}

test("fills September 9 with the rounded adjacent-day mean and exposes provenance", () => {
  const input = overview();
  const result = applyApprovedLobbyTrendEstimates(input);
  assert.deepEqual(result.dailyTotals[1], { date: "2026-09-09", avgPlayers: 75446.05, estimated: true });
  assert.deepEqual(result.estimatedDates, ["2026-09-09"]);
  assert.equal(result.dailyQuality["2026-09-09"].complete, false);
  assert.equal(result.dailyQuality["2026-09-09"].slots, 134);
  assert.deepEqual(result.dailyQuality["2026-09-09"].sourceDates, ["2026-09-08", "2026-09-10"]);
  assert.deepEqual(result.rawDailyTotals, input.rawDailyTotals);
  assert.deepEqual(result.forecastDailyTotals, input.forecastDailyTotals);
  assert.deepEqual(result.slugDaily, {});
  assert.equal(input.dailyTotals.length, 2);
  assert.equal(result.averages.days7.length, 3);
  assert.deepEqual(applyRegularLobbyDailyToOverview(input, []).dailyTotals, result.dailyTotals);
  assert.deepEqual(applyApprovedLobbyTrendEstimates(result), result);
});

test("does not substitute missing or estimated neighbours, or overwrite measured days", () => {
  for (const input of [
    { ...overview(), dailyTotals: [before] },
    { ...overview(), dailyTotals: [before, { ...after, avgPlayers: null }] },
    { ...overview(), dailyTotals: [before, { ...after, avgPlayers: -1 }] },
    { ...overview(), dailyTotals: [before, { ...after, estimated: true }] },
    { ...overview(), estimatedDates: ["2026-09-08"] },
    { ...overview(), dailyQuality: { ...overview().dailyQuality, "2026-09-10": { complete: false } } },
    { ...overview(), dailyQuality: { ...overview().dailyQuality, "2026-09-09": { complete: true } },
      dailyTotals: [before, { date: "2026-09-09", avgPlayers: 76000 }, after] },
  ]) {
    assert.equal(applyApprovedLobbyTrendEstimates(input), input);
  }
});

test("only fills the approved day and carries the estimated marker into chart input", () => {
  const input = overview();
  input.dailyQuality["2026-09-07"] = { complete: false };
  const result = applyApprovedLobbyTrendEstimates(input);
  assert.equal(result.dailyTotals.some(row => row.date === "2026-09-07"), false);
  assert.deepEqual(normalizeLobbyTrendRows(result)[1], { date: "2026-09-09", avgPlayers: 75446.05, estimated: true });
  assert.equal(normalizeLobbyTrendRows(result)[0].estimated, false);
  assert.deepEqual(normalizeLobbyTrendRows({ dailyTotals: [{ date: "2026-09-09", avgPlayers: null }] }), []);
});
