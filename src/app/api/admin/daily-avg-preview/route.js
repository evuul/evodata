import { NextResponse } from "next/server";
import { getJson, getSessionKey, getUserKey } from "@/lib/authStore";
import { buildDailyAvgPlayersEmail } from "@/lib/emailTemplates";
import { getDailyAggregates } from "@/lib/csStore";
import { SERIES_SLUGS } from "@/app/api/casinoscores/players/shared";
import {
  applyRecoveryForDate,
  resolveRecoveryDate,
  shouldUseLiveTrackerRecovery,
} from "@/lib/liveTrackerRecovery";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "alexander.ek@live.se").trim().toLowerCase();
const SECRET = process.env.ATH_ALERTS_CRON_SECRET || process.env.CRON_SECRET || "";

const json = (data, init = {}) =>
  NextResponse.json(data, {
    status: init.status ?? 200,
    headers: { "Cache-Control": "no-store", ...(init.headers || {}) },
  });

const getToken = (request) => {
  const auth = request.headers.get("authorization") || "";
  if (!auth.toLowerCase().startsWith("bearer ")) return null;
  return auth.slice(7).trim();
};

const resolveUserFromToken = async (token) => {
  if (!token) return null;
  const session = await getJson(getSessionKey(token));
  if (!session?.email) return null;
  const user = await getJson(getUserKey(session.email));
  return user ? { user, email: session.email } : null;
};

const STOCKHOLM_PARTS = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Stockholm",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const getStockholmYmd = () => {
  const parts = STOCKHOLM_PARTS.formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type)?.value;
  const year = get("year");
  const month = get("month");
  const day = get("day");
  return year && month && day ? `${year}-${month}-${day}` : null;
};

const pickTargetFromDateKeys = (dateKeys, todayYmd, explicitTarget = "") => {
  if (!Array.isArray(dateKeys) || dateKeys.length < 2) return { targetYmd: null };
  const explicit = String(explicitTarget || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(explicit) && dateKeys.includes(explicit)) {
    return { targetYmd: explicit };
  }
  const todayIdx = dateKeys.lastIndexOf(todayYmd);
  if (todayIdx >= 1) return { targetYmd: dateKeys[todayIdx - 1] };
  return { targetYmd: dateKeys[dateKeys.length - 1] };
};

export async function GET(request) {
  const token = getToken(request);
  const resolved = await resolveUserFromToken(token);
  if (!resolved) return json({ error: "Unauthorized" }, { status: 401 });

  const actorEmail = String(resolved.user?.email || resolved.email || "").toLowerCase();
  if (actorEmail !== ADMIN_EMAIL) return json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const requestedTargetYmd = String(searchParams.get("targetYmd") || "").trim();

  let dryRunPayload = null;
  if (SECRET) {
    try {
      const origin = new URL(request.url).origin;
      const qs = new URLSearchParams({ dryRun: "1" });
      if (/^\d{4}-\d{2}-\d{2}$/.test(requestedTargetYmd)) qs.set("targetYmd", requestedTargetYmd);
      const res = await fetch(`${origin}/api/alerts/daily-avg?${qs.toString()}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${SECRET}`,
        },
        cache: "no-store",
      });
      dryRunPayload = await res.json().catch(() => null);
    } catch {
      dryRunPayload = null;
    }
  }

  let fallbackTargetYmd = null;
  if (!dryRunPayload?.targetYmd) {
    try {
      const todayYmd = getStockholmYmd();
      const dailyAgg = await getDailyAggregates(SERIES_SLUGS, 120).catch(() => new Map());
      if (shouldUseLiveTrackerRecovery(process.env) && todayYmd) {
        const fixYmd = resolveRecoveryDate(todayYmd, process.env);
        applyRecoveryForDate(dailyAgg, fixYmd);
      }
      const anySlug = SERIES_SLUGS.find(Boolean);
      const dateKeys = anySlug && dailyAgg.get(anySlug) ? Array.from(dailyAgg.get(anySlug).keys()).sort() : [];
      fallbackTargetYmd = pickTargetFromDateKeys(dateKeys, todayYmd, requestedTargetYmd)?.targetYmd || null;
    } catch {
      fallbackTargetYmd = null;
    }
  }

  const dateLabel = String(dryRunPayload?.targetYmd || fallbackTargetYmd || "—");
  const totalAvgPlayers = Number(dryRunPayload?.totalAvgPlayers ?? 65555);
  const changeAbs = Number(dryRunPayload?.changeAbs ?? 1234);
  const changePct = Number(dryRunPayload?.changePct ?? 1.92);
  const coverageLabel =
    typeof dryRunPayload?.coverage?.slugsWithData === "number" && typeof dryRunPayload?.coverage?.totalSlugs === "number"
      ? `Coverage: ${dryRunPayload.coverage.slugsWithData}/${dryRunPayload.coverage.totalSlugs} games`
      : "Coverage: 10/10 games";

  const topGames = Array.isArray(dryRunPayload?.topGames)
    ? dryRunPayload.topGames
    : [
        { id: "ice-fishing", name: "Ice Fishing", avg: 12345 },
        { id: "crazy-time", name: "Crazy Time", avg: 11234 },
        { id: "big-baller", name: "Big Baller", avg: 9876 },
        { id: "funky-time", name: "Funky Time", avg: 8765 },
        { id: "bac-bo", name: "Bac Bo", avg: 7654 },
      ];

  const trendSeries = Array.isArray(dryRunPayload?.trendSeries)
    ? dryRunPayload.trendSeries
    : Array.from({ length: 90 }, (_, i) => ({
        ymd: `2025-11-${String((i % 30) + 1).padStart(2, "0")}`,
        avgPlayers: 52000 + Math.round(Math.sin(i / 7) * 2400) + i * 55,
      }));

  const coffeeUrl = process.env.DONATE_BUYMEACOFFEE_URL || "https://buymeacoffee.com/evuul";
  const { subject, html } = buildDailyAvgPlayersEmail({
    email: actorEmail,
    firstName: resolved.user?.firstName || "Alexander",
    dateLabel,
    totalAvgPlayers,
    changeAbs,
    changePct,
    coverageLabel,
    trendSeries,
    topGames,
    coffeeUrl,
  });

  return json({
    ok: true,
    subject,
    html,
    dryRun: dryRunPayload,
  });
}
