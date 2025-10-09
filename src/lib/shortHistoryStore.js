import fs from "fs/promises";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "src", "app", "data", "shortHistory.json");
const KV_KEY = "short:history:v1";

let kvClientPromise = null;

async function getKvClient() {
  if (kvClientPromise) return kvClientPromise;

  kvClientPromise = (async () => {
    const normalizeUrl = (url) => (url && url.startsWith("http") ? url : undefined);
    const apiUrl =
      normalizeUrl(process.env.KV_REST_API_URL) ||
      normalizeUrl(process.env.KV_URL) ||
      normalizeUrl(process.env.UPSTASH_REDIS_REST_URL);
    const apiToken =
      process.env.KV_REST_API_TOKEN ||
      process.env.KV_REST_TOKEN ||
      process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!apiUrl || !apiToken) {
      return undefined;
    }
    try {
      if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_URL.startsWith("http")) {
        process.env.KV_REST_API_URL = apiUrl;
      }
      if (!process.env.KV_REST_API_TOKEN) process.env.KV_REST_API_TOKEN = apiToken;
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

async function readFileFallback() {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    return normalizeShortHistory(JSON.parse(raw));
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
        if (typeof stored === "string") return normalizeShortHistory(JSON.parse(stored));
        return normalizeShortHistory(stored);
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
  const normalized = normalizeShortHistory(items);
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
