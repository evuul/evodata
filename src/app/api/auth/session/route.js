// Restores, upgrades, and revokes browser authentication sessions.

import { NextResponse } from "next/server";
import { deleteKey, getSessionKey } from "@/lib/authStore";
import {
  buildSessionUser,
  clearSessionCookie,
  getRequestAuth,
  isTrustedSessionRequest,
  resolveUserFromToken,
  setSessionCookie,
} from "@/lib/authSession";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

const json = (data, status = 200) => NextResponse.json(data, {
  status,
  headers: { "Cache-Control": "no-store" },
});

export async function GET(request) {
  const auth = getRequestAuth(request);
  const resolved = auth ? await resolveUserFromToken(auth.token, { cache: false }) : null;
  if (!resolved) return clearSessionCookie(json({ authenticated: false }, 401));

  const response = json({
    authenticated: true,
    user: buildSessionUser(resolved.user),
    accessExpiresAt: resolved.session.expiresAt,
  });
  return auth.source === "bearer"
    ? setSessionCookie(response, auth.token, resolved.session.expiresAt)
    : response;
}

export async function DELETE(request) {
  if (!isTrustedSessionRequest(request)) {
    return json({ error: "Forbidden" }, 403);
  }
  const auth = getRequestAuth(request);
  if (auth?.token) await deleteKey(getSessionKey(auth.token)).catch(() => {});
  return clearSessionCookie(json({ ok: true }));
}
