// Covers one-time reconstruction, bounded source reads, failure handling, and cohort isolation.

import assert from "node:assert/strict";
import test from "node:test";
import { HOURLY_LOBBY_COHORT } from "../config/hourlyLobbyCohort.js";
import { buildHourlyHistoryArchive, hourlyArchiveObservations, loadHourlyHistoryArchive, readHourlyGameHistory } from "./hourlyLobbyHistoryArchive.js";
import { loadHourlyLobbyBaseline } from "./hourlyLobbyBaseline.js";
import { buildHourlyBaseline } from "./hourlyLobbyAggregation.js";

const now = Date.parse("2026-09-06T12:00:00Z");
const series = Object.fromEntries(HOURLY_LOBBY_COHORT.gameIds.map((id, game) => [id,
  Array.from({ length: 7 }, (_, day) => [0, 20].map((minute) => ({
    ts: Date.parse(`2026-08-${String(20 + day).padStart(2, "0")}T09:${String(minute).padStart(2, "0")}:00+02:00`),
    value: 100 + game + day * 10 + minute,
  }))).flat(),
]));

test("reuses the archived compact history without reading raw game lists again", async () => {
  const archive = buildHourlyHistoryArchive(series, { now });
  const result = await loadHourlyHistoryArchive({ now, getArchive: async () => archive,
    readSeries: async () => assert.fail("raw history must only be imported once"),
    saveArchive: async () => assert.fail("must not rewrite history") });
  assert.equal(result, archive);
  assert.equal(archive.points.length, 14);
  assert.equal(archive.coverage.rawSamples, 336);
  assert.ok(hourlyArchiveObservations(archive).every((point) => point.quality === "reconstructed"));
});

test("initial materialization incorporates real archived data even when the new observation store is empty", async () => {
  let stored;
  const archive = await loadHourlyHistoryArchive({ now, getArchive: async () => null,
    readSeries: async () => series, saveArchive: async (value) => { stored = value; return value; } });
  const baseline = await loadHourlyLobbyBaseline({ now, getBaseline: async () => null,
    getObservations: async () => [], getHistory: async () => archive, setBaseline: async () => {} });
  assert.equal(stored, archive);
  assert.equal(baseline.readyHours, 1);
  assert.equal(baseline.hourlyByHour[9].baselineAvg, 3636);
  assert.equal(baseline.hourlyByHour[9].recentDistinctDays, 0);
  assert.equal(baseline.hourlyByHour[9].status, "historical-reference");
  assert.equal(baseline.history.rawSamples, 336);
});

test("a failed import preserves the previous baseline and an empty database is eligible for a later import", async () => {
  await assert.rejects(loadHourlyLobbyBaseline({ now, getBaseline: async () => buildHourlyBaseline([], { now: now - 86400000 }),
    getObservations: async () => [], getHistory: async () => { throw new Error("read failed"); },
    setBaseline: async () => assert.fail("must preserve previous cache") }));
  const empty = await loadHourlyHistoryArchive({ now, getArchive: async () => null, readSeries: async () => ({}),
    saveArchive: async () => assert.fail("do not permanently seal an empty import") });
  assert.equal(empty.coverage.rawSamples, 0);
});

test("new game lists and old total-lobby rows never change a historical reference", () => {
  const original = buildHourlyHistoryArchive(series, { now });
  const extras = { ...series, "new-game": series[HOURLY_LOBBY_COHORT.gameIds[0]], "cs:lobby-total:v1:samples": [{ ts: now - 86400000, value: 1000000 }] };
  assert.deepEqual(buildHourlyHistoryArchive(extras, { now }), original);
  assert.throws(() => hourlyArchiveObservations({ ...original, signature: "other-games" }), /Incompatible/);
});

test("the source read is limited to fixed games and bounded batches, and rejects partial responses", async () => {
  const commands = [];
  let largestBatch = 0;
  const redis = { pipeline() {
    const batch = [];
    return { lrange(...args) { batch.push(args); commands.push(args); }, async exec() {
      largestBatch = Math.max(largestBatch, batch.length);
      return batch.map(() => [JSON.stringify({ ts: now - 86400000, value: 1 }), "invalid-json"]);
    } };
  } };
  const result = await readHourlyGameHistory({ getRedis: async () => redis });
  assert.equal(Object.keys(result).length, 24);
  assert.equal(largestBatch, 6);
  assert.ok(commands.every(([key, first, last]) => key.startsWith("cs:") && first === 0 && last === 4999));
  assert.ok(Object.values(result).every((rows) => rows.length === 1));
  await assert.rejects(readHourlyGameHistory({ getRedis: async () => ({ pipeline: () => ({ lrange() {}, exec: async () => [] }) }) }), /Incomplete/);
});

test("bounded historical windows expire naturally without filling gaps from a previous baseline", () => {
  const archive = buildHourlyHistoryArchive(series, { now });
  const future = buildHourlyBaseline(hourlyArchiveObservations(archive), { now: now + 60 * 86400000 });
  assert.equal(future.readyHours, 0);
  assert.equal(future.samples, 0);
});
