// Rolls lobby trend snapshots forward once a completed Stockholm day is available.

import { SERIES_SLUGS } from "@/app/api/casinoscores/players/shared";
import { getCachedDailyAggregates, getOverviewSnapshot } from "@/lib/csStore";
import { requireCronAuth, resolveCronSecret } from "@/lib/cronAuth";
import { loadHourlyLobbyBaseline } from "@/lib/hourlyLobbyBaseline";
import { materializeLobbyOverviewSnapshots } from "@/lib/lobbyOverviewMaterializer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const SECRET = resolveCronSecret(process.env.CASINOSCORES_CRON_SECRET, process.env.CRON_SECRET);
const STOCKHOLM_DATE = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Stockholm",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function shiftYmd(ymd, days) {
  const date = new Date(`${ymd}T12:00:00.000Z`);
  if (!Number.isFinite(date.getTime())) return null;
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function stockholmTodayYmd() {
  const parts = STOCKHOLM_DATE.formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function latestDate(snapshot) {
  const rows = Array.isArray(snapshot?.data?.dailyTotals) ? snapshot.data.dailyTotals : [];
  return rows.reduce((latest, row) => {
    const date = String(row?.date || "").slice(0, 10);
    return date > latest ? date : latest;
  }, "");
}

async function warmHourlyBaseline() {
  try {
    const baseline = await loadHourlyLobbyBaseline();
    return {
      ready: Boolean(Object.keys(baseline?.healthyHourlyBySlug || {}).length),
      isComplete: Boolean(baseline?.isComplete),
      processedGames: Number(baseline?.processedGames) || 0,
      totalGames: Number(baseline?.totalGames) || 0,
      distinctDays: Number.isFinite(Number(baseline?.distinctDays))
        ? Math.round(Number(baseline.distinctDays))
        : null,
      computedAt: baseline?.computedAt ?? null,
    };
  } catch {
    return {
      ready: false,
      isComplete: false,
      processedGames: 0,
      totalGames: 0,
      distinctDays: null,
      computedAt: null,
    };
  }
}

async function handler(request) {
  const auth = requireCronAuth(request, SECRET, "CASINOSCORES_CRON_SECRET is not configured");
  if (!auth.ok) {
    return Response.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const hourlyBaseline = await warmHourlyBaseline();
  const targetDate = shiftYmd(stockholmTodayYmd(), -1);
  const current = await getOverviewSnapshot(30);
  if (targetDate && latestDate(current) >= targetDate) {
    return Response.json({
      ok: true,
      skipped: true,
      targetDate,
      reason: "Snapshot is current",
      hourlyBaseline,
    });
  }

  const dailyAggregates = await getCachedDailyAggregates(SERIES_SLUGS, 120);
  const result = await materializeLobbyOverviewSnapshots(dailyAggregates, targetDate);
  return Response.json({ ok: true, skipped: false, hourlyBaseline, ...result });
}

export async function GET(request) {
  return handler(request);
}

export async function POST(request) {
  return handler(request);
}
