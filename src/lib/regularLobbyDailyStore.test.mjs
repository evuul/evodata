// Verifies durable daily corrections, failure handling and concurrent publication against local Redis.

import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "redis";
import { REGULAR_LOBBY_DAILY_METHOD, regularLobbyCatalogForDate } from "./regularLobbyDaily.js";
import { getRegularLobbyDailyHistory, saveRegularLobbyDailyHistory, REGULAR_LOBBY_DAILY_KEY } from "./regularLobbyDailyStore.js";

const dailyGames = regularLobbyCatalogForDate("2026-09-07");
const record = {
  date: "2026-09-07", method: REGULAR_LOBBY_DAILY_METHOD, complete: true,
  computedAt: "2026-09-08T00:00:00Z", gameIds: dailyGames.map(g => g.id).sort(),
  averages: Object.fromEntries(dailyGames.map(g => [g.id, 100])),
  coverage: { slots: 144, expectedSlots: 144, missingHours: [] },
};

test("invalid records and failed persistence are surfaced", async () => {
  await assert.rejects(saveRegularLobbyDailyHistory([{ ...record, averages: {} }]), /Invalid/);
  await assert.rejects(saveRegularLobbyDailyHistory([record], { getRedis: async () => null }), /unavailable/);
  await assert.rejects(getRegularLobbyDailyHistory({ getRedis: async () => ({ get: async () => { throw new Error("offline"); } }) }), /offline/);
  await assert.rejects(saveRegularLobbyDailyHistory([record], { getRedis: async () => ({
    createScript: () => ({ eval: async () => { throw new Error("write failed"); } }),
  }) }), /write failed/);
});

const redisUrl = process.env.LOBBY_DAILY_TEST_REDIS_URL;
test("Redis merges concurrent days and prevents older or sparser replacements", { skip: !redisUrl }, async () => {
  assert.ok(["localhost", "127.0.0.1"].includes(new URL(redisUrl).hostname));
  const client = createClient({ url: redisUrl });
  await client.connect();
  const key = `test:${Date.now()}:${REGULAR_LOBBY_DAILY_KEY}`;
  const options = { getRedis: async () => ({
    get: () => client.get(key),
    createScript: script => ({ eval: (_keys, args) => client.eval(script, { keys: [key], arguments: args }) }),
  }) };
  try {
    await Promise.all([
      saveRegularLobbyDailyHistory([record], options),
      saveRegularLobbyDailyHistory([{ ...record, date: "2026-09-06" }], options),
    ]);
    assert.equal((await getRegularLobbyDailyHistory(options)).length, 2);
    await saveRegularLobbyDailyHistory([{ ...record, computedAt: "2026-09-09T00:00:00Z", coverage: { ...record.coverage, slots: 140 } }], options);
    await saveRegularLobbyDailyHistory([{ ...record, computedAt: "2026-09-07T23:00:00Z", averages: Object.fromEntries(dailyGames.map(g => [g.id, 1])) }], options);
    const stored = (await getRegularLobbyDailyHistory(options)).find(r => r.date === record.date);
    assert.equal(stored.coverage.slots, 144);
    assert.equal(stored.averages["crazy-time"], 100);
    assert.equal(stored.computedAt, record.computedAt);
  } finally {
    await client.del(key);
    await client.quit();
  }
});
