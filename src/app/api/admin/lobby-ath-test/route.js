// Sends a production-style fake lobby-ATH email only to the authenticated administrator.

import { NextResponse } from "next/server";
import { getRequestSessionToken as getToken, resolveUserFromToken } from "@/lib/authSession";
import { buildLobbyAthTestEmail } from "@/lib/lobbyAthTestEmail";
import { isMailerConfigured, sendEmail } from "@/lib/mailer";
import { DEFAULT_SUPPORT_URL } from "@/lib/supportLinks";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "alexander.ek@live.se").trim().toLowerCase();

const json = (data, init = {}) =>
  NextResponse.json(data, {
    status: init.status ?? 200,
    headers: { "Cache-Control": "no-store", ...(init.headers || {}) },
  });

export async function POST(request) {
  const token = getToken(request);
  const resolved = await resolveUserFromToken(token);
  if (!resolved) return json({ error: "Unauthorized" }, { status: 401 });

  const actorEmail = String(resolved.user?.email || resolved.email || "").trim().toLowerCase();
  if (actorEmail !== ADMIN_EMAIL) {
    return json({ error: "Forbidden" }, { status: 403 });
  }
  if (!isMailerConfigured()) {
    return json(
      { error: "Mailer not configured", code: "MAILER_NOT_CONFIGURED" },
      { status: 503 }
    );
  }

  const { subject, html, testValues } = buildLobbyAthTestEmail({
    email: actorEmail,
    firstName: resolved.user?.firstName || "Admin",
    coffeeUrl: process.env.DONATE_BUYMEACOFFEE_URL || DEFAULT_SUPPORT_URL,
  });

  try {
    await sendEmail({ toEmail: actorEmail, subject, html });
  } catch {
    return json(
      { error: "Email provider rejected the test email.", code: "EMAIL_PROVIDER_ERROR" },
      { status: 502 }
    );
  }

  return json({
    ok: true,
    toEmail: actorEmail,
    subject,
    testValues,
  });
}
