// Checks candidate-source selection, freshness, retry safety, and bounded reads in real Redis when available.

import assert from "node:assert/strict";
import test from "node:test";
import { createClient } from "redis";
import { saveHourlyGameObservations, getHourlyGameObservations, selectHourlyPrimaryCandidates, selectHourlyUnibetCandidates } from "./hourlyLobbyGameStore.js";

const now = Date.parse("2026-09-05T12:00:00Z");
const tomorrow = now + 86400000;
const memory = async () => null;
const item = (id, changes = {}) => ({ id, players: 100, fetchedAt: new Date(now).toISOString(), qualityVerified: true, ...changes });

test("native recovery mapping includes the full lobby, rejects ambiguous values, and preserves original time", () => {
  const native = (id, players) => ({ id, players, provider: "Evolution", href: `${id}@evolution` });
  const items = selectHourlyUnibetCandidates({ status: "ok", collectedAt: new Date(now).toISOString(), games: [
    native("fan-tan", 10), native("craps", 20), native("dragon-tiger", 30),
    native("crazy-time", 100), native("no-commission-baccarat", null),
    native("auto-roulette", 100), native("auto-roulette", 200),
    { id: "monopoly-live", players: 999 },
  ] });
  assert.deepEqual(items.map((row) => row.id), ["crazy-time", "fan-tan-live", "craps-live", "dragon-tiger"]);
  assert.ok(items.every((row) => row.fetchedAt === new Date(now).toISOString()));
  assert.equal(items.some((row) => row.id === "monopoly-live"), false);
  assert.deepEqual(selectHourlyUnibetCandidates({ status: "error", games: [] }), []);
});

test("only quality-checked primary readings are prepared for ongoing hourly storage", () => {
  const readings = [
    { id: "fortune-roulette", players: 200, source: "primary", fetchedAt: new Date(now).toISOString() },
    { id: "crazy-time", players: 1000, source: "unibet", fetchedAt: new Date(now).toISOString() },
  ];
  assert.deepEqual(selectHourlyPrimaryCandidates(readings), [{ ...readings[0], qualityVerified: true }]);
  assert.deepEqual(selectHourlyPrimaryCandidates(null), []);
});

test("unhealthy, unknown, unverified and stale values never occupy an eligible slot", async () => {
  const id = "candidate-invalid";
  const options = { now, source: "primary", catalog: [{ id }], getRedis: async () => assert.fail("invalid data must not access Redis") };
  for (const change of [{ stale: true }, { stuck: true }, { qualityVerified: false }, { players: null },
    { players: false }, { players: -1 }, { fetchedAt: new Date(now + 1).toISOString() },
    { fetchedAt: new Date(now - 11 * 60000).toISOString() }]) {
    assert.equal((await saveHourlyGameObservations([item(id, change)], options)).savedGames, 0);
  }
  assert.equal((await saveHourlyGameObservations([item(id), item(id)], options)).savedGames, 0);
  assert.equal((await saveHourlyGameObservations([item("unknown")], options)).savedGames, 0);
});

test("retries stay in the original source slot, and conflicting copies are invalidated", async () => {
  const id = "candidate-retries";
  const options = { now, source: "primary", catalog: [{ id }], getRedis: memory };
  assert.equal((await saveHourlyGameObservations([item(id)], options)).savedGames, 1);
  assert.equal((await saveHourlyGameObservations([item(id)], { ...options, now: now + 60000 })).savedGames, 0);
  await saveHourlyGameObservations([item(id, { players: 200 })], options);
  const points = (await getHourlyGameObservations({ now: tomorrow, getRedis: memory })).filter((point) => point.id === id);
  assert.equal(points.length, 1);
  assert.equal(points[0].value, null);
  assert.equal(points[0].ts, now);
  assert.equal(points[0].qualityVerified, true);
});

test("two sources remain distinct and current incomplete days do not enter materialization", async () => {
  const id = "candidate-sources";
  for (const source of ["primary", "unibet"]) {
    await saveHourlyGameObservations([item(id)], { now, source, catalog: [{ id }], getRedis: memory });
  }
  assert.equal((await getHourlyGameObservations({ now, getRedis: memory })).filter((point) => point.id === id).length, 0);
  assert.equal((await getHourlyGameObservations({ now: tomorrow, getRedis: memory })).filter((point) => point.id === id).length, 2);
});

test("candidate storage errors propagate and partial history is never accepted", async () => {
  await assert.rejects(saveHourlyGameObservations([item("broken")], { now, source: "unibet", catalog: [{ id: "broken" }],
    getRedis: async () => ({ createScript: () => ({ eval: async () => { throw new Error("offline"); } }) }) }), /offline/);
  await assert.rejects(getHourlyGameObservations({ now, getRedis: async () => ({ pipeline: () => ({ hgetall() {}, exec: async () => [] }) }) }), /Incomplete/);
});

test("Redis serializes concurrent per-game writes and keeps the newest source timestamp", { skip: !process.env.HOURLY_TEST_REDIS_URL }, async () => {
  const url = process.env.HOURLY_TEST_REDIS_URL;
  assert.ok(["127.0.0.1", "localhost"].includes(new URL(url).hostname));
  const client = createClient({ url });
  await client.connect();
  const id = `candidate-test-${Date.now()}`;
  const adapter = {
    createScript: (script) => ({ eval: (keys, args) => client.eval(script, { keys, arguments: args }) }),
    pipeline: () => { const multi = client.multi(); return { hgetall: (key) => multi.hGetAll(key), exec: () => multi.exec() }; },
  };
  try {
    await Promise.all(Array.from({ length: 10 }, (_, index) => saveHourlyGameObservations([
      item(id, { fetchedAt: new Date(now + index * 1000).toISOString(), players: index }),
    ], { now: now + 10000, source: "unibet", catalog: [{ id }], getRedis: async () => adapter })));
    const points = (await getHourlyGameObservations({ now: tomorrow, getRedis: async () => adapter })).filter((point) => point.id === id);
    assert.equal(points.length, 1);
    assert.equal(points[0].value, 9);
    assert.equal(points[0].ts, now + 9000);
    assert.ok(await client.ttl("cs:hourly:candidates:v1:day:2026-09-05") > 89 * 86400);
  } finally {
    await client.hDel("cs:hourly:candidates:v1:day:2026-09-05", `unibet:${id}:${Math.floor(now / 600000)}`);
    await client.quit();
  }
});
