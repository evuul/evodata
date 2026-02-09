import { NextResponse } from "next/server";
import { createPasswordResetToken, getJson, getUserKey } from "@/lib/authStore";
import { buildResetPasswordEmail } from "@/lib/emailTemplates";
import { isMailerConfigured, sendEmail } from "@/lib/mailer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

const json = (data, init = {}) =>
  NextResponse.json(data, {
    status: init.status ?? 200,
    headers: { "Cache-Control": "no-store", ...(init.headers || {}) },
  });

export async function POST(request) {
  let payload = null;
  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  const email = String(payload?.email || "").trim().toLowerCase();
  const resetUrlBase = String(payload?.resetUrlBase || "").trim();

  if (!email || !resetUrlBase) {
    return json({ error: "Invalid request." }, { status: 400 });
  }

  const genericMessage =
    "If the address exists, a reset link has been sent.";

  const user = await getJson(getUserKey(email));
  if (!user) {
    return json({ message: genericMessage });
  }

  try {
    const { token } = await createPasswordResetToken(email);
    const resetUrl = `${resetUrlBase}?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;

    if (isMailerConfigured()) {
      const { subject, html } = buildResetPasswordEmail({ email, resetUrl });
      await sendEmail({ toEmail: email, subject, html });
    } else {
      console.warn("Password reset requested but mailer is not configured.");
      console.info("Reset URL for debugging:", resetUrl);
    }
  } catch (error) {
    console.error("Failed to process forgot-password:", error);
  }

  return json({ message: genericMessage });
}
