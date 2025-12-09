export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 60;

import averagePlayersData from "@/app/data/averagePlayers.json";
import {
  getSeriesBulk,
  dailyAverages,
  getOverviewSnapshot,
  setOverviewSnapshot,
  getDailyAggregates,
  getGlobalLobbyAth,
  setGlobalLobbyAth,
  getDailyLobbyPeak,
} from "@/lib/csStore";
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

function mergeAthWithTodayPeak(currentAth, todayPeak, todayYmd) {
  const todayValue = Number(todayPeak?.value);
  if (!Number.isFinite(todayValue)) return currentAth;
  const shouldReplace =
    !currentAth || !Number.isFinite(currentAth.value) || todayValue > Number(currentAth.value);
  if (!shouldReplace) return currentAth;
  return {
    value: Math.round(todayValue),
    date: todayYmd || currentAth?.date || null,
    at: todayPeak?.at ?? null,
  };
}

function pickBetterAth(a, b) {
  const aVal = Number(a?.value);
  const bVal = Number(b?.value);
  if (!Number.isFinite(aVal)) return Number.isFinite(bVal) ? b : null;
  if (!Number.isFinite(bVal)) return a;
  return aVal >= bVal ? a : b;
}

function pickDailyPeakPreference(primary, fallback, defaultDate) {
  const primaryValue = Number(primary?.value);
  const fallbackValue = Number(fallback?.value);
  if (Number.isFinite(primaryValue) && (!Number.isFinite(fallbackValue) || primaryValue >= fallbackValue)) {
    return {
      value: Math.round(primaryValue),
      at: primary?.at ?? null,
      date: primary?.date ?? defaultDate ?? null,
    };
  }
  if (Number.isFinite(fallbackValue)) {
    return {
      value: Math.round(fallbackValue),
      at: fallback?.at ?? null,
      date: fallback?.date ?? defaultDate ?? null,
    };
  }
  return null;
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
    const force = searchParams.get("force") === "1";

    // Överblicks-cache (hela svaret) per days
    const overviewKey = `overview:${targetDays}`;
    const cachedEntry = force ? null : getOverviewCache(overviewKey);
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
        source:
          typeof storedMeta.source === "string" && storedMeta.source.length
            ? storedMeta.source
            : "cache",
      });
      const headers = cachedEntry.etag ? { ETag: cachedEntry.etag } : {};
      return resJSON(payload, 200, headers);
    }

    const storedSnapshot = force ? null : await getOverviewSnapshot(targetDays);
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
          source:
            typeof snapshotMeta.source === "string" && snapshotMeta.source.length
              ? snapshotMeta.source
              : "snapshot",
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

    const aggregatesStart = Date.now();
    const dailyAggregates = await getDailyAggregates(SERIES_SLUGS, targetDays + 5);
    const aggregatesFetchMs = Date.now() - aggregatesStart;

    const recentDays = 2;
    const cachedSeriesMap = new Map();
    for (const slug of SERIES_SLUGS) {
      const cached = getSeriesCache(slug, recentDays);
      if (cached) cachedSeriesMap.set(slug, cached);
    }
    const missingForRecent = SERIES_SLUGS.filter((slug) => !cachedSeriesMap.has(slug));
    let fetchedRecent = new Map();
    let recentFetchMs = 0;
    if (missingForRecent.length) {
      const recentStart = Date.now();
      fetchedRecent = await getSeriesBulk(missingForRecent, recentDays);
      recentFetchMs = Date.now() - recentStart;
    }
    const perSlugSeries = SERIES_SLUGS.map((slug) => {
      const cached = cachedSeriesMap.get(slug);
      const raw = cached ?? fetchedRecent.get(slug) ?? [];
      const arr = Array.isArray(raw) ? raw : [];
      const filtered =
        slug === "crazy-time:a"
          ? arr.filter((p) => Number.isFinite(p?.ts) && p.ts >= CRAZY_TIME_A_RESET_MS)
          : arr;
      if (!cached) setSeriesCache(slug, recentDays, filtered);
      return { slug, series: filtered };
    });
    const seriesBySlug = new Map(perSlugSeries.map(({ slug, series }) => [slug, series]));
    let fetchMs = aggregatesFetchMs + recentFetchMs;

    const todayYmd = stockholmTodayYMD();
    const dayTotalsMap = new Map(); // date -> total avg players
    let perSlugData = SERIES_SLUGS.map((slug) => {
      const perDayMap = dailyAggregates.get(slug) ?? new Map();
      const dates = Array.from(perDayMap.keys()).sort((a, b) => a.localeCompare(b));
      const daily = [];
      let totalSum = 0;
      let totalCount = 0;
      let latestTs = null;
      let latestValue = null;
      let athValue = null;
      let athTs = null;

      for (const date of dates) {
        const entry = perDayMap.get(date);
        if (!entry) continue;
        const { sum = 0, count = 0, max = null, maxTs = null, latestValue: lv, latestTs: lts } = entry;
        totalSum += Number(sum) || 0;
        totalCount += Number(count) || 0;

        if (lv != null && Number.isFinite(lv) && Number.isFinite(lts) && (latestTs == null || lts > latestTs)) {
          latestTs = lts;
          latestValue = lv;
        }

        if (Number.isFinite(max) && (athValue == null || max > athValue)) {
          athValue = max;
          athTs = Number.isFinite(maxTs) ? maxTs : null;
        }

        if (Number.isFinite(sum) && Number.isFinite(count) && count > 0 && date < todayYmd) {
          const avg = Math.round((sum / count) * 100) / 100;
          daily.push({ date, avg });
          dayTotalsMap.set(date, (dayTotalsMap.get(date) ?? 0) + avg);
        }
      }

      const trimmedDaily = daily.slice(-targetDays);
      const average =
        totalCount > 0 ? Math.round((totalSum / totalCount) * 100) / 100 : null;
      const latest =
        latestValue != null
          ? {
              value: Math.round(latestValue),
              at: latestTs != null ? new Date(latestTs).toISOString() : null,
            }
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
        series: seriesBySlug.get(slug) ?? [],
        daily: trimmedDaily,
        summary: { average, latest, ath },
      };
    });

    // Aggregeringar
    const tAgg0 = Date.now();
    let dailyTotals = Array.from(dayTotalsMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, total]) => ({
        date,
        avgPlayers: Math.round(Number(total || 0) * 100) / 100,
      }))
      .slice(-targetDays);
    let ath = computeAthFromDailyRows(STATIC_DAILY, dailyTotals);
    let { peak: todayPeak, buckets } = computeTodayPeak(perSlugData, todayYmd);

    let days7 = dailyTotals.slice(-7);
    let days30 = dailyTotals.slice(-30);

    // snitt + toppar per slug (enkelt medel av alla punkter)
    let slugAverages = perSlugData.map(({ slug, summary }) => ({
      slug,
      avgPlayers: summary.average,
    }));
    let slugDetails = perSlugData.map(({ slug, summary }) => ({
      slug,
      latest: summary.latest,
      ath: summary.ath,
    }));
    let aggMs = Date.now() - tAgg0;

    const hasAggregateData =
      dailyTotals.length > 0 ||
      perSlugData.some(
        (item) =>
          (item.daily?.length ?? 0) > 0 ||
          (item.summary?.average != null && Number.isFinite(item.summary.average))
      );

    let dataSource = "aggregates";

    if (!hasAggregateData) {
      dataSource = "series";

      const fetchStart = Date.now();
      const cacheKeyDays = targetDays + 5;
      const cachedEntries = new Map();
      for (const slug of SERIES_SLUGS) {
        const cached = getSeriesCache(slug, cacheKeyDays);
        if (cached) cachedEntries.set(slug, cached);
      }
      const missingSlugs = SERIES_SLUGS.filter((slug) => !cachedEntries.has(slug));
      let fetched = new Map();
      if (missingSlugs.length) {
        fetched = await getSeriesBulk(missingSlugs, cacheKeyDays);
      }
      fetchMs = Date.now() - fetchStart;

      perSlugData = SERIES_SLUGS.map((slug) => {
        const cached = cachedEntries.get(slug);
        const raw = cached ?? fetched.get(slug) ?? [];
        const arr = Array.isArray(raw) ? raw : [];
        const filtered =
          slug === "crazy-time:a"
            ? arr.filter((p) => Number.isFinite(p?.ts) && p.ts >= CRAZY_TIME_A_RESET_MS)
            : arr;
        if (!cached) setSeriesCache(slug, cacheKeyDays, filtered);

        const daily = dailyAverages(filtered) || [];
        let sum = 0;
        let count = 0;
        let latestTs = null;
        let latestValue = null;
        let athValue = null;
        let athTs = null;

        for (let i = 0; i < filtered.length; i++) {
          const entry = filtered[i];
          const value = Number(entry?.value);
          const ts = Number(entry?.ts);
          if (!Number.isFinite(value)) continue;
          sum += value;
          count += 1;
          if (Number.isFinite(ts)) {
            if (latestTs == null || ts > latestTs) {
              latestTs = ts;
              latestValue = value;
            }
            if (athValue == null || value > athValue) {
              athValue = value;
              athTs = ts;
            }
          } else if (athValue == null || value > athValue) {
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
          series: filtered,
          daily,
          summary: { average, latest, ath },
        };
      });

      const fallbackAggStart = Date.now();
      dailyTotals = buildDailyTotals(perSlugData, todayYmd);
      ath = computeAthFromDailyRows(STATIC_DAILY, dailyTotals);
      ({ peak: todayPeak, buckets } = computeTodayPeak(perSlugData, todayYmd));
      days7 = dailyTotals.slice(-7);
      days30 = dailyTotals.slice(-30);
      slugAverages = perSlugData.map(({ slug, summary }) => ({
        slug,
        avgPlayers: summary.average,
      }));
      slugDetails = perSlugData.map(({ slug, summary }) => ({
        slug,
        latest: summary.latest,
        ath: summary.ath,
      }));
      aggMs = Date.now() - fallbackAggStart;
    }

    const storedTodayPeak = await getDailyLobbyPeak(todayYmd);
    todayPeak = pickDailyPeakPreference(storedTodayPeak, todayPeak, todayYmd);

    const storedAth = await getGlobalLobbyAth();
    const athWithToday = mergeAthWithTodayPeak(ath, todayPeak, todayYmd);
    let finalAth = pickBetterAth(athWithToday, storedAth);
    if (!finalAth) finalAth = athWithToday ?? storedAth ?? null;
    if (finalAth && (!storedAth || finalAth.value > storedAth.value)) {
      await setGlobalLobbyAth({
        value: finalAth.value,
        date: finalAth.date ?? storedAth?.date ?? todayYmd ?? null,
        at: finalAth.at ?? storedAth?.at ?? todayPeak?.at ?? null,
      });
    }
    ath = finalAth ?? athWithToday ?? storedAth ?? ath;

    const slugDaily = Object.fromEntries(
      perSlugData.map(({ slug, daily }) => [slug, daily])
    );

    const trendDelta = (() => {
      if (dailyTotals.length < 2) return null;
      const first = dailyTotals[0];
      const last = dailyTotals[dailyTotals.length - 1];
      if (!first || !last) return null;
      const startValue = Number(first.avgPlayers);
      const endValue = Number(last.avgPlayers);
      if (!Number.isFinite(startValue) || !Number.isFinite(endValue)) return null;
      const absolute = Math.round((endValue - startValue) * 100) / 100;
      const percent =
        startValue !== 0
          ? Math.round(((endValue - startValue) / startValue) * 10000) / 100
          : null;
      return {
        start: { date: first.date, value: startValue },
        end: { date: last.date, value: endValue },
        absolute,
        percent,
      };
    })();

    const basePayload = {
      ok: true,
      dailyTotals,
      ath,
      todayPeak,
      averages: { days7, days30 },
      samples: { todayBuckets: buckets },
      slugAverages,
      slugDetails,
      slugDaily,
      trendDelta,
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
      source: dataSource,
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
      fetchMs,
      aggMs,
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
