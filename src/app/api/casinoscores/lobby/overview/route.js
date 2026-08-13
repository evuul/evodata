export const runtime = "nodejs";
// Aggregates cached lobby history for the public dashboard overview.

export const dynamic = "force-dynamic";
export const revalidate = 60;

import averagePlayersData from "@/app/data/averagePlayers.json";
import {
  getSeriesBulk,
  dailyAverages,
  getOverviewSnapshot,
  setOverviewSnapshot,
  getDailySnapshot,
  setDailySnapshot,
  getDailyAggregates,
  getGlobalLobbyAth,
  getGameAthSnapshot,
  getMonthlyLobbyActivitySnapshot,
  setGlobalLobbyAth,
  setMonthlyLobbyActivitySnapshot,
  getDailyLobbyPeak,
} from "@/lib/csStore";
import { SERIES_SLUGS, CRAZY_TIME_A_RESET_MS } from "../../players/shared";
import {
  applyRecoveryForDate,
  resolveRecoveryDate,
  shouldUseLiveTrackerRecovery,
} from "@/lib/liveTrackerRecovery";
import { buildPublicErrorBody, logApiError } from "@/lib/apiErrors";
import { buildStuckAdjustedDailyTotals, computeTrailingStuckMeta } from "@/lib/stuckGames";
import {
  OVERVIEW_TTL_MS,
  getOverviewCache,
  getOverviewSeriesCache,
  setOverviewCache,
  setOverviewSeriesCache,
} from "@/lib/lobbyOverviewCache";
import {
  applyDailyTotalOverrides,
  recomputeTrendDelta,
  withManualDailyOverrides,
} from "@/lib/lobbyOverviewBackfill";
import {
  deserializeDailyAggregates,
  serializeDailyAggregates,
} from "@/lib/dailyAggregatesSnapshot";
import { resolveRequestUser } from "@/lib/authSession";
import { hasExtendedDataAccess, normalizeHistoryDays } from "@/lib/founderAccess";
import { limitHistoryReadDays } from "@/lib/historyRange";
import { mergeGameAthIntoOverview } from "@/lib/gameAthOverview";
import {
  mergeDailyLobbyHistory,
  mergeMonthlyLobbyActivitySnapshot,
} from "@/lib/monthlyLobbyActivity";
import { FORECAST_GAME_IDS } from "@/config/games";

const TZ = "Europe/Stockholm";
const BUCKET_MS = 60 * 1000; // 1 min
const MIN_TIME_WEIGHTED_COVERAGE_MS = 12 * 60 * 60 * 1000;
const RESPONSE_CACHE_CONTROL = "public, max-age=30, s-maxage=30, stale-while-revalidate=60";

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

function withExtendedStaticHistory(basePayload, targetDays) {
  if (!basePayload || targetDays <= 365) return basePayload;

  const dailyTotals = mergeDailyLobbyHistory(STATIC_DAILY, basePayload.dailyTotals).slice(-targetDays);
  const rawDailyTotals = mergeDailyLobbyHistory(
    STATIC_DAILY,
    basePayload.rawDailyTotals ?? basePayload.dailyTotals
  ).slice(-targetDays);
  const adjustedDailyTotals = mergeDailyLobbyHistory(
    STATIC_DAILY,
    basePayload.adjustedDailyTotals ?? basePayload.dailyTotals
  ).slice(-targetDays);

  return {
    ...basePayload,
    dailyTotals,
    rawDailyTotals,
    adjustedDailyTotals,
    trendDelta: recomputeTrendDelta(dailyTotals),
    rawTrendDelta: recomputeTrendDelta(rawDailyTotals),
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

function applyTimeWeightedDailyAverages(perSlugData, seriesBySlug, todayYmd) {
  return perSlugData.map((item) => {
    const series = seriesBySlug.get(item.slug) ?? [];
    const eligibleSeries =
      item.slug === "crazy-time:a"
        ? series.filter((point) => Number(point?.ts) >= CRAZY_TIME_A_RESET_MS)
        : series;
    const weightedRows = dailyAverages(eligibleSeries);
    if (!weightedRows.length) return item;

    const dailyByDate = new Map((item.daily ?? []).map((row) => [row.date, row]));
    for (const row of weightedRows) {
      if (row.date >= todayYmd || Number(row.coverageMs) < MIN_TIME_WEIGHTED_COVERAGE_MS) continue;
      dailyByDate.set(row.date, { date: row.date, avg: row.avg });
    }

    return {
      ...item,
      daily: Array.from(dailyByDate.values()).sort((left, right) => left.date.localeCompare(right.date)),
    };
  });
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
  const requestUrl = new URL(req.url);
  const extendedAccessRequested = requestUrl.searchParams.get("access") === "extended";
  const resolved = extendedAccessRequested
    ? await resolveRequestUser(req, { cache: false })
    : null;
  const hasExtendedAccess = Boolean(resolved && hasExtendedDataAccess(resolved.user));
  if (extendedAccessRequested && !hasExtendedAccess) {
    return resJSON({ ok: false, error: "Extended data access required" }, 403, {
      "Cache-Control": "private, no-store",
      Vary: "Cookie, Authorization",
    });
  }
  const responseCacheControl = extendedAccessRequested
    ? "private, no-store"
    : RESPONSE_CACHE_CONTROL;
  const respond = (data, status = 200, headers = {}) => resJSON(data, status, {
    "Cache-Control": responseCacheControl,
    ...(extendedAccessRequested ? { Vary: "Cookie, Authorization" } : null),
    ...headers,
  });
  try {
    const { searchParams } = requestUrl;
    const daysParam = Number(searchParams.get("days"));
    const targetDays = normalizeHistoryDays(daysParam, { hasExtendedAccess });
    const effectiveHistoryDays = limitHistoryReadDays(targetDays, stockholmTodayYMD());
    const gameAthSnapshot = await getGameAthSnapshot().catch(() => null);
    const recoveryEnabled = shouldUseLiveTrackerRecovery(process.env);
    const forceEffective = recoveryEnabled;

    // Överblicks-cache (hela svaret) per days
    const overviewKey = `overview:${targetDays}`;
    const cachedEntry = forceEffective ? null : getOverviewCache(overviewKey);
    if (cachedEntry) {
      const t = Date.now() - t0;
      const cachedAtMs =
        typeof cachedEntry.ts === "number" && Number.isFinite(cachedEntry.ts)
          ? cachedEntry.ts
          : cachedEntry.exp - OVERVIEW_TTL_MS;
      const storedMeta =
        cachedEntry.meta && typeof cachedEntry.meta === "object" ? cachedEntry.meta : {};
      const adjustedData = withExtendedStaticHistory(
        mergeGameAthIntoOverview(
          withManualDailyOverrides(cachedEntry.data, stockholmTodayYMD()),
          gameAthSnapshot
        ),
        targetDays
      );
      if (adjustedData !== cachedEntry.data) {
        cachedEntry.data = adjustedData;
        cachedEntry.etag = makeEtag(adjustedData);
      }
      const inm = req.headers.get("if-none-match");
      if (inm && cachedEntry.etag && inm === cachedEntry.etag) {
        return new Response(null, {
          status: 304,
          headers: {
            ETag: cachedEntry.etag,
            "Cache-Control": responseCacheControl,
            ...(extendedAccessRequested ? { Vary: "Cookie, Authorization" } : null),
          },
        });
      }
      const payload = attachMeta(adjustedData, {
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
      return respond(payload, 200, headers);
    }

    const storedSnapshot = forceEffective ? null : await getOverviewSnapshot(targetDays);
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
        const adjustedSnapshotData = withExtendedStaticHistory(
          mergeGameAthIntoOverview(
            withManualDailyOverrides(storedSnapshot.data, stockholmTodayYMD()),
            gameAthSnapshot
          ),
          targetDays
        );
        const etag = makeEtag(adjustedSnapshotData);
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
        setOverviewCache(overviewKey, adjustedSnapshotData, etag, baseMeta);
        const totalMs = Date.now() - t0;
        const payload = attachMeta(adjustedSnapshotData, {
          ...baseMeta,
          cached: true,
          totalMs,
        });
        return respond(payload, 200, { ETag: etag });
      }
    }

    const aggregatesStart = Date.now();
    const snapshotDays = effectiveHistoryDays + 5;
    const cachedDailySnapshot = forceEffective ? null : await getDailySnapshot(snapshotDays);
    const dailyAggregates = cachedDailySnapshot
      ? deserializeDailyAggregates(cachedDailySnapshot)
      : await getDailyAggregates(SERIES_SLUGS, snapshotDays);
    const aggregatesFetchMs = Date.now() - aggregatesStart;

    // Keep a full prior day in the series window when the current day is in progress.
    const recentDays = 3;
    const cachedSeriesMap = new Map();
    for (const slug of SERIES_SLUGS) {
      const cached = getOverviewSeriesCache(slug, recentDays);
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
      if (!cached) setOverviewSeriesCache(slug, recentDays, filtered);
      return { slug, series: filtered };
    });
    const seriesBySlug = new Map(perSlugSeries.map(({ slug, series }) => [slug, series]));
    let fetchMs = aggregatesFetchMs + recentFetchMs;

    const todayYmd = stockholmTodayYMD();
    const recoveryMeta = (() => {
      if (!recoveryEnabled) return null;
      const fixYmd = resolveRecoveryDate(todayYmd, process.env);
      return applyRecoveryForDate(dailyAggregates, fixYmd);
    })();
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
    dailyTotals = applyDailyTotalOverrides(dailyTotals);
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

    let dataSource = cachedDailySnapshot ? "daily-snapshot" : "aggregates";

    if (!hasAggregateData) {
      dataSource = "series";

      const fetchStart = Date.now();
      const cacheKeyDays = effectiveHistoryDays + 5;
      const cachedEntries = new Map();
      for (const slug of SERIES_SLUGS) {
        const cached = getOverviewSeriesCache(slug, cacheKeyDays);
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
        if (!cached) setOverviewSeriesCache(slug, cacheKeyDays, filtered);

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
      dailyTotals = applyDailyTotalOverrides(buildDailyTotals(perSlugData, todayYmd));
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

    const rawPerSlugData = perSlugData.map((item) => ({
      ...item,
      daily: Array.isArray(item.daily) ? item.daily.map((row) => ({ ...row })) : [],
    }));
    // The freshly loaded recent series already covers the trailing stuck window.
    // Reusing it avoids a second full Redis series scan during overview rebuilds.
    const stuckSeriesMap = seriesBySlug;
    const stuckBySlug = new Map();
    for (const slug of SERIES_SLUGS) {
      stuckBySlug.set(slug, computeTrailingStuckMeta(stuckSeriesMap.get(slug) ?? [], { minRun: 8 }));
    }
    perSlugData = applyTimeWeightedDailyAverages(perSlugData, stuckSeriesMap, todayYmd);
    dailyTotals = applyDailyTotalOverrides(buildDailyTotals(perSlugData, todayYmd)).slice(-targetDays);
    const stuckAdjusted = buildStuckAdjustedDailyTotals(perSlugData, stuckBySlug, {
      lookbackDays: 14,
    });

    perSlugData = perSlugData.map((item) => {
      const adjustedItem = stuckAdjusted.adjustedPerSlugData.find((entry) => entry.slug === item.slug) ?? item;
      const adjustedAverage =
        Array.isArray(adjustedItem.daily) && adjustedItem.daily.length
          ? Math.round(
              (adjustedItem.daily.reduce((sum, row) => sum + (Number(row?.avg) || 0), 0) /
                adjustedItem.daily.length) *
                100
            ) / 100
          : item.summary?.average ?? null;
      return {
        ...item,
        daily: adjustedItem.daily,
        summary: {
          ...(item.summary || {}),
          average: adjustedAverage,
        },
      };
    });

    dailyTotals = applyDailyTotalOverrides(
      stuckAdjusted.adjustedDailyTotals.length ? stuckAdjusted.adjustedDailyTotals : dailyTotals
    );
    // Use the same game coverage for the revenue model and lobby trend.
    const forecastDailyTotals = buildDailyTotals(
      perSlugData.filter((item) => FORECAST_GAME_IDS.has(item.slug)),
      todayYmd
    ).slice(-targetDays);
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

    const slugDaily = Object.fromEntries(perSlugData.map(({ slug, daily }) => [slug, daily]));
    const rawSlugDaily = Object.fromEntries(rawPerSlugData.map(({ slug, daily }) => [slug, daily]));
    const rawDailyTotals = stuckAdjusted.rawDailyTotals?.length ? stuckAdjusted.rawDailyTotals : dailyTotals;

    const trendDelta = recomputeTrendDelta(dailyTotals);
    const rawTrendDelta = recomputeTrendDelta(rawDailyTotals);

    const basePayload = withExtendedStaticHistory(mergeGameAthIntoOverview({
      ok: true,
      dailyTotals,
      forecastDailyTotals,
      rawDailyTotals,
      adjustedDailyTotals: stuckAdjusted.adjustedDailyTotals?.length ? stuckAdjusted.adjustedDailyTotals : dailyTotals,
      ath,
      todayPeak,
      averages: { days7, days30 },
      samples: { todayBuckets: buckets },
      slugAverages,
      slugDetails,
      slugDaily,
      rawSlugDaily,
      trendDelta,
      rawTrendDelta,
      stuckAdjustment: stuckAdjusted.stuckAdjustment ?? [],
      generatedAt: new Date().toISOString(),
      recovery: recoveryMeta,
    }, gameAthSnapshot), targetDays);

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
    const previousMonthlySnapshot = await getMonthlyLobbyActivitySnapshot();
    const extendedOverviewSnapshot = previousMonthlySnapshot || targetDays >= 730
      ? null
      : await getOverviewSnapshot(730);
    const monthlyDailyRows = mergeDailyLobbyHistory(
      STATIC_DAILY,
      mergeDailyLobbyHistory(
        extendedOverviewSnapshot?.data?.rawDailyTotals ?? extendedOverviewSnapshot?.data?.dailyTotals,
        basePayload.rawDailyTotals ?? basePayload.dailyTotals
      )
    );
    await setMonthlyLobbyActivitySnapshot(
      mergeMonthlyLobbyActivitySnapshot(
        previousMonthlySnapshot,
        monthlyDailyRows,
        basePayload.generatedAt
      )
    );
    if (!cachedDailySnapshot) {
      await setDailySnapshot(snapshotDays, serializeDailyAggregates(dailyAggregates));
    }

    const payload = attachMeta(basePayload, {
      ...cacheMeta,
      cached: false,
      fetchMs,
      aggMs,
      totalMs,
    });
    return respond(payload, 200, { ETag: etag });
  } catch (error) {
    logApiError({ route: "casinoscores-lobby-overview", stage: "build-overview", error });
    return respond(
      buildPublicErrorBody({ message: "Kunde inte hämta lobbyöversikten just nu." }),
      500,
      { "Cache-Control": "no-store" }
    );
  }
}
