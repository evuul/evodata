// Stores bounded, verified per-game readings for rebuilding a shared hourly lobby timeline.

import { GAMES } from "../config/games.js";
import { getKv } from "./csStore.js";
import { HOURLY_BASELINE_DAYS, HOURLY_SLOT_MS, hourlyWindow, shiftHourlyDay, stockholmParts, validHourlyPlayers } from "./hourlyLobbyPolicy.js";
import { isPlayerSampleFresh } from "./livePlayerSnapshot.js";
import { getUnibetPilotGameId } from "./unibetPilotFallback.js";

const PREFIX = "cs:hourly:candidates:v1:day:";
const RETENTION_SECONDS = 90 * 86400;
const memory = new Map();

export const SAVE_HOURLY_GAMES_SCRIPT = `
local entries = cjson.decode(ARGV[1])
local saved = 0
for _, entry in ipairs(entries) do
  local raw = redis.call("HGET", KEYS[1], entry[1])
  local incoming = entry[2]
  local current = raw and cjson.decode(raw) or nil
  if not current or current[2] < incoming[2] then
    redis.call("HSET", KEYS[1], entry[1], cjson.encode(incoming))
    saved = saved + 1
  elseif current[2] == incoming[2] and current[3] ~= incoming[3] then
    current[3] = false
    redis.call("HSET", KEYS[1], entry[1], cjson.encode(current))
  end
end
redis.call("EXPIRE", KEYS[1], ARGV[2])
return saved
`;

export function selectHourlyUnibetCandidates(sample, { catalog = GAMES } = {}) {
  if (sample?.status !== "ok" || !Array.isArray(sample.games)) return [];
  const values = new Map();
  const duplicates = new Set();
  for (const game of sample.games) {
    if (!game || typeof game.id !== "string" || game.provider !== "Evolution"
        || !/@evolution$/i.test(String(game.href || ""))) continue;
    if (values.has(game.id)) duplicates.add(game.id);
    values.set(game.id, game.players);
  }
  return catalog.flatMap((game) => {
    const id = game.unibetId ?? getUnibetPilotGameId(game.id);
    const players = validHourlyPlayers(values.get(id));
    return players == null || duplicates.has(id) ? [] : [{
      id: game.id, players, fetchedAt: sample.collectedAt, qualityVerified: true,
    }];
  });
}

export function selectHourlyPrimaryCandidates(readings) {
  return (Array.isArray(readings) ? readings : [])
    .filter((item) => item?.source === "primary")
    .map((item) => ({ ...item, qualityVerified: true }));
}

export async function saveHourlyGameObservations(items = [], {
  source, now = Date.now(), catalog = GAMES, getRedis = getKv, maxAgeMs = HOURLY_SLOT_MS,
  allowMultipleSlots = false,
} = {}) {
  if (!["primary", "unibet"].includes(source)) throw new Error("Invalid Hourly source");
  if (!Array.isArray(items)) throw new Error("Invalid Hourly readings");
  const allowed = new Set(catalog.map(({ id }) => id));
  const duplicates = new Set();
  const seen = new Set();
  const identity = (item) => allowMultipleSlots
    ? `${item?.id}:${Math.floor(Date.parse(item?.fetchedAt) / HOURLY_SLOT_MS)}`
    : item?.id;
  for (const item of items) {
    const key = identity(item);
    if (seen.has(key)) duplicates.add(key);
    seen.add(key);
  }
  const days = new Map();
  for (const item of items) {
    const value = validHourlyPlayers(item?.players);
    if (!allowed.has(item?.id) || duplicates.has(identity(item)) || value == null || item.stale || item.stuck
        || item.qualityVerified !== true || !isPlayerSampleFresh(item.fetchedAt, { now, maxAgeMs })) continue;
    const ts = Date.parse(item.fetchedAt);
    const key = `${PREFIX}${stockholmParts(ts).day}`;
    const entries = days.get(key) ?? [];
    entries.push([`${source}:${item.id}:${Math.floor(ts / HOURLY_SLOT_MS)}`, [item.id, ts, value, source, true]]);
    days.set(key, entries);
  }
  if (!days.size) return { savedGames: 0, reason: "no-eligible-readings" };
  const redis = await getRedis();
  if (!redis && process.env.NODE_ENV === "production") throw new Error("Hourly storage unavailable");
  if (!redis) for (const [key, day] of memory) if (day.expiresAt <= now) memory.delete(key);
  let savedGames = 0;
  for (const [key, entries] of days) {
    if (redis) {
      savedGames += Number(await redis.createScript(SAVE_HOURLY_GAMES_SCRIPT).eval([key], [JSON.stringify(entries), String(RETENTION_SECONDS)]));
    } else {
      const day = memory.get(key) ?? { values: {}, expiresAt: now + RETENTION_SECONDS * 1000 };
      for (const [field, value] of entries) {
        const old = day.values[field];
        if (!old || old[1] < value[1]) { day.values[field] = value; savedGames++; }
        else if (old[1] === value[1] && old[2] !== value[2]) old[2] = null;
      }
      memory.set(key, day);
    }
  }
  return { savedGames, reason: savedGames ? null : "duplicate-slots" };
}

export async function getHourlyGameObservations({ now = Date.now(), getRedis = getKv } = {}) {
  const redis = await getRedis();
  if (!redis && process.env.NODE_ENV === "production") throw new Error("Hourly storage unavailable");
  const { startDay } = hourlyWindow(now);
  const keys = Array.from({ length: HOURLY_BASELINE_DAYS }, (_, index) => `${PREFIX}${shiftHourlyDay(startDay, index)}`);
  const points = [];
  for (let index = 0; index < keys.length; index += 4) {
    const batch = keys.slice(index, index + 4);
    let rows;
    if (redis) {
      const pipeline = redis.pipeline();
      batch.forEach((key) => pipeline.hgetall(key));
      rows = await pipeline.exec();
      if (!Array.isArray(rows) || rows.length !== batch.length || rows.some((row) => row?.error)) throw new Error("Incomplete candidate history read");
    } else rows = batch.map((key) => memory.get(key)?.expiresAt > now ? memory.get(key).values : {});
    for (const row of rows) for (const raw of Object.values(row ?? {})) {
      const value = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (!Array.isArray(value) || ![4, 5].includes(value.length)) throw new Error("Invalid candidate history row");
      const [id, ts, players, source, qualityVerified = false] = value;
      points.push({ id, ts, value: players === false ? null : players, source, qualityVerified });
    }
  }
  return points;
}
