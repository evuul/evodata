// Manages bounded in-process caches for lobby overview payloads and series reads.

const globalCache = globalThis;
globalCache.__overviewCache ??= { byKey: new Map(), series: new Map() };

export const OVERVIEW_TTL_MS = (() => {
  const rawMs = Number(process.env.CS_OVERVIEW_REFRESH_MS);
  if (Number.isFinite(rawMs) && rawMs > 0) {
    return Math.min(rawMs, 24 * 60 * 60 * 1000);
  }
  const rawHours = Number(process.env.CS_OVERVIEW_REFRESH_HOURS);
  if (Number.isFinite(rawHours) && rawHours > 0) {
    return Math.min(rawHours * 60 * 60 * 1000, 24 * 60 * 60 * 1000);
  }
  return 6 * 60 * 60 * 1000;
})();

const SERIES_TTL_MS = Math.min(
  Math.max(5 * 60 * 1000, OVERVIEW_TTL_MS),
  6 * 60 * 60 * 1000
);

export function getOverviewCache(key) {
  const hit = globalCache.__overviewCache.byKey.get(key);
  if (!hit) return null;
  if (hit.exp > Date.now()) return hit;
  globalCache.__overviewCache.byKey.delete(key);
  return null;
}

export function setOverviewCache(key, data, etag, meta = null) {
  const now = Date.now();
  globalCache.__overviewCache.byKey.set(key, {
    data,
    etag,
    exp: now + OVERVIEW_TTL_MS,
    ts: now,
    meta: meta ?? null,
  });
}

export function getOverviewSeriesCache(slug, days) {
  const key = `${slug}::${days}`;
  const hit = globalCache.__overviewCache.series.get(key);
  if (hit && hit.exp > Date.now()) return hit.data;
  if (hit) globalCache.__overviewCache.series.delete(key);
  return null;
}

export function setOverviewSeriesCache(slug, days, data) {
  const key = `${slug}::${days}`;
  globalCache.__overviewCache.series.set(key, {
    data,
    exp: Date.now() + SERIES_TTL_MS,
  });
}
