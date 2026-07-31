// Manages notification preferences for the authenticated user.

import { NextResponse } from "next/server";
import { getUserKey, setJson } from "@/lib/authStore";
import { getRequestSessionToken as getToken, resolveUserFromToken } from "@/lib/authSession";
import {
  normalizePlayerAlertPreferences,
  pickPlayerAlertPreferencePatch,
} from "@/lib/playerAlertPreferences";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

const json = (data, init = {}) =>
  NextResponse.json(data, {
    status: init.status ?? 200,
    headers: { "Cache-Control": "no-store", ...(init.headers || {}) },
  });

export async function GET(request) {
  const token = getToken(request);
  const resolved = await resolveUserFromToken(token);
  if (!resolved) return json({ error: "Unauthorized" }, { status: 401 });
  const { user } = resolved;
  return json({
    ok: true,
    email: user.email,
    notifications: normalizePlayerAlertPreferences(user.notifications),
  });
}

export async function PUT(request) {
  const token = getToken(request);
  const resolved = await resolveUserFromToken(token);
  if (!resolved) return json({ error: "Unauthorized" }, { status: 401 });

  let payload = null;
  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  const patch = pickPlayerAlertPreferencePatch(payload);
  if (!Object.keys(patch).length) {
    return json({ error: "Invalid request." }, { status: 400 });
  }

  const user = resolved.user;
  user.notifications = {
    ...(user.notifications || {}),
    ...patch,
  };
  user.updatedAt = new Date().toISOString();

  await setJson(getUserKey(user.email), user);

  return json({
    ok: true,
    notifications: normalizePlayerAlertPreferences(user.notifications),
  });
}
