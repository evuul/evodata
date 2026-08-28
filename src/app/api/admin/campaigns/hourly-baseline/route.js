// Previews and sends the one-time Hourly Baseline announcement to entitled members.

import { NextResponse } from "next/server";
import { getJson, getUserIndexKey, getUserKey, mgetJson, setJson } from "@/lib/authStore";
import { getRequestSessionToken, resolveUserFromToken } from "@/lib/authSession";
import { isConfiguredAdminEmail } from "@/lib/adminAccess";
import { buildHourlyBaselineLaunchEmail } from "@/lib/emailTemplates";
import { isMailerConfigured, sendEmail } from "@/lib/mailer";
import {
  getPremiumFounderCampaignRecipients,
  HOURLY_BASELINE_CAMPAIGN_ID,
} from "@/lib/premiumFounderCampaign";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;
export const maxDuration = 60;

const DELIVERY_KEY = `admin:campaign:${HOURLY_BASELINE_CAMPAIGN_ID}`;
const RESEND_MIN_GAP_MS = 550;
const DASHBOARD_URL = String(process.env.NEXT_PUBLIC_APP_URL || "https://evotracker.org").trim();

const json = (data, init = {}) => NextResponse.json(data, {
  status: init.status ?? 200,
  headers: { "Cache-Control": "no-store", ...(init.headers || {}) },
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function requireAdmin(request) {
  const token = getRequestSessionToken(request);
  const resolved = await resolveUserFromToken(token, { cache: false });
  const email = String(resolved?.user?.email || resolved?.email || "").trim().toLowerCase();
  if (!resolved) return { error: json({ error: "Unauthorized" }, { status: 401 }) };
  if (!isConfiguredAdminEmail(email)) return { error: json({ error: "Forbidden" }, { status: 403 }) };
  return { email };
}

async function loadRecipients() {
  const index = (await getJson(getUserIndexKey(), { cache: false })) || {};
  const emails = Array.from(new Set(
    (Array.isArray(index?.emails) ? index.emails : [])
      .map((email) => String(email || "").trim().toLowerCase())
      .filter(Boolean)
  ));
  const users = await mgetJson(emails.map(getUserKey));
  return getPremiumFounderCampaignRecipients(users);
}

const getPreview = (recipient) => buildHourlyBaselineLaunchEmail({
  email: recipient?.email || "premium@example.com",
  firstName: recipient?.firstName || "there",
  dashboardUrl: DASHBOARD_URL,
});

export async function GET(request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  const [recipients, delivery] = await Promise.all([
    loadRecipients(),
    getJson(DELIVERY_KEY, { cache: false }),
  ]);
  const preview = getPreview(recipients[0]);
  const sentEmails = new Set(Array.isArray(delivery?.sentEmails) ? delivery.sentEmails : []);

  return json({
    ok: true,
    campaignId: HOURLY_BASELINE_CAMPAIGN_ID,
    subject: preview.subject,
    html: preview.html,
    eligibleRecipients: recipients.length,
    remainingRecipients: recipients.filter((recipient) => !sentEmails.has(recipient.email)).length,
    status: delivery?.status || "ready",
    completedAt: delivery?.completedAt || null,
    mailerConfigured: isMailerConfigured(),
  });
}

export async function POST(request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  if (!isMailerConfigured()) return json({ error: "Mailer not configured" }, { status: 503 });

  let payload = null;
  try {
    payload = await request.json();
  } catch {
    payload = null;
  }
  if (payload?.send !== true) {
    return json({ error: "Explicit send confirmation required" }, { status: 400 });
  }

  const [recipients, existingDelivery] = await Promise.all([
    loadRecipients(),
    getJson(DELIVERY_KEY, { cache: false }),
  ]);
  if (existingDelivery?.status === "completed") {
    return json({ error: "Campaign already completed", completedAt: existingDelivery.completedAt }, { status: 409 });
  }

  const sentEmails = new Set(Array.isArray(existingDelivery?.sentEmails) ? existingDelivery.sentEmails : []);
  const pendingRecipients = recipients.filter((recipient) => !sentEmails.has(recipient.email));
  let sentThisRequest = 0;
  let lastSendAt = 0;

  for (const recipient of pendingRecipients) {
    try {
      const waitMs = Math.max(0, RESEND_MIN_GAP_MS - (Date.now() - lastSendAt));
      if (waitMs > 0) await sleep(waitMs);
      const email = getPreview(recipient);
      await sendEmail({ toEmail: recipient.email, subject: email.subject, html: email.html });
      lastSendAt = Date.now();
      sentEmails.add(recipient.email);
      sentThisRequest += 1;
      await setJson(DELIVERY_KEY, {
        campaignId: HOURLY_BASELINE_CAMPAIGN_ID,
        status: "sending",
        sentEmails: [...sentEmails],
        updatedAt: new Date().toISOString(),
        initiatedBy: auth.email,
      });
    } catch {
      return json({
        ok: false,
        sent: sentThisRequest,
        remainingRecipients: pendingRecipients.length - sentThisRequest,
        error: "Campaign paused after a delivery error. Retry to continue with unsent recipients.",
      }, { status: 502 });
    }
  }

  const completedAt = new Date().toISOString();
  await setJson(DELIVERY_KEY, {
    campaignId: HOURLY_BASELINE_CAMPAIGN_ID,
    status: "completed",
    sentEmails: [...sentEmails],
    completedAt,
    initiatedBy: auth.email,
  });

  return json({
    ok: true,
    sent: sentThisRequest,
    eligibleRecipients: recipients.length,
    status: "completed",
    completedAt,
  });
}
