export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { getSeries, dailyAverages } from "@/lib/csStore";
import { SERIES_SLUGS, CRAZY_TIME_A_RESET_MS } from "../players/shared";

const TZ = "Europe/Stockholm";

function resJSON(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extra,
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

function filterCompletedDays(rows) {
  const today = stockholmTodayYMD();
  return (rows || []).filter((row) => row?.date && row.date < today);
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const raw = Number(searchParams.get("days"));
    const days = Math.max(1, Math.min(365, Number.isFinite(raw) ? raw : 30));
    const includePerGame = searchParams.get("perGame") === "1";

    const totalsMap = new Map();
    const perGame = includePerGame ? {} : undefined;
    let latestTs = 0;

    await Promise.all(
      SERIES_SLUGS.map(async (seriesId) => {
        const rawSeries = await getSeries(seriesId, days + 1);
        const series = Array.isArray(rawSeries) ? rawSeries : [];
        const filteredSeries =
          seriesId === "crazy-time:a"
            ? series.filter((point) => Number.isFinite(point?.ts) && point.ts >= CRAZY_TIME_A_RESET_MS)
            : series;

        if (filteredSeries.length) {
          const newest = filteredSeries[filteredSeries.length - 1]?.ts;
          if (Number.isFinite(newest) && newest > latestTs) {
            latestTs = newest;
          }
        }
        const daily = filterCompletedDays(dailyAverages(filteredSeries));
        const trimmed = daily.slice(-days);

        if (includePerGame) {
          perGame[seriesId] = trimmed;
        }

        trimmed.forEach(({ date, avg }) => {
          if (!date || !Number.isFinite(avg)) return;
          const item = totalsMap.get(date) || { sum: 0, count: 0 };
          item.sum += avg;
          item.count += 1;
          totalsMap.set(date, item);
        });
      })
    );

    const totals = Array.from(totalsMap.entries())
      .map(([date, { sum, count }]) => ({
        date,
        avgPlayers: Math.round(sum * 100) / 100,
        games: count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return resJSON({
      ok: true,
      days,
      totals,
      lastUpdated: latestTs ? new Date(latestTs).toISOString() : null,
      ...(includePerGame ? { perGame } : {}),
    });
  } catch (error) {
    return resJSON({ ok: false, error: String(error?.message || error) }, 500);
  }
}
