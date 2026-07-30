// Changes the current user's password through a validated session.

import { NextResponse } from "next/server";
import {
  createSession,
  deleteKey,
  getNextAuthVersion,
  getSessionKey,
  getUserKey,
  hashPassword,
  setJson,
  verifyPassword,
} from "@/lib/authStore";
import {
  getRequestSessionToken as getToken,
  resolveUserFromToken,
  setSessionCookie,
} from "@/lib/authSession";
import { checkAuthRateLimit, rateLimitResponseHeaders } from "@/lib/authRateLimit";
import { validatePassword } from "@/lib/passwordPolicy";
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
  let stage = "authenticate";
  try {
    const token = getToken(request);
    const resolved = await resolveUserFromToken(token, { cache: false });
    if (!resolved) return json({ error: "Unauthorized" }, { status: 401 });

    const rateLimit = await checkAuthRateLimit({
      request,
      scope: "changePassword",
      account: resolved.email,
    });
    if (!rateLimit.allowed) {
      return json(
        { error: "Too many password-change attempts. Try again later." },
        { status: 429, headers: rateLimitResponseHeaders(rateLimit) }
      );
    }

    let payload = null;
    try {
      payload = await request.json();
    } catch {
      payload = null;
    }

    const currentPassword = String(payload?.currentPassword || "");
    const newPassword = String(payload?.newPassword || "");

    if (!currentPassword || !validatePassword(newPassword).valid) {
      return json({ error: "Invalid request." }, { status: 400 });
    }

    const user = resolved.user;
    if (!verifyPassword(currentPassword, user.passwordHash)) {
      return json({ error: "Current password is incorrect." }, { status: 400 });
    }
    if (verifyPassword(newPassword, user.passwordHash)) {
      return json({ error: "The new password must be different." }, { status: 400 });
    }

    stage = "update-password";
    user.passwordHash = hashPassword(newPassword);
    user.authVersion = getNextAuthVersion(user);
    user.updatedAt = new Date().toISOString();
    await setJson(getUserKey(user.email), user);

    stage = "rotate-session";
    const { token: nextToken, session } = await createSession(user.email);
    await deleteKey(getSessionKey(token)).catch(() => {});
    return setSessionCookie(
      json({ ok: true, message: "Password updated.", accessExpiresAt: session.expiresAt }),
      nextToken,
      session.expiresAt
    );
  } catch (error) {
    logAuthError({ route: "change-password", stage, error });
    return json({ error: "Could not update password. Please try again." }, { status: 500 });
  }
}
