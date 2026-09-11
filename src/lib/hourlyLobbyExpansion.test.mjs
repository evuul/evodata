// Prevents partial-hour admission, mismatched timelines, and changing live populations after expansion.

import test from "node:test";
import assert from "node:assert/strict";
import { buildExpandingHourlyBaseline } from "./hourlyLobbyExpansion.js";
import { buildHourlyLobbyComparison } from "./hourlyLobbyComparison.js";
import { cohortSignature } from "./hourlyLobbyPolicy.js";
import { publishedHourlyCohort } from "./hourlyLobbyCohortSelection.js";
import { HOURLY_LOBBY_COHORT } from "../config/hourlyLobbyCohort.js";

const now = Date.parse("2026-09-06T12:00:00Z");
const base = { id: "test-base", gameIds: ["base"] };
const catalog = ["base", "new-one", "new-two"].map((id) => ({ id }));
function fixtures(dayCount = 7, selectedBase = base) {
  const observations = [], gameObservations = [];
  for (let day = 0; day < dayCount; day++) for (let hour = 0; hour < 24; hour++) for (const minute of [0, 30]) {
    const ts = Date.parse("2026-09-06T00:00:00+02:00") - (dayCount - day) * 86400000 + hour * 3600000 + minute * 60000;
    observations.push({ ts, newestTs: ts, value: 1000 + day + hour, signature: cohortSignature(selectedBase) });
    gameObservations.push({ id: "new-one", ts, value: 100 + day + minute, source: "unibet" });
  }
  return { observations, gameObservations };
}
const build = (options = {}) => buildExpandingHourlyBaseline({ ...fixtures(), now, base, catalog, ...options });

test("promotes only after every hour has seven shared days and recent coverage, then rebuilds every hour", () => {
  const data = fixtures();
  const almost = data.gameObservations.filter((point, index) => !(index === 6 || index === 7));
  const waiting = build({ gameObservations: almost });
  assert.deepEqual(waiting.cohort.gameIds, ["base"]);
  assert.equal(waiting.expansion.waitingGames[0].coveredHours, 23);
  const included = build({ previous: waiting });
  assert.deepEqual(included.cohort.gameIds, ["base", "new-one"]);
  assert.equal(included.recentHours, 24);
  assert.equal(included.hourlyByHour[0].baselineAvg, 1121);
  assert.equal(included.hourlyByHour[23].baselineAvg, 1144);
  assert.deepEqual(included.expansion.lastChange.addedGameIds, ["new-one"]);
});

test("new readings at different ten-minute intervals cannot qualify from independent hourly averages", () => {
  const data = fixtures();
  const result = build({ gameObservations: data.gameObservations.map((point) => ({ ...point, ts: point.ts + 10 * 60000 })) });
  assert.deepEqual(result.cohort.gameIds, ["base"]);
  assert.equal(result.expansion.waitingGames[0].coveredHours, 0);
});

test("individually ready games with disjoint dates are not promoted together", () => {
  const data = fixtures(14);
  const readings = data.gameObservations.map((point, index) => ({ ...point, id: Math.floor(index / 48) % 2 ? "new-two" : "new-one" }));
  const result = build({ observations: data.observations, gameObservations: readings });
  assert.deepEqual(result.cohort.gameIds, ["base", "new-one"]);
  assert.equal(result.expansion.waitingGames[0].id, "new-two");
  assert.equal(result.expansion.waitingGames[0].coveredHours, 0);
});

test("temporary missing history never shrinks an already admitted selection", () => {
  const previous = build();
  const missing = build({ previous, gameObservations: [] });
  assert.deepEqual(missing.cohort, previous.cohort);
  assert.equal(missing.readyHours, 0);
  assert.deepEqual(missing.expansion.lastChange, previous.expansion.lastChange);
});

test("old or reconstructed evidence cannot automatically admit a game as recently covered", () => {
  const data = fixtures();
  const archived = build({ observations: data.observations.map((point) => ({ ...point, quality: "reconstructed" })) });
  assert.deepEqual(archived.cohort.gameIds, ["base"]);
  const old = build({ now: now + 14 * 86400000 });
  assert.deepEqual(old.cohort.gameIds, ["base"]);
});

test("frozen primary readings cannot be hidden by alternating recovery readings", () => {
  const data = fixtures();
  const frozen = data.gameObservations.map((point) => ({ ...point, source: "primary", value: 999999 }));
  const result = build({ gameObservations: [...frozen, ...data.gameObservations] });
  assert.equal(result.hourlyByHour[0].baselineAvg, 1121);
  const onlyFrozen = build({ gameObservations: frozen });
  assert.deepEqual(onlyFrozen.cohort.gameIds, ["base"]);
});

test("primary readings already verified at collection are not rejected a second time", () => {
  const data = fixtures();
  const verified = data.gameObservations.map((point) => ({
    ...point, source: "primary", value: 500, qualityVerified: true,
  }));
  const result = build({ gameObservations: verified });
  assert.deepEqual(result.cohort.gameIds, ["base", "new-one"]);
  assert.equal(result.recentHours, 24);
});

test("published expansion controls live membership and missing included games pause all deltas", () => {
  const data = fixtures(7, HOURLY_LOBBY_COHORT);
  const baseline = buildExpandingHourlyBaseline({ ...data,
    gameObservations: data.gameObservations.map((point) => ({ ...point, id: "dragon-tiger" })), now });
  assert.equal(baseline.cohort.gameIds.length, HOURLY_LOBBY_COHORT.gameIds.length + 1);
  const items = baseline.cohort.gameIds.map((id) => ({ id, players: 100, fetchedAt: new Date(now).toISOString() }));
  const result = buildHourlyLobbyComparison({ baseline, items, now });
  assert.equal(result.currentTotal, (HOURLY_LOBBY_COHORT.gameIds.length + 1) * 100);
  assert.equal(result.coverage.expectedGames, HOURLY_LOBBY_COHORT.gameIds.length + 1);
  assert.equal(buildHourlyLobbyComparison({ baseline, items: items.filter((item) => item.id !== "dragon-tiger"), now }).currentTotal, null);
  assert.equal(buildHourlyLobbyComparison({ baseline, items: [...items, { id: "unknown", players: 1000000 }], now }).currentTotal, (HOURLY_LOBBY_COHORT.gameIds.length + 1) * 100);
  assert.equal(publishedHourlyCohort({ ...baseline, signature: "wrong" }), null);
  assert.equal(publishedHourlyCohort({ ...baseline, cohort: { ...baseline.cohort, gameIds: [...baseline.cohort.gameIds, "unknown"] } }), null);
});

test("complete per-game history repairs a sparse base timeline and expands the shared cohort", () => {
  const data = fixtures();
  const baseGames = data.observations.map((point) => ({
    id: "base", ts: point.ts, value: point.value, source: "unibet",
  }));
  const sparseBase = data.observations.filter((_, index) => index % 48 === 0);
  const result = buildExpandingHourlyBaseline({
    observations: sparseBase,
    gameObservations: [...baseGames, ...data.gameObservations],
    now, base, catalog,
  });
  assert.deepEqual(result.cohort.gameIds, ["base", "new-one"]);
  assert.equal(result.recentHours, 24);
  assert.equal(result.hourlyByHour[10].lastDay, "2026-09-05");
});
