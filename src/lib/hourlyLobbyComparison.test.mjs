// Prevents artificial growth from new games, missing readings, and stale comparisons.

import assert from "node:assert/strict";
import test from "node:test";
import { buildHourlyLobbyComparison } from "./hourlyLobbyComparison.js";
import { buildHourlyObservation, cohortSignature, HOURLY_BASELINE_SOURCE } from "./hourlyLobbyPolicy.js";
import { HOURLY_LOBBY_COHORT } from "../config/hourlyLobbyCohort.js";

const now = Date.parse("2026-09-06T10:00:00Z");
const cohort = { id: "test-cohort", gameIds: ["one", "two"] };
const items = ["one", "two"].map((id) => ({ id, players: 100, fetchedAt: new Date(now - 60000).toISOString() }));
const baseline = {
  source: HOURLY_BASELINE_SOURCE, signature: cohortSignature(cohort), computedAt: new Date(now).toISOString(),
  hourlyByHour: Array.from({ length: 24 }, (_, hour) => ({ hour: String(hour).padStart(2, "0"), baselineAvg: 100 + hour })),
};
const compare = (options = {}) => buildHourlyLobbyComparison({ baseline, items, now, cohort, ...options });

test("adding a large newly tracked game never changes any historical or live comparison", () => {
  const original = compare();
  const expanded = compare({ items: [...items, { id: "new-game", players: 500000, fetchedAt: items[0].fetchedAt }] });
  assert.deepEqual(expanded, original);
  assert.equal(original.currentTotal, 200);
  assert.equal(original.rows[0].delta, 100);
  assert.equal(original.rows[12].isCurrentHour, true);
  assert.equal(original.rows[23].currentTotal, 200);
});

test("missing or unhealthy cohort games pause comparison without changing the historical curve", () => {
  for (const change of [{ players: null }, { players: "" }, { players: false }, { players: -1 }, { stuck: true }, { stale: true },
    { fetchedAt: new Date(now + 1).toISOString() }, { fetchedAt: new Date(now - 21 * 60000).toISOString() }]) {
    const result = compare({ items: [items[0], { ...items[1], ...change }] });
    assert.equal(result.currentTotal, null);
    assert.equal(result.rows[12].baseline, 112);
    assert.equal(result.rows.every((row) => row.delta === null), true);
  }
  assert.equal(compare({ items: [items[0]] }).currentTotal, null);
  assert.equal(compare({ items: [...items, items[0]] }).currentTotal, null);
});

test("rejects unsynchronized sources and retains genuine zeroes without dividing by zero", () => {
  const differentTimes = [items[0], { ...items[1], fetchedAt: new Date(now - 12 * 60000).toISOString() }];
  assert.equal(compare({ items: differentTimes }).coverage.status, "unsynchronized-live");
  const zero = compare({ items: items.map((item) => ({ ...item, players: 0 })),
    baseline: { ...baseline, hourlyByHour: [{ hour: "12", baselineAvg: 0 }] } });
  assert.equal(zero.currentTotal, 0);
  assert.equal(zero.rows[0].deltaPlayers, 0);
  assert.equal(zero.rows[0].delta, null);
});

test("old or incompatible materializations cannot produce a live delta", () => {
  const stale = compare({ baseline: { ...baseline, computedAt: new Date(now - 49 * 3600000).toISOString() } });
  assert.equal(stale.coverage.status, "stale-baseline");
  assert.equal(stale.currentTotal, null);
  assert.equal(stale.rows[0].baseline, 100);
  assert.equal(compare({ baseline: { ...baseline, signature: "changed" } }).rows.length, 0);
});

test("ages shared live values and rolls the current hour forward without a network fetch", () => {
  const nextHour = compare({ now: now + 3600000 });
  assert.equal(nextHour.currentHour, "13");
  assert.equal(nextHour.currentTotal, null);
  assert.equal(nextHour.rows[13].isCurrentHour, true);
});

test("collection uses source time, rejects old observations, and ignores new games", () => {
  const observation = buildHourlyObservation(items, { now, cohort });
  assert.equal(observation.ts, now - 60000);
  assert.equal(observation.value, 200);
  assert.deepEqual(buildHourlyObservation([...items, { id: "new", players: 20000 }], { now, cohort }), observation);
  assert.equal(buildHourlyObservation(items, { now: now + 10 * 60000, cohort }), null);
});

test("the cohort stays independent of the changing general game catalog", () => {
  assert.equal(HOURLY_LOBBY_COHORT.gameIds.length, 22);
  assert.ok(Object.isFrozen(HOURLY_LOBBY_COHORT.gameIds));
  assert.equal(new Set(HOURLY_LOBBY_COHORT.gameIds).size, 22);
  assert.equal(HOURLY_LOBBY_COHORT.gameIds.includes("craps-live"), false);
  assert.equal(HOURLY_LOBBY_COHORT.gameIds.includes("dragon-tiger"), false);
  assert.equal(HOURLY_LOBBY_COHORT.gameIds.includes("fan-tan-live"), false);
});

test("missing materialization is not reported as missing historical measurements", () => {
  assert.equal(compare({ baseline: null }).coverage.status, "not-materialized");
});

test("a historical reference remains usable against the same fresh live games with provenance intact", () => {
  const result = compare({ baseline: { ...baseline, hourlyByHour: [
    { hour: "12", baselineAvg: 100, status: "historical-reference", recentDistinctDays: 0, reconstructedDays: 10 },
  ] } });
  assert.equal(result.rows[0].delta, 100);
  assert.equal(result.rows[0].status, "historical-reference");
  assert.equal(result.rows[0].recentDistinctDays, 0);
});
