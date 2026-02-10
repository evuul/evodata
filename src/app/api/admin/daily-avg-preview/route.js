import { NextResponse } from "next/server";
import { getJson, getSessionKey, getUserKey } from "@/lib/authStore";
import { buildDailyAvgPlayersEmail } from "@/lib/emailTemplates";

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

export async function GET(request) {
  const token = getToken(request);
  const resolved = await resolveUserFromToken(token);
  if (!resolved) return json({ error: "Unauthorized" }, { status: 401 });

  const actorEmail = String(resolved.user?.email || resolved.email || "").toLowerCase();
  if (actorEmail !== ADMIN_EMAIL) return json({ error: "Forbidden" }, { status: 403 });

  let dryRunPayload = null;
  if (SECRET) {
    try {
      const origin = new URL(request.url).origin;
      const res = await fetch(`${origin}/api/alerts/daily-avg?dryRun=1`, {
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

  const dateLabel = String(dryRunPayload?.targetYmd || "2026-02-09");
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

  const coffeeUrl = process.env.DONATE_BUYMEACOFFEE_URL || "https://buymeacoffee.com/evuul";
  const { subject, html } = buildDailyAvgPlayersEmail({
    email: actorEmail,
    firstName: resolved.user?.firstName || "Alexander",
    dateLabel,
    totalAvgPlayers,
    changeAbs,
    changePct,
    coverageLabel,
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

