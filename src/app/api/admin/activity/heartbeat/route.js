import { NextResponse } from "next/server";
import { getJson, getSessionKey, getUserKey, setJson } from "@/lib/authStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

const INDEX_KEY = "admin:activity:index";
const USER_KEY_PREFIX = "admin:activity:user:";
const HEARTBEAT_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

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

const normalizeText = (value, maxLen = 120) => {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  if (!cleaned) return null;
  return cleaned.slice(0, maxLen);
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

  const email = String(resolved.user?.email || resolved.email || "").toLowerCase();
  if (!email) return json({ error: "Unauthorized" }, { status: 401 });

  const path = normalizeText(payload?.path, 160);
  const panel = normalizeText(payload?.panel, 80);
  const locale = normalizeText(payload?.locale, 8);
  const nowIso = new Date().toISOString();
  const key = `${USER_KEY_PREFIX}${email}`;

  const previous = (await getJson(key)) || {};
  const visits = Array.isArray(previous.visits) ? previous.visits : [];
  const shouldAppendVisit = previous.lastPath !== path || previous.lastPanel !== panel;

  const nextVisits = shouldAppendVisit
    ? [...visits, { at: nowIso, path, panel }].slice(-25)
    : visits;

  const activity = {
    email,
    firstName: resolved.user?.firstName ?? "",
    lastName: resolved.user?.lastName ?? "",
    isAdmin: Boolean(resolved.user?.isAdmin),
    lastSeenAt: nowIso,
    lastPath: path,
    lastPanel: panel,
    locale: locale ?? previous.locale ?? "sv",
    visits: nextVisits,
  };

  await setJson(key, activity, HEARTBEAT_TTL_SECONDS);

  const index = await getJson(INDEX_KEY);
  const emails = Array.isArray(index?.emails) ? index.emails : [];
  if (!emails.includes(email)) {
    const next = [...emails, email].slice(-500);
    await setJson(
      INDEX_KEY,
      { emails: next, updatedAt: nowIso },
      HEARTBEAT_TTL_SECONDS
    );
  }

  return json({ ok: true });
}

