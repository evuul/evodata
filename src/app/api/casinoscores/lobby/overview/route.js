export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 60;

import averagePlayersData from "@/app/data/averagePlayers.json";
import { getSeries, dailyAverages, getOverviewSnapshot, setOverviewSnapshot } from "@/lib/csStore";
import { SERIES_SLUGS, CRAZY_TIME_A_RESET_MS } from "../../players/shared";

const TZ = "Europe/Stockholm";
const BUCKET_MS = 60 * 1000; // 1 min
const RESPONSE_CACHE_CONTROL = "public, max-age=30, s-maxage=30, stale-while-revalidate=60";

// ---------- In-process cache (per Node-instans) ----------
const g = globalThis;
g.__overviewCache ??= { byKey: new Map(), series: new Map() };
const OVERVIEW_TTL_MS = (() => {
  const rawMs = Number(process.env.CS_OVERVIEW_REFRESH_MS);
  if (Number.isFinite(rawMs) && rawMs > 0) {
    return Math.min(rawMs, 24 * 60 * 60 * 1000); // max 24 h
  }
  const rawHours = Number(process.env.CS_OVERVIEW_REFRESH_HOURS);
  if (Number.isFinite(rawHours) && rawHours > 0) {
    return Math.min(rawHours * 60 * 60 * 1000, 24 * 60 * 60 * 1000);
  }
  return 6 * 60 * 60 * 1000; // default ~6 h ⇒ ~4 uppdateringar/dygn
})();
// Per-serie TTL följer overview men caps vid 6 h för att hålla minnet i schack
const SERIES_TTL_MS = Math.min(Math.max(5 * 60 * 1000, OVERVIEW_TTL_MS), 6 * 60 * 60 * 1000);

function getOverviewCache(key) {
  const hit = g.__overviewCache.byKey.get(key);
  if (!hit) return null;
  if (hit.exp > Date.now()) return hit;
  g.__overviewCache.byKey.delete(key);
  return null;
}
function setOverviewCache(key, data, etag, meta = null) {
  const now = Date.now();
  g.__overviewCache.byKey.set(key, {
    data,
    etag,
    exp: now + OVERVIEW_TTL_MS,
    ts: now,
    meta: meta ?? null,
  });
}

function getSeriesCache(slug, days) {
  const k = `${slug}::${days}`;
  const hit = g.__overviewCache.series.get(k);
  if (hit && hit.exp > Date.now()) return hit.data;
  if (hit) g.__overviewCache.series.delete(k);
  return null;
}
function setSeriesCache(slug, days, data) {
  const k = `${slug}::${days}`;
  g.__overviewCache.series.set(k, { data, exp: Date.now() + SERIES_TTL_MS });
}

// ---------- helpers ----------
function resJSON(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": RESPONSE_CACHE_CONTROL,
      ...extraHeaders,
    },
  });
}

function attachMeta(base, meta) {
  return {
    ...base,
    _meta: meta,
  };
}

function makeEtag(obj) {
  const s = JSON.stringify(obj);
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return `W/"${h.toString(16)}"`;
}

const YMD_FORMATTER = new Intl.DateTimeFormat("sv-SE", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function normalizeFormattedYMD(value) {
  const parts = String(value)
    .split(/[^\d]/)
    .filter(Boolean);
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return value;
}

function stockholmTodayYMD() {
  try {
    return normalizeFormattedYMD(YMD_FORMATTER.format(new Date()));
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function stockholmYMDFromTs(ts) {
  try {
    const date = new Date(Number(ts));
    if (!Number.isFinite(date.getTime())) return null;
    return normalizeFormattedYMD(YMD_FORMATTER.format(date));
  } catch {
    return null;
  }
}

function bucketTs(ts) {
  return Math.floor(ts / BUCKET_MS) * BUCKET_MS;
}

const STATIC_DAILY = (() => {
  // Gör parsing en gång per process
  if (!Array.isArray(averagePlayersData)) return [];
  return averagePlayersData
    .map((row) => {
      const date = row?.Datum || row?.date || null;
      const players = Number(row?.Players ?? row?.players);
      if (!date || !Number.isFinite(players)) return null;
      return { date, players };
    })
    .filter(Boolean)
    .sort((a, b) => a.date.localeCompare(b.date));
})();

function computeAthFromDailyRows(staticDaily, dynamicDaily) {
  let athValue = null;
  let athDate = null;

  for (const row of staticDaily) {
    const v = row.players;
    if (!Number.isFinite(v)) continue;
    if (athValue === null || v > athValue) {
      athValue = v;
      athDate = row.date;
    }
  }
  for (const row of dynamicDaily) {
    const v = Number(row?.avgPlayers);
    if (!Number.isFinite(v)) continue;
    if (athValue === null || v > athValue) {
      athValue = v;
      athDate = row.date || null;
    }
  }
  return athValue != null ? { value: Math.round(athValue), date: athDate } : null;
}

function buildDailyTotals(perSlugSeries, today) {
  const totals = new Map(); // date -> sum

  for (const { daily } of perSlugSeries) {
    for (let i = 0; i < daily.length; i++) {
      const date = daily[i].date;
      const avg = Number(daily[i].avg);
      if (!date || !Number.isFinite(avg)) continue;
      if (date >= today) continue; // hoppa över pågående dag
      totals.set(date, (totals.get(date) ?? 0) + avg);
    }
  }

  return Array.from(totals.entries())
    .map(([date, sum]) => ({
      date,
      avgPlayers: Math.round(sum * 100) / 100,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function computeTodayPeak(perSlugSeries, today) {
  const bucketMap = new Map(); // bucketTs -> sum av per-slug-peak

  for (const { series } of perSlugSeries) {
    // track peak per bucket för denna slug
    const localPeak = new Map(); // bucket -> peak
    for (let i = 0; i < (series?.length ?? 0); i++) {
      const p = series[i];
      const ts = Number(p?.ts);
      const value = Number(p?.value);
      if (!Number.isFinite(ts) || !Number.isFinite(value)) continue;
      const bucket = bucketTs(ts);
      const ymd = stockholmYMDFromTs(bucket);
      if (!ymd || ymd !== today) continue;
      const prev = localPeak.get(bucket);
      if (!Number.isFinite(prev) || value > prev) localPeak.set(bucket, value);
    }
    // addera detta slags peak in i totalen
    for (const [b, v] of localPeak.entries()) {
      bucketMap.set(b, (bucketMap.get(b) ?? 0) + v);
    }
  }

  if (!bucketMap.size) return { peak: null, buckets: [] };

  const buckets = Array.from(bucketMap.entries())
    .map(([ts, value]) => ({ ts, value: Math.round(value) }))
    .sort((a, b) => a.ts - b.ts);

  let peak = buckets[0];
  for (let i = 1; i < buckets.length; i++) {
    if (buckets[i].value > peak.value) peak = buckets[i];
  }
  return {
    peak: peak ? { value: peak.value, at: new Date(peak.ts).toISOString() } : null,
    buckets: buckets.map((row) => ({
      at: new Date(row.ts).toISOString(),
      value: row.value,
    })),
  };
}

// ---------- GET med cache + tidsmätning ----------
export async function GET(req) {
  const t0 = Date.now();
  try {
    const { searchParams } = new URL(req.url);
    const daysParam = Number(searchParams.get("days"));
    const targetDays = Number.isFinite(daysParam) ? Math.max(7, Math.min(daysParam, 365)) : 45;

    // Överblicks-cache (hela svaret) per days
    const overviewKey = `overview:${targetDays}`;
    const cachedEntry = getOverviewCache(overviewKey);
    if (cachedEntry) {
      const inm = req.headers.get("if-none-match");
      if (inm && cachedEntry.etag && inm === cachedEntry.etag) {
        return new Response(null, {
          status: 304,
          headers: {
            ETag: cachedEntry.etag,
            "Cache-Control": RESPONSE_CACHE_CONTROL,
          },
        });
      }
      const t = Date.now() - t0;
      const cachedAtMs =
        typeof cachedEntry.ts === "number" && Number.isFinite(cachedEntry.ts)
          ? cachedEntry.ts
          : cachedEntry.exp - OVERVIEW_TTL_MS;
      const storedMeta =
        cachedEntry.meta && typeof cachedEntry.meta === "object" ? cachedEntry.meta : {};
      const payload = attachMeta(cachedEntry.data, {
        cached: true,
        totalMs: t,
        refreshIntervalMs: Number.isFinite(storedMeta.refreshIntervalMs)
          ? storedMeta.refreshIntervalMs
          : OVERVIEW_TTL_MS,
        cachedAt:
          typeof storedMeta.cachedAt === "string"
            ? storedMeta.cachedAt
            : new Date(cachedAtMs).toISOString(),
        staleAfter:
          typeof storedMeta.staleAfter === "string"
            ? storedMeta.staleAfter
            : new Date(cachedEntry.exp).toISOString(),
        persisted: Boolean(storedMeta.persisted),
      });
      const headers = cachedEntry.etag ? { ETag: cachedEntry.etag } : {};
      return resJSON(payload, 200, headers);
    }

    const storedSnapshot = await getOverviewSnapshot(targetDays);
    if (storedSnapshot && storedSnapshot.data) {
      const snapshotMeta =
        storedSnapshot.meta && typeof storedSnapshot.meta === "object"
          ? storedSnapshot.meta
          : {};
      const refreshIntervalMsRaw = Number(snapshotMeta.refreshIntervalMs);
      const refreshIntervalMs =
        Number.isFinite(refreshIntervalMsRaw) && refreshIntervalMsRaw > 0
          ? refreshIntervalMsRaw
          : OVERVIEW_TTL_MS;
      const staleAfterMs =
        typeof snapshotMeta.staleAfter === "string"
          ? Date.parse(snapshotMeta.staleAfter)
          : Number.NaN;
      const isFresh = Number.isFinite(staleAfterMs) ? staleAfterMs > Date.now() : true;
      if (isFresh) {
        const cachedAtMs =
          typeof snapshotMeta.cachedAt === "string"
            ? Date.parse(snapshotMeta.cachedAt)
            : Number.NaN;
        const cachedAtIso = Number.isFinite(cachedAtMs)
          ? new Date(cachedAtMs).toISOString()
          : Number.isFinite(staleAfterMs)
          ? new Date(staleAfterMs - refreshIntervalMs).toISOString()
          : new Date().toISOString();
        const staleAfterIso = Number.isFinite(staleAfterMs)
          ? new Date(staleAfterMs).toISOString()
          : new Date(Date.now() + refreshIntervalMs).toISOString();
        const etag = storedSnapshot.etag ?? makeEtag(storedSnapshot.data);
        const baseMeta = {
          refreshIntervalMs,
          cachedAt: cachedAtIso,
          staleAfter: staleAfterIso,
          persisted: true,
        };
        setOverviewCache(overviewKey, storedSnapshot.data, etag, baseMeta);
        const totalMs = Date.now() - t0;
        const payload = attachMeta(storedSnapshot.data, {
          ...baseMeta,
          cached: true,
          totalMs,
        });
        return resJSON(payload, 200, { ETag: etag });
      }
    }

    const tSeries0 = Date.now();
    // Hämta alla serier – använd per-serie-cache för att undvika upprepade nätverksanrop
    const perSlugSeries = await Promise.all(
      SERIES_SLUGS.map(async (seriesId) => {
        const cachedSeries = getSeriesCache(seriesId, targetDays + 5);
        let series;
        if (cachedSeries) {
          series = cachedSeries;
        } else {
          const raw = await getSeries(seriesId, targetDays + 5);
          const arr = Array.isArray(raw) ? raw : [];
          const filtered =
            seriesId === "crazy-time:a"
              ? arr.filter((p) => Number.isFinite(p?.ts) && p.ts >= CRAZY_TIME_A_RESET_MS)
              : arr;
          series = filtered;
          setSeriesCache(seriesId, targetDays + 5, series);
        }
        return { slug: seriesId, series };
      })
    );
    const tSeries = Date.now() - tSeries0;

    const todayYmd = stockholmTodayYMD();
    const perSlugData = perSlugSeries.map(({ slug, series }) => {
      const daily = dailyAverages(series) || [];
      let sum = 0;
      let count = 0;
      let latestTs = null;
      let latestValue = null;
      let athValue = null;
      let athTs = null;

      for (let i = 0; i < (series?.length ?? 0); i++) {
        const entry = series[i];
        const value = Number(entry?.value);
        const ts = Number(entry?.ts);
        if (!Number.isFinite(value)) continue;
        sum += value;
        count += 1;

        if (Number.isFinite(ts)) {
          if (latestTs === null || ts > latestTs) {
            latestTs = ts;
            latestValue = value;
          }
          if (athValue === null || value > athValue) {
            athValue = value;
            athTs = ts;
          }
        } else if (athValue === null || value > athValue) {
          athValue = value;
          athTs = null;
        }
      }

      const average = count > 0 ? Math.round((sum / count) * 100) / 100 : null;
      const latest =
        latestValue != null && latestTs != null
          ? { value: Math.round(latestValue), at: new Date(latestTs).toISOString() }
          : null;
      const ath =
        athValue != null
          ? {
              value: Math.round(athValue),
              at: athTs != null ? new Date(athTs).toISOString() : null,
            }
          : null;

      return {
        slug,
        series,
        daily,
        summary: { average, latest, ath },
      };
    });

    // Aggregeringar
    const tAgg0 = Date.now();
    const dailyTotals = buildDailyTotals(perSlugData, todayYmd);
    const ath = computeAthFromDailyRows(STATIC_DAILY, dailyTotals);
    const { peak: todayPeak, buckets } = computeTodayPeak(perSlugData, todayYmd);

    const days7 = dailyTotals.slice(-7);
    const days30 = dailyTotals.slice(-30);

    // snitt + toppar per slug (enkelt medel av alla punkter)
    const slugAverages = perSlugData.map(({ slug, summary }) => ({
      slug,
      avgPlayers: summary.average,
    }));
    const slugDetails = perSlugData.map(({ slug, summary }) => ({
      slug,
      latest: summary.latest,
      ath: summary.ath,
    }));
    const tAgg = Date.now() - tAgg0;

    const basePayload = {
      ok: true,
      dailyTotals,
      ath,
      todayPeak,
      averages: { days7, days30 },
      samples: { todayBuckets: buckets },
      slugAverages,
      slugDetails,
      generatedAt: new Date().toISOString(),
    };

    const etag = makeEtag(basePayload);

    // Spara översikt i cache
    const totalMs = Date.now() - t0;
    const now = Date.now();
    const cachedAtIso = new Date(now).toISOString();
    const staleAfterIso = new Date(now + OVERVIEW_TTL_MS).toISOString();
    const cacheMeta = {
      refreshIntervalMs: OVERVIEW_TTL_MS,
      cachedAt: cachedAtIso,
      staleAfter: staleAfterIso,
      persisted: false,
    };

    setOverviewCache(overviewKey, basePayload, etag, cacheMeta);
    await setOverviewSnapshot(targetDays, {
      data: basePayload,
      etag,
      meta: { ...cacheMeta, persisted: true },
    });

    const payload = attachMeta(basePayload, {
      ...cacheMeta,
      cached: false,
      fetchMs: tSeries,
      aggMs: tAgg,
      totalMs,
    });
    return resJSON(payload, 200, { ETag: etag });
  } catch (error) {
    return resJSON(
      { ok: false, error: error?.message || String(error) },
      500,
      { "Cache-Control": "no-store" }
    );
  }
}
