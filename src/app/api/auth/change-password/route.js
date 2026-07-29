// Changes the current user's password through a validated session.

import { NextResponse } from "next/server";
import {
  getUserKey,
  hashPassword,
  setJson,
  verifyPassword,
} from "@/lib/authStore";
import { getRequestSessionToken as getToken, resolveUserFromToken } from "@/lib/authSession";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

const json = (data, init = {}) =>
  NextResponse.json(data, {
    status: init.status ?? 200,
    headers: { "Cache-Control": "no-store", ...(init.headers || {}) },
  });

export async function POST(request) {
  const token = getToken(request);
  const resolved = await resolveUserFromToken(token, { cache: false });
  if (!resolved) return json({ error: "Unauthorized" }, { status: 401 });

  let payload = null;
  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  const currentPassword = String(payload?.currentPassword || "");
  const newPassword = String(payload?.newPassword || "");

  if (!currentPassword || !newPassword || newPassword.length < 8) {
    return json({ error: "Invalid request." }, { status: 400 });
  }

  const user = resolved.user;
  if (!verifyPassword(currentPassword, user.passwordHash)) {
    return json({ error: "Current password is incorrect." }, { status: 400 });
  }

  user.passwordHash = hashPassword(newPassword);
  user.updatedAt = new Date().toISOString();
  await setJson(getUserKey(user.email), user);

  return json({ ok: true, message: "Password updated." });
}
