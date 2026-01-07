export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import yahooFinance, { withYahooThrottle } from "@/lib/yahooFinanceClient";

import { loadShortHistory } from "@/lib/shortHistoryStore";
import { totalSharesData } from "@/Components/buybacks/utils";

const DEFAULT_DAYS = 45;
const MAX_DAYS = 365;
const SYMBOL = "EVO.ST";
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minuter
const STALE_IF_ERROR_MS = 10 * 60 * 1000; // tillåt gammalt i 10 min om upstream faller
const MIN_FETCH_INTERVAL_MS = 2 * 60 * 1000; // max en fetch per period
const RATE_LIMIT_COOLDOWN_MS = 10 * 60 * 1000; // vila längre vid 429
const RETRY_AFTER_SECONDS = 120;

const g = globalThis;
g.__shortActivityCache ??= new Map(); // key: days -> {data, exp, staleExp}
g.__shortActivityState ??= new Map(); // days -> {inFlight, nextAllowedAt}

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
  const hit = g.__shortActivityCache.get(days);
  if (!hit) return null;
  const now = Date.now();
  if (hit.exp > now) return { ...hit, stale: false };
  if (allowStale && hit.staleExp && hit.staleExp > now) return { ...hit, stale: true };
  if (hit.staleExp && hit.staleExp > now) return null;
  g.__shortActivityCache.delete(days);
  return null;
}

function setCached(days, data) {
  const now = Date.now();
  g.__shortActivityCache.set(days, {
    data,
    exp: now + CACHE_TTL_MS,
    staleExp: now + CACHE_TTL_MS + STALE_IF_ERROR_MS,
  });
}

function getState(days) {
  return g.__shortActivityState.get(days) || null;
}

function setState(days, patch) {
  const prev = g.__shortActivityState.get(days) || {};
  g.__shortActivityState.set(days, { ...prev, ...patch });
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const days = clampDays(searchParams.get("days"));

  const cached = getCached(days);
  if (cached) {
    return NextResponse.json(cached.data, { status: 200 });
  }

  const state = getState(days);
  const nowTs = Date.now();
  if (state?.nextAllowedAt && state.nextAllowedAt > nowTs) {
    const stale =
      getCached(days, { allowStale: true });
    if (stale) {
      return NextResponse.json({ ...stale.data, stale: true }, { status: 200 });
    }
    const retryAfter = Math.ceil((state.nextAllowedAt - nowTs) / 1000);
    return NextResponse.json(
      { ok: false, error: "Upstream temporarily paused due to rate limiting, try again soon" },
      { status: 429, headers: { "Retry-After": String(Math.max(retryAfter, RETRY_AFTER_SECONDS)) } }
    );
  }

  if (state?.inFlight) {
    try {
      const payload = await state.inFlight;
      return NextResponse.json(payload, { status: 200 });
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
    try {
      historical = await withYahooThrottle(() =>
        yahooFinance.historical(SYMBOL, {
          period1,
          period2: new Date(),
          interval: "1d",
        })
      );
    } catch (err) {
      throw err;
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

    const enriched = items.map((item, idx) => ({
      ...item,
      volumeAverage5: volumeAvg5[idx] != null ? Math.round(volumeAvg5[idx]) : null,
      volumeAverage20: volumeAvg20[idx] != null ? Math.round(volumeAvg20[idx]) : null,
      shortShareOfVolumeAverage5:
        shortShareOfVolumeAvg5[idx] != null ? +shortShareOfVolumeAvg5[idx].toFixed(2) : null,
    }));

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
    };
  })();

  setState(days, { inFlight: fetchPromise });

  try {
    const payload = await fetchPromise;
    setState(days, { inFlight: null, nextAllowedAt: Date.now() + MIN_FETCH_INTERVAL_MS });
    if (payload?.ok !== false) {
      setCached(days, payload);
    }
    return NextResponse.json(payload, { status: payload?.ok === false ? 503 : 200 });
  } catch (err) {
    const { status, message, rateLimited } = normalizeError(err);
    if (rateLimited) {
      setState(days, { nextAllowedAt: Date.now() + RATE_LIMIT_COOLDOWN_MS, inFlight: null });
    } else {
      setState(days, { nextAllowedAt: Date.now() + MIN_FETCH_INTERVAL_MS, inFlight: null });
    }
    const stale =
      getCached(days, { allowStale: true });
    if (stale) {
      return NextResponse.json({ ...stale.data, stale: true }, { status: 200 });
    }

    const headers = {
      "Cache-Control": "no-store",
      ...(rateLimited ? { "Retry-After": String(RETRY_AFTER_SECONDS) } : null),
    };

    return NextResponse.json({ ok: false, error: message }, { status, headers });
  }
}
