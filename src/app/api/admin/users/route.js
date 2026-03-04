import { NextResponse } from "next/server";
import { getJson, getSessionKey, getUserIndexKey, getUserKey, mgetJson } from "@/lib/authStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "alexander.ek@live.se").trim().toLowerCase();
const ACTIVITY_KEY_PREFIX = "admin:activity:user:";
const ACTIVITY_INDEX_KEY = "admin:activity:index";
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

const hasHoldings = (user) => {
  const profile = user?.profile ?? null;
  const shares = Number(profile?.shares ?? 0);
  const avgCost = Number(profile?.avgCost ?? 0);
  const lots = Array.isArray(profile?.lots) ? profile.lots : [];
  const hasLots = lots.some((lot) => Number(lot?.shares ?? 0) > 0);
  return (Number.isFinite(shares) && shares > 0) || (Number.isFinite(avgCost) && avgCost > 0) || hasLots;
};

export async function GET(request) {
  const token = getToken(request);
  const resolved = await resolveUserFromToken(token);
  if (!resolved) return json({ error: "Unauthorized" }, { status: 401 });

  const actorEmail = String(resolved.user?.email || resolved.email || "").toLowerCase();
  if (actorEmail !== ADMIN_EMAIL) return json({ error: "Forbidden" }, { status: 403 });

  const index = (await getJson(getUserIndexKey())) || {};
  const activityIndex = (await getJson(ACTIVITY_INDEX_KEY)) || {};
  const userEmails = Array.isArray(index?.emails) ? index.emails : [];
  const activityEmails = Array.isArray(activityIndex?.emails) ? activityIndex.emails : [];
  const emails = Array.from(
    new Set(
      [...userEmails, ...activityEmails]
        .map((value) => String(value || "").trim().toLowerCase())
        .filter(Boolean)
    )
  );
  const now = Date.now();

  const activityKeys = emails.map((email) => `${ACTIVITY_KEY_PREFIX}${email}`);
  const userKeys = emails.map((email) => getUserKey(email));
  const [activities, usersRaw] = await Promise.all([mgetJson(activityKeys), mgetJson(userKeys)]);

  const users = emails
    .map((email, index) => {
      const activity = activities[index] || null;
      const user = usersRaw[index] || null;
      if (!user?.email && !activity?.email) return null;
      const lastSeenAt = activity?.lastSeenAt || null;
      const seenAtTs = lastSeenAt ? Date.parse(lastSeenAt) : NaN;
      const isActive = Number.isFinite(seenAtTs) && now - seenAtTs <= ACTIVE_WINDOW_MS;
      const privateMessages = Array.isArray(user?.privateMessages) ? user.privateMessages : [];
      const pmUnreadCount = privateMessages.filter((item) => item && typeof item === "object" && !item.readAt).length;
      return {
        email: user?.email || activity?.email || email,
        firstName: user?.firstName || activity?.firstName || "",
        lastName: user?.lastName || activity?.lastName || "",
        isSubscriber: Boolean(user?.isSubscriber),
        athEmailEnabled: Boolean(user?.notifications?.athEmail),
        dailyAvgEmailEnabled: Boolean(user?.notifications?.dailyAvgEmail),
        createdAt: user?.createdAt || null,
        updatedAt: user?.updatedAt || null,
        hasHoldings: hasHoldings(user),
        lastSeenAt,
        lastPath: activity?.lastPath || null,
        lastPanel: activity?.lastPanel || null,
        locale: activity?.locale || null,
        isActive,
        pmUnreadCount,
        pmTotal: privateMessages.length,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const aSeen = a?.lastSeenAt ? Date.parse(a.lastSeenAt) : 0;
      const bSeen = b?.lastSeenAt ? Date.parse(b.lastSeenAt) : 0;
      if (aSeen !== bSeen) return bSeen - aSeen;
      return String(a?.createdAt || "").localeCompare(String(b?.createdAt || ""));
    });

  return json({
    ok: true,
    totalUsers: users.length,
    activeUsers: users.filter((u) => u.isActive).length,
    users,
  });
}
