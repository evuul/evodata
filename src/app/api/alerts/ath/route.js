// Sends ATH alerts from a materialized snapshot instead of scanning full Redis history.

import { NextResponse } from "next/server";
import { getJson, getUserIndexKey, getUserKey, mgetJson, setJson } from "@/lib/authStore";
import { requireCronAuth, resolveCronSecret } from "@/lib/cronAuth";
import {
  getCachedDailyAggregates,
  getGameAthSnapshot,
  getGlobalLobbyAth,
  getLatestPlayersSnapshot,
  setGameAthSnapshot,
} from "@/lib/csStore";
import { buildGameAthSnapshot } from "@/lib/gameAthSnapshot";
import { SERIES_SLUGS } from "@/app/api/casinoscores/players/shared";
import { GAMES as GAME_CONFIG } from "@/config/games";
import { isMailerConfigured, sendEmail } from "@/lib/mailer";
import { buildAthAlertEmail } from "@/lib/emailTemplates";
import {
  buildLobbyAthEvent,
  filterAthEventsForPreferences,
} from "@/lib/athAlertEvents";
import { normalizePlayerAlertPreferences } from "@/lib/playerAlertPreferences";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;
export const maxDuration = 30;

// Vercel Cron injects Authorization header using CRON_SECRET.
// Allow either ATH_ALERTS_CRON_SECRET or CRON_SECRET to authorize.
const SECRET = resolveCronSecret(process.env.ATH_ALERTS_CRON_SECRET, process.env.CRON_SECRET);
const LAST_NOTIFIED_KEY = "alerts:ath:lastNotified";
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "alexander.ek@live.se").trim().toLowerCase();
const TEST_ONLY_ADMIN = ["1", "true", "yes"].includes(
  String(process.env.ALERTS_TEST_ONLY_ADMIN || "").trim().toLowerCase()
);
const SETTINGS_KEY = "alerts:settings";
const NEW_ATH_LOOKBACK_MS = (() => {
  const raw = Number(process.env.ATH_ALERTS_LOOKBACK_HOURS);
  const hours = Number.isFinite(raw) && raw > 0 ? raw : 36;
  return Math.max(1, Math.min(hours, 168)) * 60 * 60 * 1000;
})();
const ATH_BASELINE_DAYS = (() => {
  const raw = Number(process.env.ATH_ALERTS_BASELINE_DAYS);
  const days = Number.isFinite(raw) && raw > 0 ? raw : 365;
  return Math.max(90, Math.min(days, 730));
})();

const json = (data, init = {}) =>
  NextResponse.json(data, {
    status: init.status ?? 200,
    headers: { "Cache-Control": "no-store", ...(init.headers || {}) },
  });

const requireAuth = (req) => {
  return requireCronAuth(req, SECRET, "ATH_ALERTS_CRON_SECRET is not configured");
};

const gameNameById = (() => {
  const map = new Map();
  for (const g of GAME_CONFIG || []) {
    if (g?.id) map.set(String(g.id), String(g.name || g.label || g.id));
  }
  return map;
})();

const computeTopTrends = (dailyAggMap) => {
  const out = [];
  for (const slug of SERIES_SLUGS) {
    const dateMap = dailyAggMap.get(slug);
    if (!dateMap) continue;
    const dates = Array.from(dateMap.keys()).sort();
    if (dates.length < 10) continue;

    // Split into prev 30 and last 30 by date order (we asked 60 days).
    const prev = dates.slice(0, Math.max(0, dates.length - 30));
    const last = dates.slice(Math.max(0, dates.length - 30));
    const avgFor = (list) => {
      let sum = 0;
      let count = 0;
      for (const d of list) {
        const row = dateMap.get(d);
        const s = Number(row?.sum);
        const c = Number(row?.count);
        if (!Number.isFinite(s) || !Number.isFinite(c) || c <= 0) continue;
        sum += s / c;
        count += 1;
      }
      return count ? sum / count : null;
    };
    const avgPrev = avgFor(prev);
    const avgLast = avgFor(last);
    if (!Number.isFinite(avgPrev) || !Number.isFinite(avgLast) || avgPrev === 0) continue;
    const pctChange = ((avgLast - avgPrev) / avgPrev) * 100;
    out.push({
      id: slug,
      name: gameNameById.get(slug) || slug,
      pctChange,
    });
  }
  out.sort((a, b) => b.pctChange - a.pctChange);
  return out.slice(0, 5);
};

async function handler(req) {
  const auth = requireAuth(req);
  if (!auth.ok) return json({ ok: false, error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const dryRun = searchParams.get("dryRun") === "1";

  const settingsRaw = (await getJson(SETTINGS_KEY)) || {};
  const athEnabled = settingsRaw?.athEnabled === false ? false : true;
  const testOnlyAdminSetting = Boolean(settingsRaw?.testOnlyAdmin);
  const effectiveTestOnlyAdmin = TEST_ONLY_ADMIN || testOnlyAdminSetting;

  if (!athEnabled) {
    return json({ ok: true, dryRun, sent: 0, skipped: true, reason: "ATH alerts disabled" });
  }

  if (!isMailerConfigured() && !dryRun) {
    return json({ ok: false, error: "Mailer not configured" }, { status: 503 });
  }

  const lastNotified = (await getJson(LAST_NOTIFIED_KEY)) || {};
  const prevMap = lastNotified?.slugs && typeof lastNotified.slugs === "object" ? lastNotified.slugs : {};
  const nextMap = { ...prevMap };
  const previousLobbyNotified = Number(lastNotified?.lobby);
  let nextLobbyNotified = Number.isFinite(previousLobbyNotified)
    ? previousLobbyNotified
    : null;
  const events = [];
  let dailyAgg = null;
  let athSnapshot = await getGameAthSnapshot().catch(() => null);
  if (!athSnapshot || athSnapshot.source !== "daily-history") {
    dailyAgg = await getCachedDailyAggregates(SERIES_SLUGS, ATH_BASELINE_DAYS).catch(() => new Map());
    athSnapshot = buildGameAthSnapshot(dailyAgg, SERIES_SLUGS);
    await setGameAthSnapshot(athSnapshot).catch(() => null);
  }
  const [latestSnapshot, lobbyAth] = await Promise.all([
    getLatestPlayersSnapshot().catch(() => null),
    getGlobalLobbyAth().catch(() => null),
  ]);
  const latestById = new Map(
    Array.isArray(latestSnapshot?.items)
      ? latestSnapshot.items.filter((item) => item?.id).map((item) => [item.id, item])
      : []
  );
  const lobbyEvent = buildLobbyAthEvent({
    lobbyAth,
    latestItems: latestSnapshot?.items,
    previousNotifiedValue: previousLobbyNotified,
    lookbackMs: NEW_ATH_LOOKBACK_MS,
  });
  if (lobbyEvent) {
    events.push(lobbyEvent);
    nextLobbyNotified = lobbyEvent.athValue;
  }

  // Detect new ATH per slug.
  const nowTs = Date.now();
  for (const slug of SERIES_SLUGS) {
    const latest = latestById.get(slug);
    if (!latest || !Number.isFinite(Number(latest.players))) continue;
    const ath = athSnapshot?.games?.[slug];
    if (!ath || !Number.isFinite(ath.value)) continue;
    const athTs = Date.parse(String(ath.at || ""));
    if (!Number.isFinite(athTs)) continue;
    if (nowTs - athTs > NEW_ATH_LOOKBACK_MS) continue;

    const previousNotified = Number(prevMap?.[slug]);
    if (Number.isFinite(previousNotified) && ath.value <= previousNotified) continue;

    nextMap[slug] = ath.value;
    events.push({
      id: slug,
      kind: "game",
      name: gameNameById.get(slug) || slug,
      athValue: ath.value,
      athAt: ath.at ?? null,
      previousAthValue: Number.isFinite(ath.previousValue) ? ath.previousValue : null,
      previousAthAt: ath.previousAt ?? null,
      currentValue: Number(latest.players),
    });
  }

  events.sort((a, b) => {
    const av = Number(a?.athValue);
    const bv = Number(b?.athValue);
    return (Number.isFinite(bv) ? bv : -Infinity) - (Number.isFinite(av) ? av : -Infinity);
  });

  if (!events.length) {
    return json({ ok: true, sent: 0, events: [], topTrends: [], recipients: [], dryRun });
  }

  // Load opted-in users with one MGET command rather than one GET per account.
  const index = (await getJson(getUserIndexKey())) || {};
  const emails = Array.isArray(index?.emails) ? index.emails : [];
  const users = await mgetJson(emails.map(getUserKey)).catch(() => []);
  const recipients = users
    .filter((user) => user?.email)
    .map((user) => ({
      ...user,
      playerAlerts: normalizePlayerAlertPreferences(user?.notifications),
    }))
    .filter((user) => user.playerAlerts.lobbyAthEmail || user.playerAlerts.gameAthEmail);

  // During testing: only send to the admin email to avoid spamming real users.
  const effectiveRecipients = (() => {
    if (!effectiveTestOnlyAdmin) return recipients;
    const adminUser = recipients.find((u) => String(u?.email || "").toLowerCase() === ADMIN_EMAIL);
    if (adminUser) return [adminUser];
    return [
      {
        email: ADMIN_EMAIL,
        firstName: "Alexander",
        playerAlerts: {
          lobbyAthEmail: true,
          gameAthEmail: true,
          dailyAvgEmail: false,
        },
      },
    ];
  })();
  const deliveries = effectiveRecipients
    .map((user) => ({
      user,
      events: filterAthEventsForPreferences(events, user.playerAlerts),
    }))
    .filter((delivery) => delivery.events.length > 0);

  // Skip the trend read when no user will receive this event.
  if (deliveries.length > 0 && !dailyAgg) {
    dailyAgg = await getCachedDailyAggregates(SERIES_SLUGS, 60).catch(() => new Map());
  }
  const topTrends = deliveries.length > 0 ? computeTopTrends(dailyAgg || new Map()) : [];

  let sent = 0;
  const errors = [];

  if (!dryRun) {
    for (const delivery of deliveries) {
      const { user } = delivery;
      try {
        const coffeeUrl = process.env.DONATE_BUYMEACOFFEE_URL || "https://buymeacoffee.com/evuul";
        const { subject, html } = buildAthAlertEmail({
          email: user.email,
          firstName: user.firstName || "there",
          events: delivery.events,
          topTrends,
          coffeeUrl,
        });
        await sendEmail({ toEmail: user.email, subject, html });
        sent += 1;
      } catch (err) {
        errors.push({
          email: user?.email,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  // Persist last-notified snapshot only for real sends (never for dry-run preview).
  if (!dryRun) {
    await setJson(LAST_NOTIFIED_KEY, {
      slugs: nextMap,
      ...(Number.isFinite(nextLobbyNotified) ? { lobby: nextLobbyNotified } : null),
      updatedAt: new Date().toISOString(),
    });
  }

  return json({
    ok: errors.length === 0,
    dryRun,
    events,
    topTrends,
    recipients: deliveries.map(({ user }) => user.email),
    sent,
    errors,
  });
}

export async function POST(req) {
  return handler(req);
}

// Vercel Cron uses GET requests to the configured `path`.
export async function GET(req) {
  return handler(req);
}
