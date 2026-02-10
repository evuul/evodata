import { NextResponse } from "next/server";
import { getJson, getSessionKey, getUserKey, setJson } from "@/lib/authStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "alexander.ek@live.se").trim().toLowerCase();
const SETTINGS_KEY = "alerts:settings";

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

const defaults = (raw) => ({
  testOnlyAdmin: Boolean(raw?.testOnlyAdmin),
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

