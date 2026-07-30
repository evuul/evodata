// Starts password recovery without exposing accounts, tokens, or redirect control.

import { NextResponse } from "next/server";
import { createPasswordResetToken, getJson, getUserKey } from "@/lib/authStore";
import { buildResetPasswordEmail } from "@/lib/emailTemplates";
import { isMailerConfigured, sendEmail } from "@/lib/mailer";
import { isTrustedSessionRequest } from "@/lib/authSession";
import { checkAuthRateLimit, rateLimitResponseHeaders } from "@/lib/authRateLimit";
import { buildPasswordResetUrl } from "@/lib/passwordResetUrl";
import { logAuthError } from "@/lib/authDebug";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

const json = (data, init = {}) =>
  NextResponse.json(data, {
    status: init.status ?? 200,
    headers: { "Cache-Control": "no-store", ...(init.headers || {}) },
  });

export async function POST(request) {
  if (!isTrustedSessionRequest(request)) {
    return json({ error: "Forbidden" }, { status: 403 });
  }
  let payload = null;
  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  const email = String(payload?.email || "").trim().toLowerCase();

  if (!email) {
    return json({ error: "Invalid request." }, { status: 400 });
  }

  const rateLimit = await checkAuthRateLimit({ request, scope: "forgotPassword", account: email });
  if (!rateLimit.allowed) {
    return json(
      { error: "Too many reset requests. Try again later." },
      { status: 429, headers: rateLimitResponseHeaders(rateLimit) }
    );
  }

  const genericMessage =
    "If the address exists, a reset link has been sent.";

  const user = await getJson(getUserKey(email), { cache: false });
  if (!user) {
    return json({ message: genericMessage });
  }

  try {
    const { token } = await createPasswordResetToken(email);
    const resetUrl = buildPasswordResetUrl({ requestUrl: request.url, email, token });

    if (isMailerConfigured()) {
      const { subject, html } = buildResetPasswordEmail({ email, resetUrl });
      await sendEmail({ toEmail: email, subject, html });
    } else {
      console.warn("Password reset requested but mailer is not configured.");
    }
  } catch (error) {
    logAuthError({ route: "forgot-password", stage: "deliver-reset", error });
  }

  return json({ message: genericMessage });
}
