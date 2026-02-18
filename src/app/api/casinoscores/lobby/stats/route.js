export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
  getDailyLobbyPeak,
  getGlobalLobbyAth,
  getLatestPlayersSnapshot,
  getOrBuildBaseline,
} from "@/lib/csStore";
import { GAMES as GAME_CONFIG } from "@/config/games";

const TZ = "Europe/Stockholm";
const CACHE_CONTROL = "public, s-maxage=60, stale-while-revalidate=300";
const HOURLY_BASELINE_DAYS = 60;
const HOURLY_BASELINE_BUCKET_MS = 5 * 60 * 1000;

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

function shiftStockholmYmd(baseYmd, offsetDays) {
  if (!baseYmd || !Number.isFinite(offsetDays)) return null;
  const [year, month, day] = baseYmd.split("-").map((part) => Number(part));
  if (![year, month, day].every((part) => Number.isFinite(part))) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return normalizeFormattedYMD(YMD_FORMATTER.format(date));
}

function stockholmCurrentHourLabel() {
  try {
    return new Intl.DateTimeFormat("sv-SE", {
      timeZone: TZ,
      hour: "2-digit",
      hour12: false,
    }).format(new Date());
  } catch {
    return String(new Date().getHours()).padStart(2, "0");
  }
}

function buildHourlyComparison({ baseline, totalPlayers }) {
  const hour = stockholmCurrentHourLabel();
  const buckets = Array.isArray(baseline?.buckets) ? baseline.buckets : [];
  const sameHour = buckets.filter((row) => String(row?.bucket || "").startsWith(`${hour}:`));
  if (!sameHour.length || !Number.isFinite(totalPlayers) || totalPlayers <= 0) {
    return {
      hour,
      baselineAvg: null,
      currentTotal: Number.isFinite(totalPlayers) ? totalPlayers : null,
      deltaPct: null,
      samples: 0,
      days: HOURLY_BASELINE_DAYS,
      bucketMs: HOURLY_BASELINE_BUCKET_MS,
      source: baseline?.source || null,
      computedAt: baseline?.computedAt || null,
    };
  }

  let weightedSum = 0;
  let weightedCount = 0;
  const avgValues = [];
  const minSamplesPerBucket = Math.max(6, Math.floor(HOURLY_BASELINE_DAYS * 0.25));
  for (const row of sameHour) {
    const avg = Number(row?.avg);
    const samples = Number(row?.samples);
    if (!Number.isFinite(avg) || !Number.isFinite(samples) || samples < minSamplesPerBucket) continue;
    weightedSum += avg * samples;
    weightedCount += samples;
    avgValues.push(avg);
  }
  if (!avgValues.length) {
    return {
      hour,
      baselineAvg: null,
      currentTotal: Number.isFinite(totalPlayers) ? totalPlayers : null,
      deltaPct: null,
      samples: 0,
      days: HOURLY_BASELINE_DAYS,
      bucketMs: HOURLY_BASELINE_BUCKET_MS,
      source: baseline?.source || null,
      computedAt: baseline?.computedAt || null,
    };
  }

  const mean = weightedCount > 0 ? weightedSum / weightedCount : null;
  const sorted = [...avgValues].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  const meanToMedianRatio =
    Number.isFinite(mean) && Number.isFinite(median) && median > 0 ? mean / median : 1;
  const baselineAvg =
    Number.isFinite(meanToMedianRatio) && meanToMedianRatio > 1.35 ? median : mean;
  const deltaPct =
    Number.isFinite(baselineAvg) && baselineAvg > 0
      ? ((totalPlayers - baselineAvg) / baselineAvg) * 100
      : null;

  return {
    hour,
    baselineAvg: Number.isFinite(baselineAvg) ? Math.round(baselineAvg) : null,
    currentTotal: Math.round(totalPlayers),
    deltaPct: Number.isFinite(deltaPct) ? Math.round(deltaPct * 10) / 10 : null,
    samples: weightedCount,
    days: HOURLY_BASELINE_DAYS,
    bucketMs: HOURLY_BASELINE_BUCKET_MS,
    source: baseline?.source || null,
    computedAt: baseline?.computedAt || null,
  };
}

function sanitizeHourlyComparison(input) {
  if (!input || typeof input !== "object") return null;
  const baselineAvg = Number(input.baselineAvg);
  const deltaPct = Number(input.deltaPct);
  const samples = Number(input.samples);
  const hour = String(input.hour || "").trim();
  if (!hour) return null;
  if (!Number.isFinite(baselineAvg) || baselineAvg <= 0) return null;
  if (!Number.isFinite(samples) || samples <= 0) return null;
  if (!Number.isFinite(deltaPct)) return null;
  return {
    ...input,
    baselineAvg: Math.round(baselineAvg),
    deltaPct: Math.round(deltaPct * 10) / 10,
    samples: Math.round(samples),
    hour,
  };
}

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const includeHourly = url.searchParams.get("includeHourly") === "1";
    const todayYmd = stockholmTodayYMD();
    const yesterdayYmd = shiftStockholmYmd(todayYmd, -1);

    const [todayPeakRaw, yesterdayPeakRaw, lobbyAth, latestSnapshot, baseline] = await Promise.all([
      todayYmd ? getDailyLobbyPeak(todayYmd) : Promise.resolve(null),
      yesterdayYmd ? getDailyLobbyPeak(yesterdayYmd) : Promise.resolve(null),
      getGlobalLobbyAth(),
      includeHourly ? getLatestPlayersSnapshot() : Promise.resolve(null),
      includeHourly
        ? getOrBuildBaseline(
            GAME_CONFIG.map((g) => g.id).filter(Boolean),
            HOURLY_BASELINE_DAYS,
            HOURLY_BASELINE_BUCKET_MS
          )
        : Promise.resolve(null),
    ]);

    const latestItems = Array.isArray(latestSnapshot?.items) ? latestSnapshot.items : [];
    const latestTotalPlayers = latestItems.reduce((sum, item) => {
      const n = Number(item?.players);
      return Number.isFinite(n) ? sum + n : sum;
    }, 0);
    const hourlyComparisonRaw = includeHourly
      ? buildHourlyComparison({ baseline, totalPlayers: latestTotalPlayers })
      : null;
    const hourlyComparison = sanitizeHourlyComparison(hourlyComparisonRaw);

    return new Response(
      JSON.stringify({
        ok: true,
        todayPeak: todayPeakRaw ?? null,
        yesterdayPeak: yesterdayPeakRaw ?? null,
        lobbyAth: lobbyAth ?? null,
        hourlyComparison: hourlyComparison ?? null,
        updatedAt: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": CACHE_CONTROL,
        },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: error?.message || String(error) }), {
      status: 500,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": CACHE_CONTROL,
      },
    });
  }
}
