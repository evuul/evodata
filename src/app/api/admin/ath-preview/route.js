import { NextResponse } from "next/server";
import { getJson, getSessionKey, getUserKey } from "@/lib/authStore";
import { buildAthAlertEmail } from "@/lib/emailTemplates";

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

const sampleTopTrends = [
  { id: "ice-fishing", name: "Ice Fishing", pctChange: 210.7 },
  { id: "lightning-storm", name: "Lightning Storm", pctChange: 85.2 },
  { id: "crazy-time", name: "Crazy Time", pctChange: 44.6 },
  { id: "big-baller", name: "Big Baller", pctChange: 22.4 },
  { id: "funky-time", name: "Funky Time", pctChange: 13.9 },
];

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
      const res = await fetch(`${origin}/api/alerts/ath?dryRun=1`, {
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

  const events =
    Array.isArray(dryRunPayload?.events) && dryRunPayload.events.length
      ? dryRunPayload.events
      : [
          {
            id: "ice-fishing",
            name: "Ice Fishing",
            athValue: 9012,
            athAt: new Date().toISOString(),
            currentValue: 9012,
          },
        ];

  const coffeeUrl = process.env.DONATE_BUYMEACOFFEE_URL || "https://buymeacoffee.com/evuul";
  const { subject, html } = buildAthAlertEmail({
    email: actorEmail,
    firstName: resolved.user?.firstName || "Alexander",
    events,
    topTrends: sampleTopTrends,
    coffeeUrl,
  });

  return json({
    ok: true,
    subject,
    html,
    events,
    dryRun: dryRunPayload,
  });
}

