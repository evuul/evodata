export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import yahooFinance from "yahoo-finance2";

import { loadShortHistory } from "@/lib/shortHistoryStore";
import { totalSharesData } from "@/Components/buybacks/utils";

const DEFAULT_DAYS = 45;
const MAX_DAYS = 365;
const SYMBOL = "EVO.ST";

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

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = clampDays(searchParams.get("days"));

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

    if (!shortHistory.length) {
      return NextResponse.json({
        ok: false,
        error: "Ingen blankningshistorik tillgänglig",
      }, { status: 503 });
    }

    const sliceCount = Math.min(shortHistory.length, days + 1);
    const relevantShort = shortHistory.slice(shortHistory.length - sliceCount);
    const earliestDateStr = relevantShort[0]?.date;
    const period1 = earliestDateStr ? new Date(earliestDateStr) : new Date();
    // Hämta lite extra historik för att säkra att vi fångar volym innan första dagen
    period1.setDate(period1.getDate() - 5);

    let historical = [];
    try {
      historical = await yahooFinance.historical(SYMBOL, {
        period1,
        period2: new Date(),
        interval: "1d",
      });
    } catch {
      historical = [];
    }

    const volumeByDate = new Map();
    for (const row of historical ?? []) {
      const date = toDateString(row?.date);
      if (!date) continue;
      const volume = Number(row?.volume ?? row?.adjVolume ?? 0);
      if (!Number.isFinite(volume)) continue;
      volumeByDate.set(date, volume);
    }

    const items = [];
    let prevShortShares = null;
    let prevDateStr = null;
    for (const entry of relevantShort) {
      const totalShares = getTotalSharesForDate(entry.date);
      const shortShares = Number.isFinite(entry.percent) && totalShares != null
        ? Math.round((entry.percent / 100) * totalShares)
        : null;
      const volumeShares = volumeByDate.get(entry.date) ?? null;
      let shortChangeShares = null;
      let shortShareOfVolumePercent = null;
      let volumeWindowShares = Number.isFinite(volumeShares) ? volumeShares : null;

      if (prevShortShares != null && shortShares != null) {
        shortChangeShares = shortShares - prevShortShares;
        const spanDates = enumerateBusinessDatesExclusive(prevDateStr, entry.date);
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
      }

      items.push({
        date: entry.date,
        volumeShares: Number.isFinite(volumeShares) ? volumeShares : null,
        volumeWindowShares,
        shortPercent: Number.isFinite(entry.percent) ? +entry.percent.toFixed(2) : null,
        shortShares,
        shortChangeShares,
        shortShareOfVolumePercent: shortShareOfVolumePercent != null
          ? +shortShareOfVolumePercent.toFixed(2)
          : null,
        totalShares,
      });

      prevShortShares = shortShares;
      prevDateStr = entry.date;
    }

    // Vi tog days+1 poster för att få delta – trimma bort första om vi har extra
    while (items.length > days) {
      items.shift();
    }

    const volumes = items.map((item) => item.volumeShares);
    const volumeWindows = items.map((item) => item.volumeWindowShares ?? item.volumeShares);
    const shortVolumeShares = items.map((item) => item.shortChangeShares != null ? Math.abs(item.shortChangeShares) : null);
    const percentOfVolume = items.map((item) => item.shortShareOfVolumePercent);

    const volumeAvg5 = calcRollingAverage(volumes, 5);
    const volumeAvg20 = calcRollingAverage(volumes, 20);
    const shortShareOfVolumeAvg5 = calcRollingAverage(percentOfVolume, 5);

    const enriched = items.map((item, idx) => ({
      ...item,
      volumeAverage5: volumeAvg5[idx] != null ? Math.round(volumeAvg5[idx]) : null,
      volumeAverage20: volumeAvg20[idx] != null ? Math.round(volumeAvg20[idx]) : null,
      shortShareOfVolumeAverage5: shortShareOfVolumeAvg5[idx] != null
        ? +shortShareOfVolumeAvg5[idx].toFixed(2)
        : null,
    }));

    const totalVolume = volumeWindows.filter((v) => Number.isFinite(v)).reduce((sum, v) => sum + v, 0);
    const totalShortFlow = shortVolumeShares.filter((v) => Number.isFinite(v)).reduce((sum, v) => sum + v, 0);
    const aggregateShare = totalVolume > 0 ? +(totalShortFlow / totalVolume * 100).toFixed(2) : null;

    const latest = enriched[enriched.length - 1] ?? null;

    return NextResponse.json({
      ok: true,
      symbol: SYMBOL,
      days,
      items: enriched,
      latest,
      aggregateShare,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
