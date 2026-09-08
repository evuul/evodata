// Stores bounded daily corrections independently of the original source history.

import { getKv } from "./csStore.js";
import { isRegularLobbyDailyRecord } from "./regularLobbyDailySnapshot.js";

export const REGULAR_LOBBY_DAILY_KEY = "cs:lobby:regular-daily:v1";
const CACHE_MS = 60 * 1000;
let cached = null;
let expiresAt = 0;

export const SAVE_REGULAR_LOBBY_DAILY_SCRIPT = `
local raw = redis.call("GET", KEYS[1])
local records = raw and cjson.decode(raw) or {}
for _, serialized in ipairs(cjson.decode(ARGV[1])) do
  local incoming = cjson.decode(serialized)
  local existing = records[incoming.date]
  local current = type(existing) == "string" and cjson.decode(existing) or existing
  if not current or (incoming.coverage.slots >= current.coverage.slots and incoming.computedAt >= current.computedAt) then
    records[incoming.date] = serialized
  end
end
local dates = {}
for date, _ in pairs(records) do table.insert(dates, date) end
table.sort(dates)
for i = 1, #dates - 730 do records[dates[i]] = nil end
redis.call("SET", KEYS[1], cjson.encode(records))
return #dates
`;

export async function getRegularLobbyDailyHistory({ getRedis = getKv, force = false } = {}) {
  if (getRedis === getKv && !force && expiresAt > Date.now()) return cached;
  const redis = await getRedis();
  if (!redis) {
    if (process.env.NODE_ENV === "production") throw new Error("Daily lobby storage unavailable");
    return [];
  }
  const raw = await redis.get(REGULAR_LOBBY_DAILY_KEY);
  const data = typeof raw === "string" ? JSON.parse(raw) : raw;
  const records = Object.values(data ?? {}).map(r => typeof r === "string" ? JSON.parse(r) : r)
    .filter(r => isRegularLobbyDailyRecord(r));
  if (getRedis === getKv) { cached = records; expiresAt = Date.now() + CACHE_MS; }
  return records;
}

export async function saveRegularLobbyDailyHistory(records, { getRedis = getKv } = {}) {
  if (!Array.isArray(records) || records.some(record => !isRegularLobbyDailyRecord(record))) {
    throw new TypeError("Invalid regular lobby daily history");
  }
  if (!records.length) return;
  const redis = await getRedis();
  if (!redis) throw new Error("Daily lobby storage unavailable");
  // Keep each record's JSON intact: Redis cjson otherwise turns empty arrays into objects.
  await redis.createScript(SAVE_REGULAR_LOBBY_DAILY_SCRIPT).eval([REGULAR_LOBBY_DAILY_KEY], [JSON.stringify(records.map(r => JSON.stringify(r)))]);
  cached = null;
  expiresAt = 0;
}
