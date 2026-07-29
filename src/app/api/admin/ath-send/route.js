// Triggers administrator-approved all-time-high alert delivery.

import { NextResponse } from "next/server";
import { getRequestSessionToken as getToken, resolveUserFromToken } from "@/lib/authSession";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "alexander.ek@live.se").trim().toLowerCase();
const SECRET = process.env.ATH_ALERTS_CRON_SECRET || process.env.CRON_SECRET || "";

const json = (data, init = {}) =>
  NextResponse.json(data, {
    status: init.status ?? 200,
    headers: { "Cache-Control": "no-store", ...(init.headers || {}) },
  });

export async function POST(request) {
  const token = getToken(request);
  const resolved = await resolveUserFromToken(token);
  if (!resolved) return json({ error: "Unauthorized" }, { status: 401 });

  const actorEmail = String(resolved.user?.email || resolved.email || "").toLowerCase();
  if (actorEmail !== ADMIN_EMAIL) return json({ error: "Forbidden" }, { status: 403 });
  if (!SECRET) return json({ error: "CRON secret is not configured." }, { status: 500 });

  let payload = null;
  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  const dryRun = payload?.dryRun === true;
  const origin = new URL(request.url).origin;
  const qs = new URLSearchParams();
  if (dryRun) qs.set("dryRun", "1");
  const url = `${origin}/api/alerts/ath${qs.toString() ? `?${qs}` : ""}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SECRET}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return json({ error: data?.error || "Failed to trigger ATH send." }, { status: res.status });
  }
  return json({ ok: true, result: data });
}
