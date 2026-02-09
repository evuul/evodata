import { NextResponse } from "next/server";
import {
  getJson,
  getUserKey,
  hashPassword,
  setJson,
  verifyAndConsumePasswordResetToken,
} from "@/lib/authStore";

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
  const token = String(payload?.token || "").trim();
  const newPassword = String(payload?.newPassword || "");

  if (!email || !token || !newPassword || newPassword.length < 8) {
    return json({ error: "Invalid request." }, { status: 400 });
  }

  const valid = await verifyAndConsumePasswordResetToken(email, token);
  if (!valid) {
    return json({ error: "Invalid or expired token." }, { status: 400 });
  }

  const userKey = getUserKey(email);
  const user = await getJson(userKey);
  if (!user) {
    return json({ error: "Invalid token or email." }, { status: 400 });
  }

  user.passwordHash = hashPassword(newPassword);
  user.updatedAt = new Date().toISOString();
  await setJson(userKey, user);

  return json({ message: "Password has been reset." });
}
