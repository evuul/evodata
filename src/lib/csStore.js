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
}

/**
 * Hämta punkter senaste N dagar (ASC)
 * @param {string} slug
 * @param {number} days
 * @returns {{ts:number,value:number}[]}
 */
export async function getSeries(slug, days = 30) {
  const key = KEY(slug);
  const kv = await getKv();

  const raw = kv
    ? await kv.lrange(key, 0, MAX_SAMPLES - 1)
    : mem.lrange(key, 0, MAX_SAMPLES - 1);

  const since = Date.now() - Math.max(1, days) * 24 * 60 * 60 * 1000;

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
  if (DEBUG) console.log(`[csStore] getSeries ${slug} days=${days} -> ${parsed.length} pts`);
  return parsed;
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
