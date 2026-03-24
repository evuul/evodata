import fs from "fs/promises";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "src", "app", "data", "shortHistory.json");
const KV_KEY = "short:history:v1";
const OUTLIER_WINDOW_DAYS = 10;
const OUTLIER_BAND_MARGIN_PP = 0.75;
const OUTLIER_MIN_DELTA_PP = 1.5;

let kvClientPromise = null;

function ensureKvEnv() {
  if (!process.env.KV_REST_API_URL && process.env.KV_URL) {
    process.env.KV_REST_API_URL = process.env.KV_URL;
  }
  if (!process.env.KV_REST_API_TOKEN && process.env.KV_REST_TOKEN) {
    process.env.KV_REST_API_TOKEN = process.env.KV_REST_TOKEN;
  }
}

async function getKvClient() {
  ensureKvEnv();
  if (kvClientPromise) return kvClientPromise;

  kvClientPromise = (async () => {
    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
      return undefined;
    }
    try {
      const mod = await import("@vercel/kv");
      return mod.kv;
    } catch {
      return undefined;
    }
  })();

  return kvClientPromise;
}

function normalizeShortHistory(data) {
  if (!Array.isArray(data)) return [];

  const byDate = new Map();
  for (const entry of data) {
    const date = String(entry?.date ?? entry?.d ?? "").trim();
    const percent = Number(entry?.percent ?? entry?.p);
    if (!date || !Number.isFinite(percent)) continue;
    byDate.set(date, +percent.toFixed(2));
  }

  return Array.from(byDate.entries())
    .map(([date, percent]) => ({ date, percent }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function computeRecentMaxDelta(entries) {
  if (!Array.isArray(entries) || entries.length < 2) return 0;
  let maxDelta = 0;
  for (let i = 1; i < entries.length; i += 1) {
    const prev = Number(entries[i - 1]?.percent);
    const next = Number(entries[i]?.percent);
    if (!Number.isFinite(prev) || !Number.isFinite(next)) continue;
    maxDelta = Math.max(maxDelta, Math.abs(next - prev));
  }
  return maxDelta;
}

function isSuspectedOutlier(candidate, accepted) {
  if (!candidate || !Array.isArray(accepted) || !accepted.length) return false;

  const value = Number(candidate.percent);
  if (!Number.isFinite(value)) return false;

  const recent = accepted.slice(-OUTLIER_WINDOW_DAYS);
  const previous = recent[recent.length - 1];
  const previousPercent = Number(previous?.percent);
  if (!Number.isFinite(previousPercent)) return false;

  const recentPercents = recent
    .map((entry) => Number(entry?.percent))
    .filter((percent) => Number.isFinite(percent));
  if (!recentPercents.length) return false;

  const recentMin = Math.min(...recentPercents);
  const recentMax = Math.max(...recentPercents);
  const outsideRecentBand =
    value < recentMin - OUTLIER_BAND_MARGIN_PP ||
    value > recentMax + OUTLIER_BAND_MARGIN_PP;

  const deltaFromPrevious = Math.abs(value - previousPercent);
  const recentMaxDelta = computeRecentMaxDelta(recent);
  const allowedDelta = Math.max(OUTLIER_MIN_DELTA_PP, recentMaxDelta * 3);

  return outsideRecentBand && deltaFromPrevious > allowedDelta;
}

function sanitizeShortHistory(data) {
  const normalized = normalizeShortHistory(data);
  if (!normalized.length) return normalized;

  const cleaned = [];
  for (const entry of normalized) {
    if (isSuspectedOutlier(entry, cleaned)) continue;
    cleaned.push(entry);
  }
  return cleaned;
}

function historyEquals(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i]?.date !== b[i]?.date || Number(a[i]?.percent) !== Number(b[i]?.percent)) {
      return false;
    }
  }
  return true;
}

async function readFileFallback() {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const normalized = normalizeShortHistory(JSON.parse(raw));
    const sanitized = sanitizeShortHistory(normalized);
    if (!historyEquals(normalized, sanitized)) {
      await writeFileFallback(sanitized);
    }
    return sanitized;
  } catch {
    return [];
  }
}

async function writeFileFallback(items) {
  try {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(items, null, 2), "utf8");
  } catch {}
}

export async function loadShortHistory() {
  const kv = await getKvClient();
  if (kv) {
    try {
      const stored = await kv.get(KV_KEY);
      if (stored) {
        const normalized =
          typeof stored === "string"
            ? normalizeShortHistory(JSON.parse(stored))
            : normalizeShortHistory(stored);
        const sanitized = sanitizeShortHistory(normalized);
        if (!historyEquals(normalized, sanitized)) {
          try {
            await kv.set(KV_KEY, JSON.stringify(sanitized));
          } catch {}
          await writeFileFallback(sanitized);
        }
        return sanitized;
      }
    } catch {}
  }

  const fallback = await readFileFallback();
  if (fallback.length && kv) {
    try {
      await kv.set(KV_KEY, JSON.stringify(fallback));
    } catch {}
  }
  return fallback;
}

export async function saveShortHistory(items) {
  const normalized = sanitizeShortHistory(items);
  const kv = await getKvClient();
  if (kv) {
    try {
      await kv.set(KV_KEY, JSON.stringify(normalized));
    } catch {}
  }
  await writeFileFallback(normalized);
  return normalized;
}

export async function clearShortHistory() {
  const kv = await getKvClient();
  if (kv) {
    try {
      await kv.del(KV_KEY);
    } catch {}
  }
  try {
    await fs.unlink(DATA_FILE);
  } catch {}
}
