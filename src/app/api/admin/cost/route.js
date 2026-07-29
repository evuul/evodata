// Serves protected infrastructure-cost snapshots to administrators.

import { NextResponse } from "next/server";
import { getCostSnapshot } from "@/lib/csCostTracker";
import { getRequestSessionToken as getToken, resolveUserFromToken } from "@/lib/authSession";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "alexander.ek@live.se").trim().toLowerCase();

const json = (data, init = {}) =>
  NextResponse.json(data, {
    status: init.status ?? 200,
    headers: { "Cache-Control": "no-store", ...(init.headers || {}) },
  });

export async function GET(request) {
  const token = getToken(request);
  const resolved = await resolveUserFromToken(token);
  if (!resolved) return json({ error: "Unauthorized" }, { status: 401 });

  const actorEmail = String(resolved.user?.email || resolved.email || "").toLowerCase();
  if (actorEmail !== ADMIN_EMAIL) return json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(request.url);
  const hours = Number(url.searchParams.get("hours") || 72);
  const snapshot = getCostSnapshot(hours);

  return json({
    ok: true,
    ...snapshot,
  });
}
