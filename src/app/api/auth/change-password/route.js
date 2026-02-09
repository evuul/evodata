import { NextResponse } from "next/server";
import {
  getJson,
  getSessionKey,
  getUserKey,
  hashPassword,
  setJson,
  verifyPassword,
} from "@/lib/authStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

const json = (data, init = {}) =>
  NextResponse.json(data, {
    status: init.status ?? 200,
    headers: { "Cache-Control": "no-store", ...(init.headers || {}) },
  });

const getToken = (request) => {
  const auth = request.headers.get("authorization") || "";
  if (!auth.toLowerCase().startsWith("bearer ")) return null;
  return auth.slice(7).trim();
};

const resolveUserFromToken = async (token) => {
  if (!token) return null;
  const session = await getJson(getSessionKey(token));
  if (!session?.email) return null;
  const user = await getJson(getUserKey(session.email));
  return user ? { user, email: session.email } : null;
};

export async function POST(request) {
  const token = getToken(request);
  const resolved = await resolveUserFromToken(token);
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

