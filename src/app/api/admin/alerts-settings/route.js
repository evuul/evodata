// Manages administrator-only alert delivery settings.

import { NextResponse } from "next/server";
import { getJson, setJson } from "@/lib/authStore";
import { getRequestSessionToken as getToken, resolveUserFromToken } from "@/lib/authSession";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "alexander.ek@live.se").trim().toLowerCase();
const SETTINGS_KEY = "alerts:settings";
const TEST_ONLY_ADMIN_ENV = ["1", "true", "yes"].includes(
  String(process.env.ALERTS_TEST_ONLY_ADMIN || "").trim().toLowerCase()
);

const json = (data, init = {}) =>
  NextResponse.json(data, {
    status: init.status ?? 200,
    headers: { "Cache-Control": "no-store", ...(init.headers || {}) },
  });

const defaults = (raw) => ({
  testOnlyAdmin: typeof raw?.testOnlyAdmin === "boolean" ? raw.testOnlyAdmin : TEST_ONLY_ADMIN_ENV,
  athEnabled: raw?.athEnabled === false ? false : true,
  dailyAvgEnabled: raw?.dailyAvgEnabled === false ? false : true,
});

export async function GET(request) {
  const token = getToken(request);
  const resolved = await resolveUserFromToken(token);
  if (!resolved) return json({ error: "Unauthorized" }, { status: 401 });
  const actorEmail = String(resolved.user?.email || resolved.email || "").toLowerCase();
  if (actorEmail !== ADMIN_EMAIL) return json({ error: "Forbidden" }, { status: 403 });

  const raw = (await getJson(SETTINGS_KEY)) || {};
  return json({ ok: true, settings: defaults(raw) });
}

export async function PUT(request) {
  const token = getToken(request);
  const resolved = await resolveUserFromToken(token);
  if (!resolved) return json({ error: "Unauthorized" }, { status: 401 });
  const actorEmail = String(resolved.user?.email || resolved.email || "").toLowerCase();
  if (actorEmail !== ADMIN_EMAIL) return json({ error: "Forbidden" }, { status: 403 });

  let payload = null;
  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  const currentRaw = (await getJson(SETTINGS_KEY)) || {};
  const next = { ...defaults(currentRaw) };
  if (typeof payload?.testOnlyAdmin === "boolean") next.testOnlyAdmin = payload.testOnlyAdmin;
  if (typeof payload?.athEnabled === "boolean") next.athEnabled = payload.athEnabled;
  if (typeof payload?.dailyAvgEnabled === "boolean") next.dailyAvgEnabled = payload.dailyAvgEnabled;
  next.updatedAt = new Date().toISOString();

  await setJson(SETTINGS_KEY, next);
  return json({ ok: true, settings: defaults(next) });
}
