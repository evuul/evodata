// src/lib/csStore.js  (ESM!)
// Sätter ESM-friendly exports + KV fallback till in-memory.

const DEBUG = process.env.DEBUG_CS === "1";
export const MAX_REASONABLE_PLAYERS = 5_000_000;

export function normalizePlayers(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  if (num < 0 || num > MAX_REASONABLE_PLAYERS) return null;
  return Math.round(num);
}

const DEFAULT_LOBBY_ATH = (() => {
  const valueFromEnv = normalizePlayers(process.env.CS_DEFAULT_LOBBY_ATH_VALUE);
  if (valueFromEnv != null) {
    return {
      value: valueFromEnv,
      date: process.env.CS_DEFAULT_LOBBY_ATH_DATE || "2025-11-07",
      at: process.env.CS_DEFAULT_LOBBY_ATH_AT || null,
      updatedAt: new Date().toISOString(),
    };
  }
  return null;
})();

let kvClient = null;

// Prova använda @vercel/kv om env finns – dynamisk import så build inte bryr sig lokalt
async function getKv() {
  if (kvClient !== null) return kvClient; // cache
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    const mod = await import("@vercel/kv");
    kvClient = mod.kv;
  } else {
    kvClient = undefined; // markera “ingen KV”
  }
  return kvClient;
}

// ---- In-memory fallback ----
const mem = {
  store: new Map(), // key -> [JSON string entries]
  lpush(key, entry) {
    const arr = this.store.get(key) || [];
    arr.unshift(entry);
    this.store.set(key, arr);
  },
  lrange(key, start, stop) {
    const arr = this.store.get(key) || [];
    const end = stop === -1 ? arr.length : Math.min(stop + 1, arr.length);
    return arr.slice(start, end);
  },
  ltrim(key, start, stop) {
    const arr = this.store.get(key) || [];
    const end = stop === -1 ? arr.length : Math.min(stop + 1, arr.length);
    const trimmed = arr.slice(start, end);
    this.store.set(key, trimmed);
  },
  lindex(key, index) {
    const arr = this.store.get(key) || [];
    const idx = index >= 0 ? index : arr.length + index;
    if (idx < 0 || idx >= arr.length) return undefined;
    return arr[idx];
  },
};

const KEY = (slug) => `cs:${slug}:samples`;
const MAX_SAMPLES = 5000;

const overviewMem = new Map(); // key -> { snapshot, exp }
const DEFAULT_OVERVIEW_MEM_TTL = 24 * 60 * 60 * 1000; // 24h fallback
const GLOBAL_ATH_KEY = "cs:lobby:global-ath";
let globalAthCache = null;

const DAILY_PEAK_PREFIX = "cs:lobby:today-peak:";
const dailyPeakMem = new Map(); // key (ymd) -> entry

function overviewKey(days) {
  const n = Number(days);
  const suffix = Number.isFinite(n) ? Math.round(n) : String(days ?? "default");
  return `cs:overview:${suffix}`;
}

function getOverviewMem(key) {
  const entry = overviewMem.get(key);
  if (!entry) return null;
  const { exp, snapshot } = entry;
  if (Number.isFinite(exp) && exp <= Date.now()) {
    overviewMem.delete(key);
    return null;
  }
  return snapshot;
}

function setOverviewMem(key, snapshot) {
  const staleAfter =
    snapshot?.meta?.staleAfter && typeof snapshot.meta.staleAfter === "string"
      ? Date.parse(snapshot.meta.staleAfter)
      : Number.NaN;
  const exp = Number.isFinite(staleAfter) ? staleAfter : Date.now() + DEFAULT_OVERVIEW_MEM_TTL;
  overviewMem.set(key, { snapshot, exp });
}

export async function getOverviewSnapshot(days) {
  const key = overviewKey(days);
  const fromMem = getOverviewMem(key);
  if (fromMem) return fromMem;

  const kv = await getKv();
  if (!kv) return null;
  try {
    const raw = await kv.get(key);
    if (!raw) return null;
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (parsed && typeof parsed === "object") {
      setOverviewMem(key, parsed);
      if (DEBUG) console.log(`[csStore] KV overview hit ${key}`);
      return parsed;
    }
  } catch (err) {
    if (DEBUG) console.warn(`[csStore] KV overview get failed ${key}:`, err);
  }
  return null;
}

export async function setOverviewSnapshot(days, snapshot) {
  const key = overviewKey(days);
  setOverviewMem(key, snapshot);

  const kv = await getKv();
  if (!kv) return;
  try {
    await kv.set(key, JSON.stringify(snapshot));
    if (DEBUG) console.log(`[csStore] KV overview set ${key}`);
  } catch (err) {
    if (DEBUG) console.warn(`[csStore] KV overview set failed ${key}:`, err);
  }
}

function normalizeAthEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  const value = normalizePlayers(entry.value);
  if (value === null) return null;
  return {
    value,
    date: entry.date ?? null,
    at: entry.at ?? null,
    updatedAt: entry.updatedAt ?? null,
  };
}

export async function getGlobalLobbyAth() {
  if (globalAthCache) return globalAthCache;
  const kv = await getKv();
  if (!kv) {
    if (!globalAthCache && DEFAULT_LOBBY_ATH) globalAthCache = DEFAULT_LOBBY_ATH;
    return globalAthCache;
  }
  try {
    const raw = await kv.get(GLOBAL_ATH_KEY);
    if (!raw) return null;
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    const normalized = normalizeAthEntry(parsed);
    if (normalized) {
      globalAthCache = normalized;
      return normalized;
    }
  } catch (err) {
    if (DEBUG) console.warn(`[csStore] KV get global ATH failed:`, err);
  }
  if (!globalAthCache && DEFAULT_LOBBY_ATH) {
    globalAthCache = DEFAULT_LOBBY_ATH;
  }
  return globalAthCache;
}

export async function setGlobalLobbyAth(entry) {
  const normalized = normalizeAthEntry(entry);
  if (!normalized) return;
  normalized.updatedAt = new Date().toISOString();
  globalAthCache = normalized;
  const kv = await getKv();
  if (!kv) return;
  try {
    await kv.set(GLOBAL_ATH_KEY, JSON.stringify(normalized));
    if (DEBUG) console.log(`[csStore] KV set global ATH`);
  } catch (err) {
    if (DEBUG) console.warn(`[csStore] KV set global ATH failed:`, err);
  }
}

function dailyPeakKey(ymd) {
  return `${DAILY_PEAK_PREFIX}${ymd}`;
}

function normalizeDailyPeakEntry(entry, fallbackYmd) {
  if (!entry || typeof entry !== "object") return null;
  const value = normalizePlayers(entry.value);
  if (value == null) return null;
  const normalizedDate = normalizeYmd(entry.date) || normalizeYmd(fallbackYmd) || null;
  return {
    value,
    date: normalizedDate,
    at: typeof entry.at === "string" ? entry.at : null,
    updatedAt: typeof entry.updatedAt === "string" ? entry.updatedAt : null,
  };
}

async function loadDailyPeakFromKv(ymd) {
  const kv = await getKv();
  if (!kv) return null;
  try {
    const raw = await kv.get(dailyPeakKey(ymd));
    if (!raw) return null;
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    const normalized = normalizeDailyPeakEntry(parsed, ymd);
    if (normalized) {
      dailyPeakMem.set(ymd, normalized);
      return normalized;
    }
  } catch (err) {
    if (DEBUG) console.warn(`[csStore] KV get daily peak failed ${ymd}:`, err);
  }
  return null;
}

export async function getDailyLobbyPeak(ymd) {
  const normalizedYmd = normalizeYmd(ymd);
  if (!normalizedYmd) return null;
  const cached = dailyPeakMem.get(normalizedYmd);
  if (cached) return cached;
  return (await loadDailyPeakFromKv(normalizedYmd)) ?? null;
}

export async function maybeUpdateDailyLobbyPeak(totalPlayers, measuredAt) {
  const normalizedValue = normalizePlayers(totalPlayers);
  if (normalizedValue == null) return null;
  const ts = typeof measuredAt === "number" ? measuredAt : Date.parse(measuredAt);
  if (!Number.isFinite(ts)) return null;
  const ymd = normalizeYmd(stockholmYMDFromTs(ts));
  if (!ymd) return null;

  const current = dailyPeakMem.get(ymd) ?? (await loadDailyPeakFromKv(ymd));
  if (current && Number.isFinite(current.value) && current.value >= normalizedValue) {
    return current;
  }

  const entry = {
    value: normalizedValue,
    date: ymd,
    at: new Date(ts).toISOString(),
    updatedAt: new Date().toISOString(),
  };
  dailyPeakMem.set(ymd, entry);

  const kv = await getKv();
  if (kv) {
    try {
      await kv.set(dailyPeakKey(ymd), JSON.stringify(entry));
    } catch (err) {
      if (DEBUG) console.warn(`[csStore] KV set daily peak failed ${ymd}:`, err);
    }
  }
  return entry;
}

// ---- Dagliga aggregat ----
function normalizeYmd(str) {
  if (!str) return null;
  const parts = String(str)
    .split(/[^\d]/)
    .filter(Boolean);
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${y.padStart(4, "0")}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return str;
}

const STOCKHOLM_TZ = "Europe/Stockholm";
const YMD_FORMATTER = new Intl.DateTimeFormat("sv-SE", {
  timeZone: STOCKHOLM_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function stockholmYMDFromTs(ts) {
  try {
    const date = new Date(Number(ts));
    if (!Number.isFinite(date.getTime())) return null;
    return normalizeYmd(YMD_FORMATTER.format(date));
  } catch {
    return null;
  }
}

function pastDates(days) {
  const out = [];
  const base = new Date();
  for (let i = 0; i < Math.max(1, days); i++) {
    const d = new Date(base.getTime());
    d.setDate(d.getDate() - i);
    const ymd = stockholmYMDFromTs(d.getTime());
    if (ymd && !out.includes(ymd)) out.push(normalizeYmd(ymd));
  }
  return out.reverse();
}

const dailyMem = new Map(); // key -> { sum, count, max, maxTs, latestValue, latestTs }
const DAILY_KEY = (slug, ymd) => `cs:daily:${slug}:${ymd}`;

function cloneDaily(entry) {
  if (!entry) return null;
  return {
    sum: entry.sum ?? 0,
    count: entry.count ?? 0,
    max: entry.max ?? null,
    maxTs: entry.maxTs ?? null,
    latestValue: entry.latestValue ?? null,
    latestTs: entry.latestTs ?? null,
  };
}

function parseDailyFromRaw(raw) {
  if (!raw || typeof raw !== "object") return null;
  const sum = Number(raw.sum);
  const count = Number(raw.count);
  const max = Number(raw.max);
  const maxTs = Number(raw.maxTs ?? raw.maxts);
  const latestValue = Number(raw.latestValue ?? raw.latest);
  const latestTs = Number(raw.latestTs ?? raw.latestts);
  return {
    sum: Number.isFinite(sum) ? sum : 0,
    count: Number.isFinite(count) ? count : 0,
    max: Number.isFinite(max) ? max : null,
    maxTs: Number.isFinite(maxTs) ? maxTs : null,
    latestValue: Number.isFinite(latestValue) ? latestValue : null,
    latestTs: Number.isFinite(latestTs) ? latestTs : null,
  };
}

async function ensureDailyEntry(slug, ymd) {
  const key = DAILY_KEY(slug, ymd);
  let entry = dailyMem.get(key);
  if (entry) return { key, entry };
  const kv = await getKv();
  if (kv) {
    try {
      const raw = await kv.hgetall(key);
      const parsed = parseDailyFromRaw(raw);
      if (parsed) entry = parsed;
    } catch (err) {
      if (DEBUG) console.warn(`[csStore] KV daily hgetall failed ${key}:`, err);
    }
  }
  if (!entry) {
    entry = { sum: 0, count: 0, max: null, maxTs: null, latestValue: null, latestTs: null };
  }
  dailyMem.set(key, entry);
  return { key, entry };
}

async function persistDailyEntry(key, entry, { incrementValue, timestamp }) {
  const kv = await getKv();
  if (!kv) return;
  try {
    const pipeline = kv.pipeline ? kv.pipeline() : null;
    if (pipeline) {
      pipeline.hincrby(key, "sum", incrementValue);
      pipeline.hincrby(key, "count", 1);
      pipeline.hset(key, {
        max: entry.max ?? incrementValue,
        maxTs: entry.maxTs ?? timestamp,
        latestValue: entry.latestValue ?? incrementValue,
        latestTs: entry.latestTs ?? timestamp,
      });
      await pipeline.exec();
    } else {
      await kv.hincrby(key, "sum", incrementValue);
      await kv.hincrby(key, "count", 1);
      await kv.hset(key, {
        max: entry.max ?? incrementValue,
        maxTs: entry.maxTs ?? timestamp,
        latestValue: entry.latestValue ?? incrementValue,
        latestTs: entry.latestTs ?? timestamp,
      });
    }
  } catch (err) {
    if (DEBUG) console.warn(`[csStore] KV daily persist failed ${key}:`, err);
  }
}

async function updateDailyAggregate(slug, ts, value) {
  const ymdRaw = stockholmYMDFromTs(ts);
  const ymd = normalizeYmd(ymdRaw);
  if (!ymd) return;
  const { key, entry } = await ensureDailyEntry(slug, ymd);

  entry.sum = (entry.sum ?? 0) + value;
  entry.count = (entry.count ?? 0) + 1;
  if (entry.max == null || value > entry.max) {
    entry.max = value;
    entry.maxTs = ts;
  }
  entry.latestValue = value;
  entry.latestTs = ts;
  dailyMem.set(key, entry);

  await persistDailyEntry(
    key,
    entry,
    {
      incrementValue: value,
      timestamp: ts,
    }
  );
}

export async function getDailyAggregates(slugs, days = 30) {
  const unique = Array.from(new Set(slugs.filter(Boolean)));
  const result = new Map();
  for (const slug of unique) {
    result.set(slug, new Map());
  }
  if (!unique.length) {
    return result;
  }

  const dateList = pastDates(days + 1);
  const kv = await getKv();
  const requests = [];
  const pipeline = kv?.pipeline ? kv.pipeline() : null;

  for (const slug of unique) {
    const dateMap = result.get(slug);
    for (const date of dateList) {
      const key = DAILY_KEY(slug, date);
      const memEntry = dailyMem.get(key);
      if (memEntry) {
        dateMap.set(date, cloneDaily(memEntry));
      } else if (pipeline) {
        requests.push({ slug, date });
        pipeline.hgetall(key);
      } else if (kv) {
        requests.push({ slug, date, direct: true });
      }
    }
  }

  if (pipeline) {
    try {
      const rawResults = await pipeline.exec();
      for (let i = 0; i < requests.length; i++) {
        const { slug, date } = requests[i];
        const raw = rawResults?.[i];
        const parsed = parseDailyFromRaw(raw);
        if (parsed) {
          result.get(slug).set(date, parsed);
        }
      }
    } catch (err) {
      if (DEBUG) console.warn("[csStore] KV pipeline hgetall failed", err);
    }
  } else if (kv) {
    for (const req of requests) {
      const { slug, date } = req;
      try {
        const raw = await kv.hgetall(DAILY_KEY(slug, date));
        const parsed = parseDailyFromRaw(raw);
        if (parsed) result.get(slug).set(date, parsed);
      } catch (err) {
        if (DEBUG) console.warn("[csStore] KV hgetall failed", slug, date, err);
      }
    }
  }

  return result;
}

function clearDailyCacheForSlug(slug) {
  const prefix = `cs:daily:${slug}:`;
  for (const key of dailyMem.keys()) {
    if (key.startsWith(prefix)) dailyMem.delete(key);
  }
}

export async function getAllSamples(slug, limit = MAX_SAMPLES) {
  const kv = await getKv();
  const raw = kv
    ? await kv.lrange(KEY(slug), 0, Math.max(0, Math.min(limit, MAX_SAMPLES) - 1))
    : mem.lrange(KEY(slug), 0, Math.max(0, Math.min(limit, MAX_SAMPLES) - 1));
  return parseSeriesRows(raw, Number.NEGATIVE_INFINITY);
}

export async function rebuildDailyAggregates(slug, samples) {
  if (!Array.isArray(samples) || !samples.length) {
    return;
  }
  const sorted = [...samples]
    .map((sample) => ({
      ts: Number(sample?.ts ?? sample?.timestamp),
      value: Number(sample?.value ?? sample?.players),
    }))
    .filter((sample) => Number.isFinite(sample.ts) && Number.isFinite(sample.value) && sample.value > 0)
    .sort((a, b) => a.ts - b.ts);

  if (!sorted.length) return;

  const byDay = new Map();
  for (const { ts, value } of sorted) {
    const ymd = normalizeYmd(stockholmYMDFromTs(ts));
    if (!ymd) continue;
    const entry = byDay.get(ymd) ?? {
      sum: 0,
      count: 0,
      max: null,
      maxTs: null,
      latestValue: null,
      latestTs: null,
    };
    entry.sum += value;
    entry.count += 1;
    if (entry.max == null || value > entry.max) {
      entry.max = value;
      entry.maxTs = ts;
    }
    entry.latestValue = value;
    entry.latestTs = ts;
    byDay.set(ymd, entry);
  }

  clearDailyCacheForSlug(slug);

  const kv = await getKv();
  const pipeline = kv?.pipeline ? kv.pipeline() : null;

  for (const [ymd, entry] of byDay) {
    const key = DAILY_KEY(slug, ymd);
    dailyMem.set(key, { ...entry });
    if (kv) {
      if (pipeline) {
        pipeline.del(key);
        pipeline.hset(key, {
          sum: String(entry.sum ?? 0),
          count: String(entry.count ?? 0),
          max: entry.max != null ? String(entry.max) : "",
          maxTs: entry.maxTs != null ? String(entry.maxTs) : "",
          latestValue: entry.latestValue != null ? String(entry.latestValue) : "",
          latestTs: entry.latestTs != null ? String(entry.latestTs) : "",
        });
      } else {
        await kv.del(key);
        await kv.hset(key, {
          sum: String(entry.sum ?? 0),
          count: String(entry.count ?? 0),
          max: entry.max != null ? String(entry.max) : "",
          maxTs: entry.maxTs != null ? String(entry.maxTs) : "",
          latestValue: entry.latestValue != null ? String(entry.latestValue) : "",
          latestTs: entry.latestTs != null ? String(entry.latestTs) : "",
        });
      }
    }
  }

  if (pipeline) {
    try {
      await pipeline.exec();
    } catch (err) {
      if (DEBUG) console.warn(`[csStore] KV pipeline rebuild failed ${slug}:`, err);
    }
  }
}

function parseSeriesRows(raw, since = Number.NEGATIVE_INFINITY) {
  const parsed = [];
  for (const r of raw || []) {
    try {
      const o = typeof r === "string" ? JSON.parse(r) : r;
      const normalized = normalizePlayers(o?.value);
      if (o && Number.isFinite(o.ts) && normalized != null && o.ts >= since) {
        parsed.push({ ts: o.ts, value: normalized });
      }
    } catch {
      // ignore bad rows
    }
  }
  parsed.sort((a, b) => a.ts - b.ts);
  return parsed;
}

export async function getSeriesBulk(slugs, days = 30) {
  const unique = Array.from(new Set(slugs.filter(Boolean)));
  if (!unique.length) return new Map();

  const since = Date.now() - Math.max(1, days) * 24 * 60 * 60 * 1000;
  const kv = await getKv();

  let rawLists = [];
  if (kv) {
    try {
      const pipeline = kv.pipeline();
      for (const slug of unique) {
        pipeline.lrange(KEY(slug), 0, MAX_SAMPLES - 1);
      }
      rawLists = await pipeline.exec();
    } catch (err) {
      if (DEBUG) console.warn("[csStore] KV pipeline failed, falling back to sequential", err);
      rawLists = [];
    }
  }

  if (!rawLists.length) {
    rawLists = unique.map((slug) =>
      kv ? kv.lrange(KEY(slug), 0, MAX_SAMPLES - 1) : mem.lrange(KEY(slug), 0, MAX_SAMPLES - 1)
    );
    if (kv) {
      rawLists = await Promise.all(
        rawLists.map(async (promise) => {
          try {
            return await promise;
          } catch {
            return [];
          }
        })
      );
    }
  }

  if (!kv) {
    rawLists = unique.map((slug) => mem.lrange(KEY(slug), 0, MAX_SAMPLES - 1));
  }

  const map = new Map();
  for (let i = 0; i < unique.length; i++) {
    const slug = unique[i];
    const raw = rawLists[i];
    const parsed = parseSeriesRows(raw, since);
    if (DEBUG) console.log(`[csStore] getSeriesBulk ${slug} days=${days} -> ${parsed.length} pts`);
    map.set(slug, parsed);
  }
  return map;
}

/**
 * Spara en mätpunkt
 * @param {string} slug
 * @param {string} isoTs - ISO timestamp
 * @param {number} players
 */
export async function saveSample(slug, isoTs, players) {
  const ts = Date.parse(isoTs);
  if (!Number.isFinite(ts)) throw new Error("Bad timestamp");
  const normalized = normalizePlayers(players);
  if (normalized == null) throw new Error("Bad value");

  const entry = JSON.stringify({ ts, value: normalized });
  const key = KEY(slug);

  const kv = await getKv();
  if (kv) {
    await kv.lpush(key, entry);
    await kv.ltrim(key, 0, MAX_SAMPLES - 1);
    if (DEBUG) console.log(`[csStore] KV save ${slug} ts=${ts} value=${normalized}`);
  } else {
    mem.lpush(key, entry);
    mem.ltrim(key, 0, MAX_SAMPLES - 1);
    if (DEBUG) console.log(`[csStore] MEM save ${slug} ts=${ts} value=${normalized}`);
  }

  await updateDailyAggregate(slug, ts, normalized);
}

/**
 * Hämta punkter senaste N dagar (ASC)
 * @param {string} slug
 * @param {number} days
 * @returns {{ts:number,value:number}[]}
 */
export async function getSeries(slug, days = 30) {
  const map = await getSeriesBulk([slug], days);
  return map.get(slug) ?? [];
}

/**
 * Grupp & snitta per dag (Europe/Stockholm) → [{date:"YYYY-MM-DD", avg:number}]
 */
export function dailyAverages(points) {
  if (!Array.isArray(points) || points.length === 0) return [];

  // Grupp per “dag i Stockholm”
  const byDay = new Map();
  for (const p of points) {
    const d = new Date(p.ts);
    const y = d.toLocaleString("sv-SE", { timeZone: "Europe/Stockholm", year: "numeric" });
    const m = d.toLocaleString("sv-SE", { timeZone: "Europe/Stockholm", month: "2-digit" });
    const day = d.toLocaleString("sv-SE", { timeZone: "Europe/Stockholm", day: "2-digit" });
    const key = `${y}-${m}-${day}`; // YYYY-MM-DD

    const bucket = byDay.get(key) || { sum: 0, n: 0 };
    bucket.sum += p.value;
    bucket.n += 1;
    byDay.set(key, bucket);
  }

  const out = [];
  for (const [date, { sum, n }] of byDay) {
    out.push({ date, avg: Math.round((sum / n) * 100) / 100 });
  }
  out.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}

/**
 * Hämta senaste sparade mätpunkt för ett spel.
 * @param {string} slug
 * @returns {{ ts:number, value:number } | null}
 */
export async function getLatestSample(slug) {
  const key = KEY(slug);
  const kv = await getKv();

  let rows;
  if (kv) {
    try {
      rows = await kv.lrange(key, 0, 50);
    } catch {
      rows = undefined;
    }
  } else {
    rows = mem.lrange(key, 0, 50);
  }

  if (!rows?.length) return null;

  for (const raw of rows) {
    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      const normalized = normalizePlayers(parsed?.value);
      if (parsed && Number.isFinite(parsed.ts) && normalized != null) {
        return { ts: parsed.ts, value: normalized };
      }
    } catch {
      // ignore JSON fel
    }
  }
  return null;
}
