export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import averagePlayersData from "@/app/data/averagePlayers.json";
import { getSeries, dailyAverages } from "@/lib/csStore";
import { SERIES_SLUGS, CRAZY_TIME_A_RESET_MS } from "../../players/shared";

const TZ = "Europe/Stockholm";
const BUCKET_MS = 60 * 1000; // 1 minut – tillräckligt för att aligna cron-samplings

function resJSON(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function stockholmTodayYMD() {
  try {
    const parts = new Intl.DateTimeFormat("sv-SE", {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());

    const y = parts.find((p) => p.type === "year")?.value ?? "0000";
    const m = parts.find((p) => p.type === "month")?.value ?? "00";
    const d = parts.find((p) => p.type === "day")?.value ?? "00";
    return `${y}-${m}-${d}`;
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function stockholmYMDFromTs(ts) {
  try {
    const parts = new Intl.DateTimeFormat("sv-SE", {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date(ts));

    const y = parts.find((p) => p.type === "year")?.value ?? "0000";
    const m = parts.find((p) => p.type === "month")?.value ?? "00";
    const d = parts.find((p) => p.type === "day")?.value ?? "00";
    return `${y}-${m}-${d}`;
  } catch {
    return null;
  }
}

function bucketTs(ts) {
  return Math.floor(ts / BUCKET_MS) * BUCKET_MS;
}

function parseStaticDaily() {
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
}

function computeAth(dynamicDaily) {
  let athValue = null;
  let athDate = null;

  for (const row of parseStaticDaily()) {
    if (!Number.isFinite(row.players)) continue;
    if (athValue === null || row.players > athValue) {
      athValue = row.players;
      athDate = row.date;
    }
  }

  for (const row of dynamicDaily) {
    const value = Number(row?.avgPlayers);
    if (!Number.isFinite(value)) continue;
    if (athValue === null || value > athValue) {
      athValue = value;
      athDate = row.date || null;
    }
  }

  return athValue != null
    ? { value: Math.round(athValue), date: athDate }
    : null;
}

function buildDailyTotals(perSlugSeries) {
  const today = stockholmTodayYMD();
  const totalsMap = new Map(); // date -> { sum, count }

  perSlugSeries.forEach(({ series }) => {
    const daily = dailyAverages(series) || [];
    for (const entry of daily) {
      const date = entry?.date;
      const avg = Number(entry?.avg);
      if (!date || !Number.isFinite(avg)) continue;
      if (date >= today) continue; // hoppa över pågående dag
      const item = totalsMap.get(date) || { sum: 0, count: 0 };
      item.sum += avg;
      item.count += 1;
      totalsMap.set(date, item);
    }
  });

  return Array.from(totalsMap.entries())
    .map(([date, { sum, count }]) => ({
      date,
      avgPlayers: Math.round(sum * 100) / 100,
      games: count,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function computeTodayPeak(perSlugSeries) {
  const today = stockholmTodayYMD();
  const bucketMap = new Map(); // bucketTs -> Map<slug, value>

  for (const { slug, series } of perSlugSeries) {
    for (const point of series || []) {
      const ts = Number(point?.ts);
      const value = Number(point?.value);
      if (!Number.isFinite(ts) || !Number.isFinite(value)) continue;
      const bucket = bucketTs(ts);
      const ymd = stockholmYMDFromTs(bucket);
      if (!ymd || ymd !== today) continue;

      let perSlug = bucketMap.get(bucket);
      if (!perSlug) {
        perSlug = new Map();
        bucketMap.set(bucket, perSlug);
      }

      const prev = perSlug.get(slug);
      if (!Number.isFinite(prev) || value > prev) {
        perSlug.set(slug, value);
      }
    }
  }

  if (!bucketMap.size) return { peak: null, buckets: [] };

  const buckets = Array.from(bucketMap.entries())
    .map(([ts, perSlug]) => {
      let sum = 0;
      for (const v of perSlug.values()) {
        if (Number.isFinite(v)) sum += v;
      }
      return { ts, value: Math.round(sum) };
    })
    .filter((row) => Number.isFinite(row.value))
    .sort((a, b) => a.ts - b.ts);

  if (!buckets.length) return { peak: null, buckets: [] };

  let peak = buckets[0];
  for (const row of buckets) {
    if (row.value > peak.value) {
      peak = row;
    }
  }

  return {
    peak: peak ? { value: peak.value, at: new Date(peak.ts).toISOString() } : null,
    buckets: buckets.map((row) => ({
      at: new Date(row.ts).toISOString(),
      value: row.value,
    })),
  };
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const daysParam = Number(searchParams.get("days"));
    const targetDays = Number.isFinite(daysParam) ? Math.max(7, Math.min(daysParam, 90)) : 45;

    const perSlugSeries = await Promise.all(
      SERIES_SLUGS.map(async (seriesId) => {
        const rawSeries = await getSeries(seriesId, targetDays + 5);
        const series = Array.isArray(rawSeries) ? rawSeries : [];
        const filtered =
          seriesId === "crazy-time:a"
            ? series.filter((point) => Number.isFinite(point?.ts) && point.ts >= CRAZY_TIME_A_RESET_MS)
            : series;
        return { slug: seriesId, series: filtered };
      })
    );

    const dailyTotals = buildDailyTotals(perSlugSeries);
    const ath = computeAth(dailyTotals);
    const { peak: todayPeak, buckets } = computeTodayPeak(perSlugSeries);

    const days7 = dailyTotals.slice(-7);
    const days30 = dailyTotals.slice(-30);

    return resJSON({
      ok: true,
      ath,
      todayPeak,
      averages: {
        days7,
        days30,
      },
      samples: {
        todayBuckets: buckets,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return resJSON(
      { ok: false, error: error?.message || String(error) },
      500
    );
  }
}
