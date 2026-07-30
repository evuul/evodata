// Consumes reset tokens and invalidates every older user session.

import { NextResponse } from "next/server";
import {
  getNextAuthVersion,
  getJson,
  getUserKey,
  hashPassword,
  setJson,
  verifyAndConsumePasswordResetToken,
} from "@/lib/authStore";
import { isTrustedSessionRequest } from "@/lib/authSession";
import { checkAuthRateLimit, rateLimitResponseHeaders } from "@/lib/authRateLimit";
import { validatePassword } from "@/lib/passwordPolicy";

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
  const token = String(payload?.token || "").trim();
  const newPassword = String(payload?.newPassword || "");

  if (!email || !token || !validatePassword(newPassword).valid) {
    return json({ error: "Invalid request." }, { status: 400 });
  }

  const rateLimit = await checkAuthRateLimit({ request, scope: "resetPassword", account: email });
  if (!rateLimit.allowed) {
    return json(
      { error: "Too many reset attempts. Try again later." },
      { status: 429, headers: rateLimitResponseHeaders(rateLimit) }
    );
  }

  const valid = await verifyAndConsumePasswordResetToken(email, token);
  if (!valid) {
    return json({ error: "Invalid or expired token." }, { status: 400 });
  }

  const userKey = getUserKey(email);
  const user = await getJson(userKey, { cache: false });
  if (!user) {
    return json({ error: "Invalid token or email." }, { status: 400 });
  }

  user.passwordHash = hashPassword(newPassword);
  user.authVersion = getNextAuthVersion(user);
  user.updatedAt = new Date().toISOString();
  await setJson(userKey, user);

  return json({ message: "Password has been reset." });
}
