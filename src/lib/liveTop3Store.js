// src/lib/liveTop3Store.js
// Shared helpers for storing and retrieving Live Top 3 snapshots in Upstash/Vercel KV.

const CURRENT_KEY = process.env.LIVE_TOP3_CURRENT_KEY ?? "liveTop3:current";
const HISTORY_KEY = process.env.LIVE_TOP3_HISTORY_KEY ?? "liveTop3:history";
const HISTORY_LIMIT = Number(process.env.LIVE_TOP3_HISTORY_LIMIT ?? "288"); // default ≈ 24h @ 5 min
const DAILY_PREFIX = process.env.LIVE_TOP3_DAILY_PREFIX ?? "liveTop3:daily:";
const DAILY_LIMIT_PER_DAY = (() => {
  const value = Number(process.env.LIVE_TOP3_DAILY_LIMIT ?? "48");
  return Number.isFinite(value) && value > 0 ? value : 48;
})();

let kvClient = null;
let kvStatusChecked = false;

async function getKvClient() {
  if (kvStatusChecked) return kvClient;
  kvStatusChecked = true;
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    const mod = await import("@vercel/kv");
    kvClient = mod.kv;
  }
  return kvClient;
}

const memoryState = {
  snapshot: null,
  history: [],
};
const dailyMemory = new Map(); // key -> snapshots[]

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function normalizeLiveTop3Entry(item) {
  if (!item || typeof item !== "object") return null;
  const totalAmount = Number(item.totalAmount ?? item.amount ?? item.total);
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) return null;
  const gameShow = item.gameShow ?? item.game ?? item.name ?? null;
  if (!gameShow) return null;
  const multiplier = Number(item.multiplier ?? item.multi ?? item.x);
  const winnersCount = Number(item.winnersCount ?? item.totalWinners ?? item.winners);
  const settledAt = item.settledAt ?? item.startedAt ?? item.createdAt ?? null;
  const id =
    item.id ??
    item.gameShowEventId ??
    item.hash ??
    settledAt ??
    (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${gameShow}-${Date.now()}`);

  return {
    id,
    gameShow,
    multiplier: Number.isFinite(multiplier) ? multiplier : null,
    totalAmount,
    settledAt,
    winnersCount: Number.isFinite(winnersCount) ? winnersCount : null,
  };
}

export function normalizeLiveTop3Entries(payload) {
  if (!Array.isArray(payload)) return [];
  const parseTs = (value) => {
    if (!value) return 0;
    const ts = Date.parse(value);
    return Number.isFinite(ts) ? ts : 0;
  };
  return payload
    .map((item) => normalizeLiveTop3Entry(item))
    .filter(Boolean)
    .sort((a, b) => parseTs(b.settledAt ?? b.createdAt) - parseTs(a.settledAt ?? a.createdAt));
}

function normalizeSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return null;
  const entriesSource = Array.isArray(snapshot.entries) ? snapshot.entries : snapshot.data ?? snapshot.rows;
  const entries = normalizeLiveTop3Entries(entriesSource ?? []);
  if (!entries.length) return null;
  return {
    entries,
    fetchedAt: snapshot.fetchedAt ?? snapshot.updatedAt ?? snapshot.createdAt ?? new Date().toISOString(),
    source: snapshot.source ?? snapshot.sourceMeta ?? "unknown",
    meta: snapshot.meta ?? snapshot.sourceMeta ?? null,
  };
}

function pushMemorySnapshot(snapshot) {
  memoryState.snapshot = snapshot;
  memoryState.history.unshift(snapshot);
  if (memoryState.history.length > HISTORY_LIMIT) {
    memoryState.history.length = HISTORY_LIMIT;
  }
}

function snapshotYmd(snapshot) {
  const raw = snapshot?.fetchedAt ?? snapshot?.updatedAt ?? snapshot?.createdAt;
  if (typeof raw === "string" && raw.length >= 10) {
    return raw.slice(0, 10);
  }
  const date = new Date(raw ?? Date.now());
  if (!Number.isFinite(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

async function appendDailySnapshot(snapshot) {
  const ymd = snapshotYmd(snapshot);
  if (!ymd) return;
  const key = `${DAILY_PREFIX}${ymd}`;
  const arr = dailyMemory.get(key) ?? [];
  arr.unshift(snapshot);
  if (arr.length > DAILY_LIMIT_PER_DAY) arr.length = DAILY_LIMIT_PER_DAY;
  dailyMemory.set(key, arr);

  const kv = await getKvClient();
  if (!kv) return;
  try {
    await kv.lpush(key, JSON.stringify(snapshot));
    await kv.ltrim(key, 0, DAILY_LIMIT_PER_DAY - 1);
  } catch (error) {
    console.warn("[liveTop3Store] KV daily write failed:", error);
  }
}

export async function saveLiveTop3Snapshot(snapshot, options = {}) {
  const normalized = normalizeSnapshot(snapshot);
  if (!normalized) return null;
  normalized.fetchedAt = normalized.fetchedAt ?? new Date().toISOString();
  normalized.source = options.source ?? normalized.source ?? "unknown";
  normalized.meta = { ...(normalized.meta || {}), ...(options.meta || {}) };
  pushMemorySnapshot(normalized);
  await appendDailySnapshot(normalized);

  const kv = await getKvClient();
  if (!kv) return normalized;
  try {
    await kv.set(CURRENT_KEY, JSON.stringify(normalized));
    await kv.lpush(HISTORY_KEY, JSON.stringify(normalized));
    await kv.ltrim(HISTORY_KEY, 0, HISTORY_LIMIT - 1);
  } catch (error) {
    console.warn("[liveTop3Store] KV write failed:", error);
  }
  return normalized;
}

export async function getLiveTop3Snapshot() {
  if (memoryState.snapshot) return memoryState.snapshot;
  const kv = await getKvClient();
  if (!kv) return null;
  try {
    const raw = await kv.get(CURRENT_KEY);
    if (!raw) return null;
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    const normalized = normalizeSnapshot(parsed);
    if (normalized) {
      pushMemorySnapshot(normalized);
      return normalized;
    }
  } catch (error) {
    console.warn("[liveTop3Store] KV read failed:", error);
  }
  return null;
}

export async function getLiveTop3History(limit = 50) {
  if (!Number.isFinite(limit) || limit <= 0) limit = 50;
  const kv = await getKvClient();
  if (!kv) return memoryState.history.slice(0, limit);
  try {
    const rows = await kv.lrange(HISTORY_KEY, 0, limit - 1);
    const parsed = rows
      .map((row) => (typeof row === "string" ? JSON.parse(row) : row))
      .map((item) => normalizeSnapshot(item))
      .filter(Boolean);
    if (parsed.length) {
      memoryState.history = parsed;
      memoryState.snapshot = parsed[0];
    }
    return parsed.slice(0, limit);
  } catch (error) {
    console.warn("[liveTop3Store] KV history read failed:", error);
    return memoryState.history.slice(0, limit);
  }
}

export function buildSnapshotFromEntries(entries, meta = {}) {
  const normalizedEntries = normalizeLiveTop3Entries(entries ?? []);
  if (!normalizedEntries.length) return null;
  return {
    entries: normalizedEntries,
    fetchedAt: meta.fetchedAt ?? new Date().toISOString(),
    source: meta.source ?? "unknown",
    meta,
  };
}

async function readDailyFromKv(key, limit) {
  const kv = await getKvClient();
  if (!kv) return dailyMemory.get(key)?.slice(0, limit) ?? [];
  try {
    const rows = await kv.lrange(key, 0, limit - 1);
    const parsed = rows
      .map((row) => (typeof row === "string" ? JSON.parse(row) : row))
      .map((item) => normalizeSnapshot(item))
      .filter(Boolean);
    if (parsed.length) dailyMemory.set(key, parsed);
    return parsed.slice(0, limit);
  } catch (error) {
    console.warn("[liveTop3Store] KV daily read failed:", error);
    return dailyMemory.get(key)?.slice(0, limit) ?? [];
  }
}

export async function getLiveTop3DailySnapshots(ymd, limit = DAILY_LIMIT_PER_DAY) {
  if (!ymd) return [];
  const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : DAILY_LIMIT_PER_DAY;
  const key = `${DAILY_PREFIX}${ymd}`;
  const cached = dailyMemory.get(key);
  if (cached && cached.length >= safeLimit) {
    return cached.slice(0, safeLimit);
  }
  return readDailyFromKv(key, safeLimit);
}

export async function getLiveTop3Range(days = 7, perDay = Math.min(DAILY_LIMIT_PER_DAY, 12)) {
  const safeDays = Number.isFinite(days) && days > 0 ? Math.min(Math.round(days), 365) : 7;
  const safePerDay = Number.isFinite(perDay) && perDay > 0 ? Math.round(perDay) : Math.min(DAILY_LIMIT_PER_DAY, 12);
  const buckets = [];
  const today = new Date();
  for (let i = 0; i < safeDays; i++) {
    const date = new Date(today.getTime() - i * ONE_DAY_MS);
    const ymd = date.toISOString().slice(0, 10);
    const snapshots = await getLiveTop3DailySnapshots(ymd, safePerDay);
    buckets.push({ ymd, snapshots });
  }
  return buckets.reverse();
}
