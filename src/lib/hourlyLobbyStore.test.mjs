// Verifies persisted coverage, retries, version isolation, and optional real-Redis concurrency.

import assert from "node:assert/strict";
import test from "node:test";
import { createClient } from "redis";
import { buildHourlyBaseline } from "./hourlyLobbyAggregation.js";
import { buildHourlyObservation, cohortSignature } from "./hourlyLobbyPolicy.js";
import {
  getHourlyLobbyObservations, getStoredHourlyBaseline, hourlyStoragePrefix,
  saveHourlyLobbyObservation, setStoredHourlyBaseline,
  getStoredHourlyArchive, setStoredHourlyArchive,
} from "./hourlyLobbyStore.js";

const getMemory = async () => null;
const dayNow = Date.parse("2026-09-06T10:00:00Z");
const itemsAt = (ts, value = 100) => [{ id: "one", players: value, fetchedAt: new Date(ts).toISOString() }];

test("incremental storage produces the same weighted baseline as a single historical batch", async () => {
  const cohort = { id: "roundtrip", gameIds: ["one"] };
  const options = { cohort, getRedis: getMemory };
  const all = [];
  for (let day = 1; day <= 8; day++) {
    for (const minute of [0, 10, 20, 30]) {
      const ts = Date.parse("2026-09-06T07:00:00Z") - day * 86400000 + minute * 60000;
      const items = itemsAt(ts, day * 100);
      all.push(buildHourlyObservation(items, { now: ts, cohort }));
      await saveHourlyLobbyObservation(items, { ...options, now: ts });
      assert.equal((await saveHourlyLobbyObservation(items, { ...options, now: ts })).saved, false);
    }
  }
  const loaded = await getHourlyLobbyObservations({ ...options, now: dayNow });
  assert.equal(loaded.length, 32);
  assert.deepEqual(buildHourlyBaseline(loaded, { now: dayNow, cohort }), buildHourlyBaseline(all, { now: dayNow, cohort }));
});

test("storage key changes even if the cohort list changes without a version bump", () => {
  assert.notEqual(hourlyStoragePrefix({ id: "same", gameIds: ["one"] }), hourlyStoragePrefix({ id: "same", gameIds: ["one", "two"] }));
});

test("a stale reader cannot shrink a committed expansion even with a later computation timestamp", async () => {
  const base = { id: "monotonic", gameIds: ["one"] };
  const expanded = { id: "monotonic-expanded", gameIds: ["one", "two"] };
  const options = { cohort: base, getRedis: getMemory };
  const included = buildHourlyBaseline([], { now: dayNow, cohort: expanded });
  const staleReader = buildHourlyBaseline([], { now: dayNow + 60000, cohort: base });
  await setStoredHourlyBaseline(included, options);
  assert.equal(await setStoredHourlyBaseline(staleReader, options), false);
  assert.deepEqual(await getStoredHourlyBaseline(options), included);
});

test("storage errors propagate instead of reporting an empty successful history", async () => {
  const broken = async () => ({ pipeline: () => ({ hgetall() {}, exec: async () => { throw new Error("offline"); } }) });
  await assert.rejects(getHourlyLobbyObservations({ now: dayNow, getRedis: broken }), /offline/);
  await assert.rejects(getHourlyLobbyObservations({ now: dayNow, getRedis: async () => ({ pipeline: () => ({ hgetall() {}, exec: async () => [] }) }) }), /Incomplete/);
});

test("a later daily materialization cannot be overwritten by a slow older job", async () => {
  const cohort = { id: "newer-materialization", gameIds: ["one"] };
  const options = { cohort, getRedis: getMemory };
  const newer = buildHourlyBaseline([], { now: dayNow, cohort });
  const older = buildHourlyBaseline([], { now: dayNow - 86400000, cohort });
  await setStoredHourlyBaseline(newer, options);
  await setStoredHourlyBaseline(older, options);
  assert.deepEqual(await getStoredHourlyBaseline(options), newer);
});

const redisUrl = process.env.HOURLY_TEST_REDIS_URL;
test("an archive cannot be overwritten by a later empty import or stored under a different cohort", async () => {
  const cohort = { id: "archive-roundtrip", gameIds: ["one"] };
  const options = { cohort, getRedis: getMemory };
  const archive = { signature: cohortSignature(cohort), points: [[dayNow - 86400000, 123]] };
  assert.equal(await getStoredHourlyArchive(options), null);
  assert.deepEqual(await setStoredHourlyArchive(archive, options), archive);
  assert.deepEqual(await setStoredHourlyArchive({ ...archive, points: [] }, options), archive);
  assert.deepEqual(await getStoredHourlyArchive(options), archive);
  await assert.rejects(setStoredHourlyArchive({ ...archive, signature: "other" }, options), /Incompatible/);
});

test("Redis atomically deduplicates concurrent writes and protects newer materializations", { skip: !redisUrl }, async () => {
  assert.ok(["127.0.0.1", "localhost"].includes(new URL(redisUrl).hostname), "integration test must use local Redis");
  const client = createClient({ url: redisUrl });
  await client.connect();
  const cohort = { id: `integration-${Date.now()}`, gameIds: ["one"] };
  const adapter = {
    get: (key) => client.get(key),
    createScript: (script) => ({ eval: (keys, args) => client.eval(script, { keys, arguments: args }) }),
    pipeline: () => {
      const multi = client.multi();
      return { hgetall: (key) => multi.hGetAll(key), exec: () => multi.exec() };
    },
  };
  const options = { cohort, getRedis: async () => adapter };
  const ts = Date.parse("2026-09-05T07:00:00Z");
  try {
    await Promise.all(Array.from({ length: 20 }, (_, index) => saveHourlyLobbyObservation(itemsAt(ts + index * 1000, index), { ...options, now: ts + 20000 })));
    const data = await getHourlyLobbyObservations({ ...options, now: dayNow });
    assert.equal(data.length, 1);
    assert.equal(data[0].value, 19);
    assert.equal(data[0].ts, ts + 19000);
    const dayKey = `${hourlyStoragePrefix(cohort)}:day:2026-09-05`;
    assert.ok(await client.ttl(dayKey) > 89 * 86400);
    const newer = buildHourlyBaseline(data, { now: dayNow, cohort });
    const older = buildHourlyBaseline([], { now: dayNow - 86400000, cohort });
    await setStoredHourlyBaseline(newer, options);
    await setStoredHourlyBaseline(older, options);
    assert.deepEqual(await getStoredHourlyBaseline(options), newer);
    const archive = { signature: cohortSignature(cohort), points: [[ts, 19]] };
    await setStoredHourlyArchive(archive, options);
    const retries = await Promise.all(Array.from({ length: 10 }, () => setStoredHourlyArchive({ ...archive, points: [] }, options)));
    assert.ok(retries.every((result) => result.points[0][1] === 19));
    assert.deepEqual(await getStoredHourlyArchive(options), archive);
    const expanded = buildHourlyBaseline([], { now: dayNow, cohort: { ...cohort, gameIds: ["one", "two"] } });
    await setStoredHourlyBaseline(expanded, options);
    const staleReader = buildHourlyBaseline([], { now: dayNow + 60000, cohort });
    assert.equal(await setStoredHourlyBaseline(staleReader, options), false);
    assert.deepEqual((await getStoredHourlyBaseline(options)).cohort.gameIds, ["one", "two"]);
  } finally {
    for await (const keys of client.scanIterator({ MATCH: `${hourlyStoragePrefix(cohort)}:*` })) await client.del(keys);
    await client.quit();
  }
});
