// src/lib/kvLock.js
// Enkel Upstash/Vercel KV-lock + helper för "freshness".
let kvClient = null;

async function getKv() {
  if (kvClient !== null) return kvClient;
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    const mod = await import("@vercel/kv");
    kvClient = mod.kv;
  } else {
    kvClient = undefined;
  }
  return kvClient;
}

/**
 * Kör fn() om vi lyckas ta lock; annars returnera { locked: true }.
 * @param {string} key
 * @param {number} ttlMs
 * @param {() => Promise<any>} fn
 */
export async function withKvLock(key, ttlMs, fn) {
  const kv = await getKv();
  if (!kv) {
    // Ingen KV – kör bara fn
    return { locked: false, result: await fn() };
  }
  const lockKey = `lock:${key}`;
  const ok = await kv.set(lockKey, "1", { nx: true, px: ttlMs });
  if (!ok) return { locked: true };
  try {
    const result = await fn();
    return { locked: false, result };
  } finally {
    try { await kv.del(lockKey); } catch {}
  }
}