// Checks source selection, daily coverage, duplicate handling and the regular lobby boundary.

import test from "node:test";
import assert from "node:assert/strict";
import { GAMES } from "../config/games.js";
import { buildRegularLobbyDaily, selectRegularLobbyReadings } from "./regularLobbyDaily.js";
import { applyRegularLobbyDailyToAggregates, applyRegularLobbyDailyToOverview, isRegularLobbyDailyRecord } from "./regularLobbyDailySnapshot.js";
import { materializeRegularLobbyDay, refreshRegularLobbyDaily } from "./regularLobbyDailyMaterializer.js";
import { getUnibetPilotGameId } from "./unibetPilotFallback.js";

const date = "2026-09-07";
const start = Date.parse("2026-09-06T22:00:00Z");
const now = start + 86400000;
const catalog = [{ id: "one" }, { id: "two" }];
function daySamples({ ts = start, count = 144, games = catalog } = {}) {
  return Array.from({ length: count }, (_, i) => ({
    status: "ok", collectedAt: new Date(ts + i * 600000).toISOString(),
    games: [...games.map(g => ({ id: g.id, players: 100 + i })), { id: "extended-only", players: 1_000_000 }],
  }));
}

test("higher fresh sources and aliases include only the configured regular games", () => {
  const fetchedAt = new Date(start).toISOString();
  const sample = { status: "ok", collectedAt: fetchedAt, games: [
    { id: "fan-tan", players: 800 }, { id: "two", players: 100 }, { id: "extended-only", players: 999999 },
  ] };
  const values = selectRegularLobbyReadings([
    { id: "fan-tan-live", players: 500, fetchedAt }, { id: "two", players: 200, fetchedAt },
  ], sample, { now: start, catalog: [{ id: "fan-tan-live" }, { id: "two" }] });
  assert.deepEqual(values.map(p => [p.id, p.players, p.source]), [["fan-tan-live", 800, "unibet"], ["two", 200, "primary"]]);
});

test("stale, frozen, missing, invalid and duplicate source values never win", () => {
  const fetchedAt = new Date(start).toISOString();
  for (const item of [
    { players: null }, { players: "" }, { players: -1 }, { players: 5_000_001 },
    { players: 9999, stale: true }, { players: 9999, stuck: true },
    { players: 9999, fetchedAt: new Date(start - 1200001).toISOString() },
    { players: 9999, fetchedAt: new Date(start + 1).toISOString() },
  ]) {
    const readings = selectRegularLobbyReadings([{ id: "one", fetchedAt, ...item }], daySamples()[0], { now: start, catalog });
    assert.equal(readings[0].players, 100);
  }
  const duplicate = { ...daySamples()[0], games: [{ id: "one", players: 100 }, { id: "one", players: 200 }] };
  assert.equal(selectRegularLobbyReadings([], duplicate, { now: start, catalog }).length, 0);
});

test("a native-only game missing from complete Unibet lists is recorded as offline", () => {
  const fetchedAt = new Date(start).toISOString();
  const nativeCatalog = [{ id: "offline", source: "unibet", unibetId: "offline" }];
  const complete = {
    status: "ok",
    collectedAt: fetchedAt,
    sourceUrls: ["livecasinogameshowslobby", "livecasinoroulettelobby", "livecasinobaccaratlobby"],
    games: [],
  };
  assert.deepEqual(selectRegularLobbyReadings([], complete, {
    now: start, catalog: nativeCatalog,
  }), [{ id: "offline", players: 0, fetchedAt, source: "unibet" }]);
  assert.deepEqual(selectRegularLobbyReadings([], {
    ...complete, sourceUrls: complete.sourceUrls.slice(1),
  }, { now: start, catalog: nativeCatalog }), []);
  assert.deepEqual(selectRegularLobbyReadings([], {
    ...complete, games: [{ id: "offline", players: null }],
  }, { now: start, catalog: nativeCatalog }), []);
});

test("all 37 regular games contribute once, with retries carrying no extra weight", () => {
  const samples = daySamples({ games: GAMES.map(g => ({ id: g.unibetId ?? getUnibetPilotGameId(g.id) })) });
  const result = buildRegularLobbyDaily([...samples, ...samples], new Map(), date, { now });
  assert.equal(result.coverage.slots, 144);
  assert.equal(result.gameIds.length, 37);
  assert.equal(result.avgPlayers, 171.5 * 37);
  assert.equal(result.averages["extended-only"], undefined);
  assert.equal(isRegularLobbyDailyRecord(result), true);
});

test("fresh primary data raises its observation without averaging both sources together", () => {
  const samples = daySamples();
  const primary = new Map([["one", [{ ts: start, value: 1000 }]]]);
  const result = buildRegularLobbyDaily(samples, primary, date, { catalog, now });
  // The source expires after 20 minutes, so only three observations use it.
  assert.equal(result.sourceCounts.primary, 3);
  assert.equal(result.averages.one, Math.round((171.5 * 144 + 900 + 899 + 898) / 144 * 100) / 100);
  assert.equal(result.averages.two, 171.5);
});

test("native provenance prevents legacy series from being used twice as independent sources", () => {
  const samples = daySamples();
  samples[0].seriesSavedGameIds = ["one"];
  const result = buildRegularLobbyDaily(samples, new Map([["one", [{ ts: start, value: 9999 }]]]), date, { catalog, now });
  assert.equal(result.sourceCounts.primary, 0);
  const recorded = samples.map(sample => ({ ...sample,
    regularLobbyReadings: selectRegularLobbyReadings([], sample, { now: Date.parse(sample.collectedAt), catalog }),
  }));
  assert.deepEqual(buildRegularLobbyDaily(recorded, new Map(), date, { catalog, now }).averages, result.averages);
});

test("frozen primary runs cannot lift the daily average", () => {
  const primary = new Map([["one", Array.from({ length: 4 }, (_, i) => ({ ts: start + i * 600000, value: 9999 }))]]);
  const result = buildRegularLobbyDaily(daySamples(), primary, date, { catalog, now });
  assert.equal(result.sourceCounts.primary, 0);
});

test("six observations, missing games and concentrated gaps fail daily coverage", () => {
  const samples = daySamples();
  for (const subset of [samples.slice(0, 6), samples.filter((_, i) => i < 60 || i >= 66), samples.map(s => ({ ...s, games: s.games.slice(0, 1) }))]) {
    const result = buildRegularLobbyDaily(subset, new Map(), date, { catalog, now });
    assert.equal(result.complete, false);
    assert.equal(result.avgPlayers, undefined);
  }
  assert.throws(() => buildRegularLobbyDaily(samples, new Map(), date, { catalog, now: start }), /completed/);
  assert.throws(() => buildRegularLobbyDaily([], new Map(), "2026-02-30", { catalog, now }), /Invalid/);
});

test("a well-covered day tolerates four missing slots in one hour but rejects five", () => {
  const samples = daySamples();
  const fourMissing = samples.filter((_, index) => index < 60 || index >= 64);
  const accepted = buildRegularLobbyDaily(fourMissing, new Map(), date, { catalog, now });
  assert.equal(accepted.complete, true);
  assert.deepEqual(accepted.coverage, { slots: 140, expectedSlots: 144, missingHours: [] });
  const fiveMissing = samples.filter((_, index) => index < 60 || index >= 65);
  const rejected = buildRegularLobbyDaily(fiveMissing, new Map(), date, { catalog, now });
  assert.equal(rejected.complete, false);
  assert.deepEqual(rejected.coverage.missingHours, [10]);
});

test("Stockholm daylight saving days have 138 or 150 equally weighted slots", () => {
  for (const [day, ts, count] of [["2026-03-29", Date.parse("2026-03-28T23:00:00Z"), 138], ["2026-10-25", Date.parse("2026-10-24T22:00:00Z"), 150]]) {
    const result = buildRegularLobbyDaily(daySamples({ ts, count }), new Map(), day, { catalog, now: ts + count * 600000 });
    assert.equal(result.complete, true);
    assert.equal(result.coverage.expectedSlots, count);
  }
});

test("corrections update every trend view and aggregate consumer without mutating input", () => {
  const record = buildRegularLobbyDaily(daySamples(), new Map(), date, { catalog, now });
  const base = { dailyTotals: [{ date, avgPlayers: 10 }], slugDaily: { one: [{ date, avg: 5 }], two: [{ date, avg: 5 }], retired: [{ date, avg: 9999 }] }, estimatedDates: [date], averages: { days7: [] } };
  const corrected = applyRegularLobbyDailyToOverview(base, [record], { catalog, forecastIds: new Set(["one"]) });
  assert.equal(corrected.dailyTotals[0].avgPlayers, 343);
  assert.equal(corrected.rawDailyTotals[0].avgPlayers, 343);
  assert.equal(corrected.adjustedDailyTotals[0].avgPlayers, 343);
  assert.equal(corrected.forecastDailyTotals[0].avgPlayers, 171.5);
  assert.deepEqual(corrected.slugDaily.retired, []);
  assert.equal(corrected.averages.days7[0].avgPlayers, 343);
  assert.deepEqual(corrected.estimatedDates, []);
  assert.equal(base.dailyTotals[0].avgPlayers, 10);
  const aggregates = new Map([["one", new Map([[date, { sum: 50, count: 1, max: 200 }]])]]);
  const patched = applyRegularLobbyDailyToAggregates(aggregates, [record], { catalog });
  assert.equal(patched.get("one").get(date).sum / patched.get("one").get(date).count, 171.5);
  assert.equal(patched.get("one").get(date).max, 200);
  assert.equal(aggregates.get("one").get(date).count, 1);
  assert.equal(isRegularLobbyDailyRecord({ ...record, gameIds: ["wrong"] }, catalog), false);
  const incomplete = buildRegularLobbyDaily(daySamples().slice(0, 6), new Map(), date, { catalog, now });
  const hidden = applyRegularLobbyDailyToOverview(base, [incomplete], { catalog });
  assert.deepEqual(hidden.dailyTotals, []);
  assert.deepEqual(hidden.slugDaily.one, []);
  assert.equal(hidden.dailyQuality[date].complete, false);
  assert.equal(applyRegularLobbyDailyToAggregates(aggregates, [incomplete], { catalog }).get("one").has(date), false);
});

test("materialization skips persisted days and propagates source or persistence failures", async () => {
  const existing = { date, complete: true };
  assert.equal((await materializeRegularLobbyDay(date, { readDays: async () => [existing], readHistory: () => assert.fail("unexpected read") })).skipped, true);
  await assert.rejects(materializeRegularLobbyDay(date, {
    readDays: async () => [], readHistory: async () => { throw new Error("source failed"); }, readSeries: async () => new Map(),
  }), /source failed/);
  const samples = daySamples({ games: GAMES.map(g => ({ id: g.unibetId ?? g.id })) });
  // Persist failures are checked with already recorded IDs so aliases cannot hide missing games.
  samples.forEach((s, i) => { s.regularLobbyReadings = GAMES.map(g => ({ id: g.id, players: i + 100, source: "primary", fetchedAt: s.collectedAt })); });
  await assert.rejects(materializeRegularLobbyDay(date, {
    now, readDays: async () => [], readHistory: async () => samples, readSeries: async () => new Map(), saveDays: async () => { throw new Error("write failed"); },
  }), /write failed/);
});

test("regular collections publish yesterday and retry an interrupted overview update", async () => {
  const record = buildRegularLobbyDaily(daySamples(), new Map(), date, { catalog, now });
  let published = 0;
  const options = {
    now, materializeDay: async target => { assert.equal(target, date); return record; },
    readOverview: async () => ({ data: { dailyTotals: [{ date, avgPlayers: 1 }] } }),
    publishOverview: async (aggregates, target) => { assert.equal(target, date); assert.equal(aggregates.size, 0); published++; },
  };
  assert.equal((await refreshRegularLobbyDaily(options)).ok, true);
  assert.equal(published, 1);
  await refreshRegularLobbyDaily({ ...options, readOverview: async () => ({ data: { dailyQuality: { [date]: { complete: true, method: record.method } } } }) });
  assert.equal(published, 1);
  const failed = await refreshRegularLobbyDaily({ ...options, materializeDay: async () => ({ complete: false, reason: "insufficient-daily-coverage" }) });
  assert.equal(failed.ok, false);
  assert.equal(published, 1);
});


test("new games do not invalidate days before their first full tracking day", () => {
  const expanded = [...catalog, { id: "new-game", dailyTrackingFrom: "2026-09-08" }];
  const oldDay = buildRegularLobbyDaily(daySamples(), new Map(), date, { catalog: expanded, now });
  assert.equal(oldDay.complete, true);
  assert.deepEqual(oldDay.gameIds, ["one", "two"]);
  assert.equal(isRegularLobbyDailyRecord(oldDay, expanded), true);
  const nextDay = buildRegularLobbyDaily(daySamples({ ts: now }), new Map(), "2026-09-08", {
    catalog: expanded, now: now + 86400000,
  });
  assert.equal(nextDay.complete, false);
  const base = { dailyTotals: [], slugDaily: { "new-game": [{ date, avg: 999 }] } };
  assert.deepEqual(applyRegularLobbyDailyToOverview(base, [oldDay], { catalog: expanded }).slugDaily["new-game"], []);
  const aggregates = new Map([["new-game", new Map([[date, { sum: 999, count: 1 }]])]]);
  assert.equal(applyRegularLobbyDailyToAggregates(aggregates, [oldDay], { catalog: expanded }).get("new-game").has(date), false);
});

test("native Unibet rows fill omissions in recorded readings without changing existing values", () => {
  const samples = daySamples().map(sample => ({
    ...sample,
    regularLobbyReadings: [{ id: "one", players: 900, source: "primary", fetchedAt: sample.collectedAt }],
    games: sample.games.map(game => ({ ...game, provider: "Evolution", href: `${game.id}@evolution` })),
  }));
  const record = buildRegularLobbyDaily(samples, new Map(), date, { catalog, now });
  assert.equal(record.complete, true);
  assert.equal(record.averages.one, 900);
  assert.equal(record.averages.two, 171.5);
  assert.deepEqual(record.sourceCounts, { primary: 144, unibet: 144 });
  assert.equal(record.averages["extended-only"], undefined);

  for (const override of [{ provider: undefined }, { href: undefined }, { players: null },
    { stale: true }, { stuck: true }, { fetchedAt: new Date(start - 1200001).toISOString() }]) {
    const invalid = samples.map(sample => ({ ...sample,
      games: sample.games.map(game => game.id === "two" ? { ...game, ...override } : game),
    }));
    assert.equal(buildRegularLobbyDaily(invalid, new Map(), date, { catalog, now }).complete, false);
  }
});
