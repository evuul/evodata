import { NextResponse } from "next/server";
import { getJson, getSessionKey, getUserKey } from "@/lib/authStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "alexander.ek@live.se").trim().toLowerCase();
const INDEX_KEY = "admin:activity:index";
const USER_KEY_PREFIX = "admin:activity:user:";
const ACTIVE_WINDOW_MS = 2 * 60 * 1000;

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

export async function GET(request) {
  const token = getToken(request);
  const resolved = await resolveUserFromToken(token);
  if (!resolved) return json({ error: "Unauthorized" }, { status: 401 });

  const actorEmail = String(resolved.user?.email || resolved.email || "").toLowerCase();
  if (actorEmail !== ADMIN_EMAIL) return json({ error: "Forbidden" }, { status: 403 });

  const index = await getJson(INDEX_KEY);
  const emails = Array.isArray(index?.emails) ? index.emails : [];
  const now = Date.now();

  const users = (
    await Promise.all(
      emails.map(async (email) => {
        const activity = await getJson(`${USER_KEY_PREFIX}${email}`);
        if (!activity?.email || !activity?.lastSeenAt) return null;
        const seenAt = Date.parse(activity.lastSeenAt);
        const isActive = Number.isFinite(seenAt) && now - seenAt <= ACTIVE_WINDOW_MS;
        return {
          email: activity.email,
          firstName: activity.firstName || "",
          lastName: activity.lastName || "",
          lastSeenAt: activity.lastSeenAt,
          isActive,
          lastPath: activity.lastPath || null,
          lastPanel: activity.lastPanel || null,
          locale: activity.locale || "sv",
          visits: Array.isArray(activity.visits) ? activity.visits.slice(-8) : [],
        };
      })
    )
  )
    .filter(Boolean)
    .sort((a, b) => Date.parse(b.lastSeenAt) - Date.parse(a.lastSeenAt));

  return json({
    ok: true,
    activeUsers: users.filter((u) => u.isActive).length,
    users,
  });
}

