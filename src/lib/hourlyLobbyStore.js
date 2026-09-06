// Persists bounded, idempotent ten-minute observations and a daily Hourly materialization.

import { createHash } from "node:crypto";
import { HOURLY_LOBBY_COHORT } from "../config/hourlyLobbyCohort.js";
import { getKv } from "./csStore.js";
import {
  buildHourlyObservation, cohortSignature, HOURLY_BASELINE_DAYS,
  HOURLY_SLOT_MS, hourlyWindow, shiftHourlyDay, stockholmParts,
} from "./hourlyLobbyPolicy.js";

const RETENTION_SECONDS = 90 * 24 * 60 * 60;
const CACHE_MS = 60 * 1000;
const memoryDays = new Map();
const memoryBaselines = new Map();
const memoryArchives = new Map();
const redisBaselineCache = new Map();

// Each source interval occupies one field. Older retries cannot overwrite newer readings.
export const SAVE_HOURLY_SLOT_SCRIPT = `
local incoming = cjson.decode(ARGV[2])
local raw = redis.call("HGET", KEYS[1], ARGV[1])
if raw then
  local current = cjson.decode(raw)
  if current.ts >= incoming.ts then return 0 end
end
redis.call("HSET", KEYS[1], ARGV[1], ARGV[2])
redis.call("EXPIRE", KEYS[1], ARGV[3])
return 1
`;

const SAVE_BASELINE_SCRIPT = `
local incoming = cjson.decode(ARGV[1])
local raw = redis.call("GET", KEYS[1])
if raw then
  local current = cjson.decode(raw)
  if current.period.endDay > incoming.period.endDay then return 0 end
  if current.period.endDay == incoming.period.endDay and current.computedAt > incoming.computedAt then return 0 end
  local included = {}
  for _, id in ipairs(incoming.cohort.gameIds) do included[id] = true end
  for _, id in ipairs(current.cohort.gameIds) do if not included[id] then return 0 end end
end
redis.call("SET", KEYS[1], ARGV[1])
return 1
`;

export function hourlyStoragePrefix(cohort = HOURLY_LOBBY_COHORT) {
  const digest = createHash("sha256").update(cohortSignature(cohort)).digest("hex");
  return `cs:hourly:v1:${digest}`;
}

const parse = (raw) => typeof raw === "string" ? JSON.parse(raw) : raw;

export async function getStoredHourlyArchive({ cohort = HOURLY_LOBBY_COHORT, getRedis = getKv } = {}) {
  const key = `${hourlyStoragePrefix(cohort)}:archive`;
  const redis = await getRedis();
  if (redis) return parse(await redis.get(key));
  if (process.env.NODE_ENV === "production") throw new Error("Hourly storage unavailable");
  return memoryArchives.get(key) ?? null;
}

export async function setStoredHourlyArchive(archive, { cohort = HOURLY_LOBBY_COHORT, getRedis = getKv } = {}) {
  if (archive?.signature !== cohortSignature(cohort)) throw new Error("Incompatible Hourly archive");
  const key = `${hourlyStoragePrefix(cohort)}:archive`;
  const redis = await getRedis();
  if (redis) {
    const script = 'local current = redis.call("GET", KEYS[1]); if current then return current end; redis.call("SET", KEYS[1], ARGV[1]); return ARGV[1]';
    return parse(await redis.createScript(script).eval([key], [JSON.stringify(archive)]));
  }
  if (process.env.NODE_ENV === "production") throw new Error("Hourly storage unavailable");
  if (!memoryArchives.has(key)) memoryArchives.set(key, archive);
  return memoryArchives.get(key);
}

export async function saveHourlyLobbyObservation(items, {
  now = Date.now(), cohort = HOURLY_LOBBY_COHORT, getRedis = getKv,
} = {}) {
  const observation = buildHourlyObservation(items, { now, cohort });
  if (!observation) return { saved: false, reason: "incomplete-or-stale-cohort" };
  const key = `${hourlyStoragePrefix(cohort)}:day:${stockholmParts(observation.ts).day}`;
  const field = String(Math.floor(observation.ts / HOURLY_SLOT_MS) * HOURLY_SLOT_MS);
  const redis = await getRedis();
  if (redis) {
    const result = await redis.createScript(SAVE_HOURLY_SLOT_SCRIPT).eval(
      [key], [field, JSON.stringify(observation), String(RETENTION_SECONDS)]
    );
    return { saved: Number(result) === 1, reason: Number(result) === 1 ? null : "duplicate-slot" };
  }
  if (process.env.NODE_ENV === "production") throw new Error("Hourly storage unavailable");
  for (const [storedKey, value] of memoryDays) if (value.exp <= now) memoryDays.delete(storedKey);
  const day = memoryDays.get(key) ?? { slots: {}, exp: now + RETENTION_SECONDS * 1000 };
  if (day.slots[field]?.ts >= observation.ts) return { saved: false, reason: "duplicate-slot" };
  day.slots[field] = observation;
  memoryDays.set(key, day);
  return { saved: true, reason: null };
}

export async function getHourlyLobbyObservations({
  now = Date.now(), cohort = HOURLY_LOBBY_COHORT, getRedis = getKv,
} = {}) {
  const { startDay } = hourlyWindow(now);
  const prefix = hourlyStoragePrefix(cohort);
  const keys = Array.from({ length: HOURLY_BASELINE_DAYS }, (_, i) => `${prefix}:day:${shiftHourlyDay(startDay, i)}`);
  const redis = await getRedis();
  if (!redis && process.env.NODE_ENV === "production") throw new Error("Hourly storage unavailable");
  const rows = [];
  for (let i = 0; i < keys.length; i += 14) {
    const batch = keys.slice(i, i + 14);
    if (redis) {
      const pipeline = redis.pipeline();
      batch.forEach((key) => pipeline.hgetall(key));
      const result = await pipeline.exec();
      if (!Array.isArray(result) || result.length !== batch.length
          || result.some((row) => row?.error)) throw new Error("Incomplete Hourly history read");
      rows.push(...result);
    } else {
      rows.push(...batch.map((key) => {
        const day = memoryDays.get(key);
        return day?.exp > Number(now) ? day.slots : {};
      }));
    }
  }
  return rows.flatMap((row) => Object.values(row ?? {}).map(parse));
}

export async function getStoredHourlyBaseline({ cohort = HOURLY_LOBBY_COHORT, getRedis = getKv } = {}) {
  const key = `${hourlyStoragePrefix(cohort)}:baseline`;
  const redis = await getRedis();
  if (!redis) {
    if (process.env.NODE_ENV === "production") throw new Error("Hourly storage unavailable");
    return memoryBaselines.get(key) ?? null;
  }
  const cached = redisBaselineCache.get(key);
  if (cached?.expiresAt > Date.now()) return cached.data;
  const data = parse(await redis.get(key));
  if (data != null) redisBaselineCache.set(key, { data, expiresAt: Date.now() + CACHE_MS });
  return data;
}

export async function setStoredHourlyBaseline(baseline, { cohort = HOURLY_LOBBY_COHORT, getRedis = getKv } = {}) {
  const key = `${hourlyStoragePrefix(cohort)}:baseline`;
  const redis = await getRedis();
  if (redis) {
    const saved = await redis.createScript(SAVE_BASELINE_SCRIPT).eval([key], [JSON.stringify(baseline)]);
    redisBaselineCache.delete(key);
    return Number(saved) === 1;
  } else {
    if (process.env.NODE_ENV === "production") throw new Error("Hourly storage unavailable");
    const current = memoryBaselines.get(key);
    if (current?.period.endDay > baseline.period.endDay
        || (current?.period.endDay === baseline.period.endDay && current.computedAt > baseline.computedAt)
        || current?.cohort.gameIds.some((id) => !baseline.cohort.gameIds.includes(id))) return false;
    memoryBaselines.set(key, baseline);
    return true;
  }
}
