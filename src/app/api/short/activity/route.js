export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import yahooFinance, { withYahooThrottle } from "@/lib/yahooFinanceClient";

import { loadShortHistory } from "@/lib/shortHistoryStore";
import { totalSharesData } from "@/Components/buybacks/utils";

const CACHE_CONTROL = "public, s-maxage=300, stale-while-revalidate=900";

const DEFAULT_DAYS = 45;
const MAX_DAYS = 365;
const SYMBOL = "EVO.ST";
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minuter
const STALE_IF_ERROR_MS = 10 * 60 * 1000; // tillåt gammalt i 10 min om upstream faller
const MIN_FETCH_INTERVAL_MS = 2 * 60 * 1000; // max en fetch per period
const RATE_LIMIT_COOLDOWN_MS = 10 * 60 * 1000; // vila längre vid 429
const RETRY_AFTER_SECONDS = 120;
const CACHE_VERSION = "v2";
const SHARED_CACHE_TTL_MS = 10 * 60 * 1000;
const SHARED_STALE_MS = 60 * 60 * 1000;
const SHARED_KEY_PREFIX = `short:activity:${CACHE_VERSION}:`;

const g = globalThis;
g.__shortActivityCache ??= new Map(); // key: days -> {data, exp, staleExp}
g.__shortActivityState ??= new Map(); // days -> {inFlight, nextAllowedAt}
g.__shortActivityKvClient ??= null;

function json(data, init = {}) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      "Cache-Control": CACHE_CONTROL,
      ...(init.headers || {}),
    },
  });
}

function clampDays(value) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return DEFAULT_DAYS;
  return Math.max(7, Math.min(MAX_DAYS, n));
}

function getTotalSharesForDate(dateStr) {
  const year = Number.parseInt(String(dateStr).slice(0, 4), 10);
  if (!Number.isFinite(year)) {
    return totalSharesData[totalSharesData.length - 1]?.totalShares ?? null;
  }
  let candidate = null;
  for (const entry of totalSharesData) {
    const entryYear = Number.parseInt(entry.date, 10);
    if (!Number.isFinite(entryYear)) continue;
    if (entryYear <= year) {
      candidate = entry.totalShares;
    }
  }
  return candidate ?? totalSharesData[totalSharesData.length - 1]?.totalShares ?? null;
}

function toDateString(value) {
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

function calcRollingAverage(values, windowSize) {
  return values.map((entry, idx) => {
    const start = Math.max(0, idx - windowSize + 1);
    const slice = values.slice(start, idx + 1);
    const nums = slice
      .map((v) => v ?? null)
      .filter((v) => Number.isFinite(v));
    if (!nums.length) return null;
    return nums.reduce((sum, v) => sum + v, 0) / nums.length;
  });
}

function isWeekend(dateStr) {
  try {
    const d = new Date(`${dateStr}T00:00:00Z`);
    const day = d.getUTCDay();
    return day === 0 || day === 6;
  } catch {
    return false;
  }
}

function enumerateBusinessDatesExclusive(startDateStr, endDateStr) {
  if (!startDateStr) return [endDateStr];
  const dates = [];
  try {
    const start = new Date(`${startDateStr}T00:00:00Z`);
    const end = new Date(`${endDateStr}T00:00:00Z`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [endDateStr];

    const cursor = new Date(start);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    while (cursor <= end) {
      const iso = cursor.toISOString().slice(0, 10);
      if (!isWeekend(iso)) {
        dates.push(iso);
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    if (!dates.length) dates.push(endDateStr);
  } catch {
    return [endDateStr];
  }
  return dates;
}

function normalizeError(err) {
  const message = err instanceof Error ? err.message : String(err ?? "Unknown error");
  const lower = message.toLowerCase();
  const rateLimited = lower.includes("too many requests") || lower.includes("429");
  return {
    message: rateLimited ? "Yahoo Finance rate limited the request" : message,
    status: rateLimited ? 429 : 502,
    rateLimited,
  };
}

function getCached(days, { allowStale = false } = {}) {
  const key = `${CACHE_VERSION}:${days}`;
  const hit = g.__shortActivityCache.get(key);
  if (!hit) return null;
  const now = Date.now();
  if (hit.exp > now) return { ...hit, stale: false };
  if (allowStale && hit.staleExp && hit.staleExp > now) return { ...hit, stale: true };
  if (hit.staleExp && hit.staleExp > now) return null;
  g.__shortActivityCache.delete(key);
  return null;
}

function setCached(days, data) {
  const now = Date.now();
  const key = `${CACHE_VERSION}:${days}`;
  g.__shortActivityCache.set(key, {
    data,
    exp: now + CACHE_TTL_MS,
    staleExp: now + CACHE_TTL_MS + STALE_IF_ERROR_MS,
  });
}

async function getKv() {
  if (g.__shortActivityKvClient !== null) return g.__shortActivityKvClient;
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    try {
      const mod = await import("@vercel/kv");
      g.__shortActivityKvClient = mod.kv;
      return g.__shortActivityKvClient;
    } catch (err) {
      console.warn("[short] kunde inte initiera KV:", err);
    }
  }
  g.__shortActivityKvClient = undefined;
  return g.__shortActivityKvClient;
}

async function getSharedCached(days, { allowStale = false } = {}) {
  const kv = await getKv();
  if (!kv) return null;
  try {
    const raw = await kv.get(`${SHARED_KEY_PREFIX}${days}`);
    if (!raw) return null;
    const hit = typeof raw === "string" ? JSON.parse(raw) : raw;
    const now = Date.now();
    if (hit.exp > now) return { ...hit, stale: false };
    if (allowStale && hit.staleExp && hit.staleExp > now) return { ...hit, stale: true };
    return null;
  } catch (err) {
    console.warn("[short] hämtning från KV misslyckades:", err);
    return null;
  }
}

async function setSharedCached(days, data) {
  const kv = await getKv();
  if (!kv) return;
  const now = Date.now();
  const entry = {
    data,
    exp: now + SHARED_CACHE_TTL_MS,
    staleExp: now + SHARED_CACHE_TTL_MS + SHARED_STALE_MS,
  };
  try {
    await kv.set(`${SHARED_KEY_PREFIX}${days}`, entry, {
      ex: Math.ceil((SHARED_CACHE_TTL_MS + SHARED_STALE_MS) / 1000),
    });
  } catch (err) {
    console.warn("[short] KV set misslyckades:", err);
  }
}

function getState(days) {
  return g.__shortActivityState.get(days) || null;
}

function setState(days, patch) {
  const prev = g.__shortActivityState.get(days) || {};
  g.__shortActivityState.set(days, { ...prev, ...patch });
}

async function fetchYahooChartVolume(symbol, range = "1y") {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol
  )}?range=${range}&interval=1d`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Yahoo chart request failed: ${response.status}`);
  }
  const data = await response.json();
  const result = data?.chart?.result?.[0];
  const timestamps = Array.isArray(result?.timestamp) ? result.timestamp : [];
  const volumes = Array.isArray(result?.indicators?.quote?.[0]?.volume)
    ? result.indicators.quote[0].volume
    : [];
  if (!timestamps.length || !volumes.length) {
    throw new Error("Yahoo chart returned no volume data");
  }
  const volumeByDate = new Map();
  for (let i = 0; i < timestamps.length; i++) {
    const ts = timestamps[i];
    const vol = volumes[i];
    const date = new Date(ts * 1000);
    if (!Number.isFinite(vol) || Number.isNaN(date.getTime())) continue;
    const key = date.toISOString().slice(0, 10);
    volumeByDate.set(key, Number(vol));
  }
  return volumeByDate;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const days = clampDays(searchParams.get("days"));

  const cached = getCached(days);
  if (cached) {
    return json(cached.data, { status: 200 });
  }

  const sharedCached = await getSharedCached(days);
  if (sharedCached) {
    setCached(days, sharedCached.data);
    return json(
      sharedCached.stale ? { ...sharedCached.data, stale: true } : sharedCached.data,
      { status: 200 }
    );
  }

  const state = getState(days);
  const nowTs = Date.now();
  if (state?.nextAllowedAt && state.nextAllowedAt > nowTs) {
    const stale =
      getCached(days, { allowStale: true }) ||
      sharedCached ||
      (await getSharedCached(days, { allowStale: true }));
    if (stale) {
      return json({ ...stale.data, stale: true }, { status: 200 });
    }
    try {
      const shortHistoryRaw = await loadShortHistory();
      const shortHistory = Array.isArray(shortHistoryRaw)
        ? shortHistoryRaw
            .map((item) => ({
              date: toDateString(item.date ?? item.d),
              percent: Number.isFinite(Number(item.percent ?? item.p))
                ? Number(item.percent ?? item.p)
                : null,
            }))
            .filter((item) => item.date && item.percent != null && !isWeekend(item.date))
            .sort((a, b) => a.date.localeCompare(b.date))
        : [];

      const volumeByDate = await fetchYahooChartVolume(SYMBOL);
      const sortedVolumeDates = Array.from(volumeByDate.keys()).sort((a, b) => a.localeCompare(b));
      const tradingDates = sortedVolumeDates.slice(-days);

      if (!tradingDates.length) {
        return json({ ok: false, error: "Ingen handelsdata tillgänglig" });
      }

      const shortPercentMap = new Map(shortHistory.map((entry) => [entry.date, entry.percent]));
      const sortedShortDates = shortHistory.map((entry) => entry.date).sort((a, b) => a.localeCompare(b));
      const firstTradingDate = tradingDates[0];
      let prevActualDate = null;
      let prevActualShortShares = null;
      for (const date of sortedShortDates) {
        if (date < firstTradingDate) {
          const totalShares = getTotalSharesForDate(date);
          const percent = shortPercentMap.get(date);
          if (Number.isFinite(percent) && totalShares != null) {
            prevActualDate = date;
            prevActualShortShares = Math.round((percent / 100) * totalShares);
          }
        } else {
          break;
        }
      }

      const items = [];
      for (const date of tradingDates) {
        const totalShares = getTotalSharesForDate(date);
        const percentRaw = shortPercentMap.get(date);
        const hasShortData = Number.isFinite(percentRaw);
        const displayPercent = hasShortData ? +percentRaw.toFixed(2) : 0;
        const volumeShares = volumeByDate.get(date) ?? null;
        let shortShares = null;
        if (hasShortData && totalShares != null) {
          shortShares = Math.round((percentRaw / 100) * totalShares);
        } else if (!hasShortData) {
          shortShares = 0;
        }

        let shortChangeShares = null;
        let shortShareOfVolumePercent = null;
        let volumeWindowShares = Number.isFinite(volumeShares) ? volumeShares : null;

        if (hasShortData && prevActualShortShares != null && shortShares != null && prevActualDate) {
          shortChangeShares = shortShares - prevActualShortShares;
          const spanDates = enumerateBusinessDatesExclusive(prevActualDate, date);
          let spanVolumeTotal = 0;
          for (const dateStr of spanDates) {
            const vol = volumeByDate.get(dateStr);
            if (Number.isFinite(vol)) spanVolumeTotal += vol;
          }
          if (spanVolumeTotal <= 0 && Number.isFinite(volumeShares)) {
            spanVolumeTotal = volumeShares;
          }
          if (spanVolumeTotal > 0) {
            volumeWindowShares = spanVolumeTotal;
            shortShareOfVolumePercent = Math.abs(shortChangeShares) / spanVolumeTotal * 100;
          }
          prevActualShortShares = shortShares;
          prevActualDate = date;
        } else if (hasShortData && shortShares != null) {
          prevActualShortShares = shortShares;
          prevActualDate = date;
        } else {
          shortChangeShares = 0;
          shortShareOfVolumePercent = 0;
        }

        items.push({
          date,
          volumeShares: Number.isFinite(volumeShares) ? volumeShares : null,
          volumeWindowShares,
          shortPercent: displayPercent,
          shortShares,
          shortChangeShares,
          shortShareOfVolumePercent:
            shortShareOfVolumePercent != null ? +shortShareOfVolumePercent.toFixed(2) : null,
          totalShares,
        });
      }

      const volumes = items.map((item) => item.volumeShares);
      const volumeWindows = items.map((item) => item.volumeWindowShares ?? item.volumeShares);
      const shortVolumeShares = items.map((item) =>
        item.shortChangeShares != null ? Math.abs(item.shortChangeShares) : null
      );
      const percentOfVolume = items.map((item) => item.shortShareOfVolumePercent);

      const volumeAvg5 = calcRollingAverage(volumes, 5);
      const volumeAvg20 = calcRollingAverage(volumes, 20);
      const shortShareOfVolumeAvg5 = calcRollingAverage(percentOfVolume, 5);

      const enriched = items.map((item, idx) => ({
        ...item,
        volumeAverage5: volumeAvg5[idx] != null ? Math.round(volumeAvg5[idx]) : null,
        volumeAverage20: volumeAvg20[idx] != null ? Math.round(volumeAvg20[idx]) : null,
        shortShareOfVolumeAverage5:
          shortShareOfVolumeAvg5[idx] != null ? +shortShareOfVolumeAvg5[idx].toFixed(2) : null,
      }));

      const totalVolume = volumeWindows
        .filter((v) => Number.isFinite(v))
        .reduce((sum, v) => sum + v, 0);
      const totalShortFlow = shortVolumeShares
        .filter((v) => Number.isFinite(v))
        .reduce((sum, v) => sum + v, 0);
      const aggregateShare = totalVolume > 0 ? +(totalShortFlow / totalVolume * 100).toFixed(2) : null;

      const latest = enriched[enriched.length - 1] ?? null;

      const payload = {
        ok: true,
        symbol: SYMBOL,
        days,
        items: enriched,
        latest,
        aggregateShare,
        updatedAt: new Date().toISOString(),
        source: "yahoo-chart",
      };
      setCached(days, payload);
      await setSharedCached(days, payload);
      return json(payload, { status: 200 });
    } catch {
      // fall through to 429
    }
    const retryAfter = Math.ceil((state.nextAllowedAt - nowTs) / 1000);
    return json(
      { ok: false, error: "Upstream temporarily paused due to rate limiting, try again soon" },
      { status: 429, headers: { "Retry-After": String(Math.max(retryAfter, RETRY_AFTER_SECONDS)) } }
    );
  }

  if (state?.inFlight) {
    try {
      const payload = await state.inFlight;
      return json(payload, { status: 200 });
    } catch {
      // fall through
    }
  }

  const fetchPromise = (async () => {
    const shortHistoryRaw = await loadShortHistory();
    const shortHistory = Array.isArray(shortHistoryRaw)
      ? shortHistoryRaw
          .map((item) => ({
            date: toDateString(item.date ?? item.d),
            percent: Number.isFinite(Number(item.percent ?? item.p))
              ? Number(item.percent ?? item.p)
              : null,
          }))
          .filter((item) => item.date && item.percent != null && !isWeekend(item.date))
          .sort((a, b) => a.date.localeCompare(b.date))
      : [];

    const period1 = new Date();
    period1.setDate(period1.getDate() - (days + 10));

    let historical = [];
    let source = "yahoo-finance2";
    try {
      historical = await withYahooThrottle(() =>
        yahooFinance.historical(SYMBOL, {
          period1,
          period2: new Date(),
          interval: "1d",
        })
      );
    } catch (err) {
      const chartVolume = await fetchYahooChartVolume(SYMBOL);
      source = "yahoo-chart";
      historical = Array.from(chartVolume.entries()).map(([date, volume]) => ({
        date,
        volume,
      }));
    }

    const volumeByDate = new Map();
    for (const row of historical ?? []) {
      const date = toDateString(row?.date);
      if (!date) continue;
      const volume = Number(row?.volume ?? row?.adjVolume ?? 0);
      if (!Number.isFinite(volume)) continue;
      volumeByDate.set(date, volume);
    }

    const sortedVolumeDates = Array.from(volumeByDate.keys()).sort((a, b) => a.localeCompare(b));
    const tradingDates = sortedVolumeDates.slice(-days);

    if (!tradingDates.length) {
      return { ok: false, error: "Ingen handelsdata tillgänglig" };
    }

    const shortPercentMap = new Map(shortHistory.map((entry) => [entry.date, entry.percent]));
    const sortedShortDates = shortHistory.map((entry) => entry.date).sort((a, b) => a.localeCompare(b));
    const firstTradingDate = tradingDates[0];
    let prevActualDate = null;
    let prevActualShortShares = null;
    for (const date of sortedShortDates) {
      if (date < firstTradingDate) {
        const totalShares = getTotalSharesForDate(date);
        const percent = shortPercentMap.get(date);
        if (Number.isFinite(percent) && totalShares != null) {
          prevActualDate = date;
          prevActualShortShares = Math.round((percent / 100) * totalShares);
        }
      } else {
        break;
      }
    }

    const items = [];
    for (const date of tradingDates) {
      const totalShares = getTotalSharesForDate(date);
      const percentRaw = shortPercentMap.get(date);
      const hasShortData = Number.isFinite(percentRaw);
      const displayPercent = hasShortData ? +percentRaw.toFixed(2) : 0;
      const volumeShares = volumeByDate.get(date) ?? null;
      let shortShares = null;
      if (hasShortData && totalShares != null) {
        shortShares = Math.round((percentRaw / 100) * totalShares);
      } else if (!hasShortData) {
        shortShares = 0;
      }

      let shortChangeShares = null;
      let shortShareOfVolumePercent = null;
      let volumeWindowShares = Number.isFinite(volumeShares) ? volumeShares : null;

      if (hasShortData && prevActualShortShares != null && shortShares != null && prevActualDate) {
        shortChangeShares = shortShares - prevActualShortShares;
        const spanDates = enumerateBusinessDatesExclusive(prevActualDate, date);
        let spanVolumeTotal = 0;
        for (const dateStr of spanDates) {
          const vol = volumeByDate.get(dateStr);
          if (Number.isFinite(vol)) spanVolumeTotal += vol;
        }
        if (spanVolumeTotal <= 0 && Number.isFinite(volumeShares)) {
          spanVolumeTotal = volumeShares;
        }
        if (spanVolumeTotal > 0) {
          volumeWindowShares = spanVolumeTotal;
          shortShareOfVolumePercent = Math.abs(shortChangeShares) / spanVolumeTotal * 100;
        }
        prevActualShortShares = shortShares;
        prevActualDate = date;
      } else if (hasShortData && shortShares != null) {
        prevActualShortShares = shortShares;
        prevActualDate = date;
      } else {
        shortChangeShares = 0;
        shortShareOfVolumePercent = 0;
      }

      items.push({
        date,
        volumeShares: Number.isFinite(volumeShares) ? volumeShares : null,
        volumeWindowShares,
        shortPercent: displayPercent,
        shortShares,
        shortChangeShares,
        shortShareOfVolumePercent:
          shortShareOfVolumePercent != null ? +shortShareOfVolumePercent.toFixed(2) : null,
        totalShares,
      });
    }

    const volumes = items.map((item) => item.volumeShares);
    const volumeWindows = items.map(
      (item) => item.volumeWindowShares ?? item.volumeShares
    );
    const shortVolumeShares = items.map((item) =>
      item.shortChangeShares != null ? Math.abs(item.shortChangeShares) : null
    );
    const percentOfVolume = items.map((item) => item.shortShareOfVolumePercent);

    const volumeAvg5 = calcRollingAverage(volumes, 5);
    const volumeAvg20 = calcRollingAverage(volumes, 20);
    const shortShareOfVolumeAvg5 = calcRollingAverage(percentOfVolume, 5);

    const enriched = items.map((item, idx) => {
      const volumeAverage5 = volumeAvg5[idx] != null ? Math.round(volumeAvg5[idx]) : null;
      const volumeAverage20 = volumeAvg20[idx] != null ? Math.round(volumeAvg20[idx]) : null;
      const baseVolume = volumeAverage20 ?? volumeAverage5 ?? item.volumeShares;
      const daysToCover =
        Number.isFinite(item.shortShares) && Number.isFinite(baseVolume) && baseVolume > 0
          ? +(item.shortShares / baseVolume).toFixed(2)
          : null;
      return {
        ...item,
        volumeAverage5,
        volumeAverage20,
        shortShareOfVolumeAverage5:
          shortShareOfVolumeAvg5[idx] != null ? +shortShareOfVolumeAvg5[idx].toFixed(2) : null,
        daysToCover,
      };
    });

    const totalVolume = volumeWindows.filter((v) => Number.isFinite(v)).reduce((sum, v) => sum + v, 0);
    const totalShortFlow = shortVolumeShares.filter((v) => Number.isFinite(v)).reduce((sum, v) => sum + v, 0);
    const aggregateShare = totalVolume > 0 ? +(totalShortFlow / totalVolume * 100).toFixed(2) : null;

    const latest = enriched[enriched.length - 1] ?? null;

    return {
      ok: true,
      symbol: SYMBOL,
      days,
      items: enriched,
      latest,
      aggregateShare,
      updatedAt: new Date().toISOString(),
      source,
    };
  })();

  setState(days, { inFlight: fetchPromise });

  try {
    const payload = await fetchPromise;
    setState(days, { inFlight: null, nextAllowedAt: Date.now() + MIN_FETCH_INTERVAL_MS });
    if (payload?.ok !== false) {
      setCached(days, payload);
      await setSharedCached(days, payload);
    }
    return json(payload, { status: payload?.ok === false ? 503 : 200 });
  } catch (err) {
    const { status, message, rateLimited } = normalizeError(err);
    if (rateLimited) {
      setState(days, { nextAllowedAt: Date.now() + RATE_LIMIT_COOLDOWN_MS, inFlight: null });
    } else {
      setState(days, { nextAllowedAt: Date.now() + MIN_FETCH_INTERVAL_MS, inFlight: null });
    }
    const stale =
      getCached(days, { allowStale: true }) ||
      (await getSharedCached(days, { allowStale: true }));
    if (stale) {
      return json({ ...stale.data, stale: true }, { status: 200 });
    }

    const headers = rateLimited ? { "Retry-After": String(RETRY_AFTER_SECONDS) } : {};
    return json({ ok: false, error: message }, { status, headers });
  }
}
