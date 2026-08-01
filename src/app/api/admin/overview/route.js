// Serves the administrator's compact dashboard overview in one request.

import { NextResponse } from "next/server";
import { getJson, getUserIndexKey, getUserKey, mgetJson } from "@/lib/authStore";
import { getRequestSessionToken as getToken, resolveUserFromToken } from "@/lib/authSession";
import { getSupportTicketsIndexKey, listSupportTicketsByIds } from "@/lib/supportStore";
import { getCostSnapshot } from "@/lib/csCostTracker";
import { normalizePlayerAlertPreferences } from "@/lib/playerAlertPreferences";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "alexander.ek@live.se").trim().toLowerCase();
const ACTIVITY_INDEX_KEY = "admin:activity:index";
const ACTIVITY_KEY_PREFIX = "admin:activity:user:";
const ACTIVE_WINDOW_MS = 2 * 60 * 1000;

const json = (data, init = {}) => NextResponse.json(data, {
  status: init.status ?? 200,
  headers: { "Cache-Control": "no-store" },
});

export async function GET(request) {
  const token = getToken(request);
  const resolved = await resolveUserFromToken(token);
  const actorEmail = String(resolved?.user?.email || resolved?.email || "").toLowerCase();
  if (!resolved) return json({ error: "Unauthorized" }, { status: 401 });
  if (actorEmail !== ADMIN_EMAIL) return json({ error: "Forbidden" }, { status: 403 });

  const [userIndex, activityIndex, ticketIndex, cost] = await Promise.all([
    getJson(getUserIndexKey()),
    getJson(ACTIVITY_INDEX_KEY),
    getJson(getSupportTicketsIndexKey()),
    Promise.resolve(getCostSnapshot(72)),
  ]);
  const emails = Array.from(new Set([
    ...(Array.isArray(userIndex?.emails) ? userIndex.emails : []),
    ...(Array.isArray(activityIndex?.emails) ? activityIndex.emails : []),
  ].map((email) => String(email || "").trim().toLowerCase()).filter(Boolean)));
  const [users, activities, tickets] = await Promise.all([
    mgetJson(emails.map(getUserKey)),
    mgetJson(emails.map((email) => `${ACTIVITY_KEY_PREFIX}${email}`)),
    listSupportTicketsByIds(Array.isArray(ticketIndex) ? ticketIndex : [], 80),
  ]);
  const now = Date.now();
  const activeUsers = activities.filter((row) => {
    const ts = Date.parse(row?.lastSeenAt || "");
    return Number.isFinite(ts) && now - ts <= ACTIVE_WINDOW_MS;
  }).length;
  const subscribers = users.filter((row) => Boolean(row?.isSubscriber)).length;
  const founders = users.filter((row) => Boolean(row?.isFounder)).length;
  const alertCounts = users.reduce((acc, row) => {
    const preferences = normalizePlayerAlertPreferences(row?.notifications);
    if (preferences.lobbyAthEmail) acc.lobbyAth += 1;
    if (preferences.gameAthEmail) acc.gameAth += 1;
    if (preferences.dailyAvgEmail) acc.dailyAvg += 1;
    return acc;
  }, { lobbyAth: 0, gameAth: 0, dailyAvg: 0 });
  const openTickets = tickets.filter((ticket) => ticket?.status !== "closed").length;

  return json({
    ok: true,
    generatedAt: new Date().toISOString(),
    totals: { users: emails.length, activeUsers, subscribers, founders, openTickets },
    alerts: alertCounts,
    cost,
  });
}
