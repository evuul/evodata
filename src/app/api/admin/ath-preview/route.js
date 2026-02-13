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

  const events = Array.isArray(dryRunPayload?.events) ? dryRunPayload.events : [];
  const topTrends = Array.isArray(dryRunPayload?.topTrends) ? dryRunPayload.topTrends : [];

  const coffeeUrl = process.env.DONATE_BUYMEACOFFEE_URL || "https://buymeacoffee.com/evuul";
  const firstName = resolved.user?.firstName || "Alexander";

  if (!events.length) {
    const noEventsHtml = `<!doctype html>
<html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#0b1220;color:#e2e8f0;font-family:Inter,Arial,sans-serif;">
  <div style="max-width:760px;margin:0 auto;padding:28px 18px;">
    <div style="background:#111827;border:1px solid rgba(148,163,184,.26);border-radius:14px;padding:20px;">
      <div style="font-size:12px;letter-spacing:1.1px;text-transform:uppercase;color:#94a3b8;font-weight:700;">EvoTracker</div>
      <h1 style="margin:8px 0 0 0;font-size:26px;line-height:1.2;color:#f8fafc;">ATH preview (live)</h1>
      <p style="margin:12px 0 0 0;color:#cbd5e1;font-size:16px;line-height:1.6;">
        Hi ${firstName}, no new ATH events are currently pending for send.
      </p>
      <p style="margin:10px 0 0 0;color:#93c5fd;font-size:14px;line-height:1.5;">
        Recipients if triggered now: ${Array.isArray(dryRunPayload?.recipients) ? dryRunPayload.recipients.length : 0}
      </p>
    </div>
  </div>
</body></html>`;

    return json({
      ok: true,
      subject: "ATH preview (live): no events",
      html: noEventsHtml,
      events,
      topTrends,
      dryRun: dryRunPayload,
      recipients: Array.isArray(dryRunPayload?.recipients) ? dryRunPayload.recipients : [],
      live: true,
      hasEvents: false,
    });
  }

  const { subject, html } = buildAthAlertEmail({
    email: actorEmail,
    firstName,
    events,
    topTrends,
    coffeeUrl,
  });

  return json({
    ok: true,
    subject,
    html,
    events,
    topTrends,
    recipients: Array.isArray(dryRunPayload?.recipients) ? dryRunPayload.recipients : [],
    dryRun: dryRunPayload,
    live: true,
    hasEvents: events.length > 0,
  });
}
