// Serves administrator-only previews of transactional emails.

import { NextResponse } from "next/server";
import { buildResetPasswordEmail, buildWelcomeEmail } from "@/lib/emailTemplates";
import { getRequestSessionToken as getToken, resolveUserFromToken } from "@/lib/authSession";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "alexander.ek@live.se").trim().toLowerCase();

const json = (data, init = {}) =>
  NextResponse.json(data, {
    status: init.status ?? 200,
    headers: { "Cache-Control": "no-store", ...(init.headers || {}) },
  });

export async function GET(request) {
  const token = getToken(request);
  const resolved = await resolveUserFromToken(token);
  if (!resolved) return json({ error: "Unauthorized" }, { status: 401 });

  const actorEmail = String(resolved.user?.email || resolved.email || "").toLowerCase();
  if (actorEmail !== ADMIN_EMAIL) {
    return json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const type = String(searchParams.get("type") || "welcome").toLowerCase();
  const firstName = String(resolved.user?.firstName || "Alexander").trim() || "Alexander";
  let payload = null;

  if (type === "reset") {
    payload = buildResetPasswordEmail({
      email: actorEmail,
      resetUrl: "https://evotracker.org/reset-password?email=example%40mail.com&token=demo-token",
    });
  } else {
    payload = buildWelcomeEmail({
      email: actorEmail,
      firstName,
      coffeeUrl: process.env.DONATE_BUYMEACOFFEE_URL || "https://buymeacoffee.com/evuul",
    });
  }

  return json({
    ok: true,
    type,
    subject: payload.subject,
    html: payload.html,
  });
}
