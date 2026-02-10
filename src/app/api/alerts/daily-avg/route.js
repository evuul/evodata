import { NextResponse } from "next/server";
import { getJson, getUserIndexKey, getUserKey, setJson } from "@/lib/authStore";
import { getDailyAggregates } from "@/lib/csStore";
import { SERIES_SLUGS } from "@/app/api/casinoscores/players/shared";
import { GAMES as GAME_CONFIG } from "@/config/games";
import { isMailerConfigured, sendEmail } from "@/lib/mailer";
import { buildDailyAvgPlayersEmail } from "@/lib/emailTemplates";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;
export const maxDuration = 30;

// Vercel Cron injects Authorization header using CRON_SECRET.
// Allow either ATH_ALERTS_CRON_SECRET or CRON_SECRET to authorize.
const SECRET = process.env.ATH_ALERTS_CRON_SECRET || process.env.CRON_SECRET || "";
const LAST_SENT_KEY = "alerts:dailyavg:lastSentYmd";
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "alexander.ek@live.se").trim().toLowerCase();
const TEST_ONLY_ADMIN = ["1", "true", "yes"].includes(
  String(process.env.ALERTS_TEST_ONLY_ADMIN || "").trim().toLowerCase()
);
const SETTINGS_KEY = "alerts:settings";

const TZ = "Europe/Stockholm";
const STOCKHOLM_PARTS = new Intl.DateTimeFormat("sv-SE", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  hour12: false,
});

const json = (data, init = {}) =>
  NextResponse.json(data, {
    status: init.status ?? 200,
    headers: { "Cache-Control": "no-store", ...(init.headers || {}) },
  });

const requireAuth = (req) => {
  if (!SECRET) return { ok: false, status: 500, error: "ATH_ALERTS_CRON_SECRET is not configured" };
  const authHeader = req.headers.get("authorization") || "";
  const expected = `Bearer ${SECRET}`;
  if (authHeader !== expected) return { ok: false, status: 401, error: "Unauthorized" };
  return { ok: true };
};

const gameNameById = (() => {
  const map = new Map();
  for (const g of GAME_CONFIG || []) {
    if (g?.id) map.set(String(g.id), String(g.name || g.label || g.id));
  }
  return map;
})();

function getStockholmNow() {
  const parts = STOCKHOLM_PARTS.formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type)?.value;
  const year = get("year");
  const month = get("month");
  const day = get("day");
  const hour = Number(get("hour"));
  const ymd = year && month && day ? `${year}-${month}-${day}` : null;
  return { ymd, hour: Number.isFinite(hour) ? hour : null };
}

function computeTotalAvg(dailyAggMap, ymd) {
  let total = 0;
  let slugsWithData = 0;
  const perGame = [];

  for (const slug of SERIES_SLUGS) {
    const dateMap = dailyAggMap.get(slug);
    if (!dateMap) continue;
    const row = dateMap.get(ymd);
    const sum = Number(row?.sum);
    const count = Number(row?.count);
    if (!Number.isFinite(sum) || !Number.isFinite(count) || count <= 0) continue;
    const avg = sum / count;
    if (!Number.isFinite(avg) || avg <= 0) continue;
    slugsWithData += 1;
    total += avg;
    perGame.push({
      id: slug,
      name: gameNameById.get(slug) || slug,
      avg,
    });
  }

  perGame.sort((a, b) => b.avg - a.avg);
  return { totalAvgPlayers: total, slugsWithData, perGame };
}

async function handler(req) {
  const auth = requireAuth(req);
  if (!auth.ok) return json({ ok: false, error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const dryRun = searchParams.get("dryRun") === "1";

  const settingsRaw = (await getJson(SETTINGS_KEY)) || {};
  const dailyAvgEnabled = settingsRaw?.dailyAvgEnabled === false ? false : true;
  const testOnlyAdminSetting = Boolean(settingsRaw?.testOnlyAdmin);
  const effectiveTestOnlyAdmin = TEST_ONLY_ADMIN || testOnlyAdminSetting;

  if (!dailyAvgEnabled) {
    return json({ ok: true, dryRun, sent: 0, skipped: true, reason: "Daily AVG alerts disabled" });
  }

  if (!isMailerConfigured() && !dryRun) {
    return json({ ok: false, error: "Mailer not configured" }, { status: 503 });
  }

  const { ymd: todayYmd, hour: stockholmHour } = getStockholmNow();
  if (!todayYmd || stockholmHour == null) {
    return json({ ok: false, error: "Could not resolve Stockholm time" }, { status: 500 });
  }

  // Run hourly (UTC) but only send once per day and only during Stockholm early morning window.
  // This ensures "yesterday" is complete.
  const withinWindow = stockholmHour >= 0 && stockholmHour < 6;
  const lastSentYmd = (await getJson(LAST_SENT_KEY))?.ymd || null;

  const dailyAgg = await getDailyAggregates(SERIES_SLUGS, 3).catch(() => new Map());
  const anySlug = SERIES_SLUGS.find(Boolean);
  const dateKeys = anySlug && dailyAgg.get(anySlug) ? Array.from(dailyAgg.get(anySlug).keys()).sort() : [];
  if (dateKeys.length < 3) {
    return json({ ok: true, dryRun, sent: 0, skipped: true, reason: "Not enough daily data" });
  }

  // dateKeys includes today as last. We want yesterday and day-before.
  const targetYmd = dateKeys[dateKeys.length - 2];
  const prevYmd = dateKeys[dateKeys.length - 3];

  if (!withinWindow && !dryRun) {
    return json({
      ok: true,
      dryRun,
      sent: 0,
      skipped: true,
      reason: "Outside Stockholm send window",
      stockholmHour,
      targetYmd,
      prevYmd,
    });
  }

  if (!dryRun && lastSentYmd === targetYmd) {
    return json({
      ok: true,
      dryRun,
      sent: 0,
      skipped: true,
      reason: "Already sent for target day",
      stockholmHour,
      targetYmd,
    });
  }

  const target = computeTotalAvg(dailyAgg, targetYmd);
  const prev = computeTotalAvg(dailyAgg, prevYmd);
  const changeAbs =
    Number.isFinite(prev.totalAvgPlayers) && Number.isFinite(target.totalAvgPlayers)
      ? target.totalAvgPlayers - prev.totalAvgPlayers
      : null;
  const changePct =
    Number.isFinite(prev.totalAvgPlayers) && prev.totalAvgPlayers > 0 && Number.isFinite(changeAbs)
      ? (changeAbs / prev.totalAvgPlayers) * 100
      : null;

  const coverageLabel = `Coverage: ${target.slugsWithData}/${SERIES_SLUGS.length} games`;

  // Recipients: later we can add an opt-in flag. For now, keep it safe.
  let recipients = [];
  if (effectiveTestOnlyAdmin) {
    recipients = [{ email: ADMIN_EMAIL, firstName: "Alexander" }];
  } else {
    const index = (await getJson(getUserIndexKey())) || {};
    const emails = Array.isArray(index?.emails) ? index.emails : [];
    for (const email of emails) {
      const user = await getJson(getUserKey(email)).catch(() => null);
      if (!user?.email) continue;
      const enabled = Boolean(user?.notifications?.dailyAvgEmail);
      if (!enabled) continue;
      recipients.push(user);
    }
  }

  if (!recipients.length) {
    return json({
      ok: true,
      dryRun,
      sent: 0,
      skipped: true,
      reason: "No recipients",
      targetYmd,
    });
  }

  let sent = 0;
  const errors = [];

  if (!dryRun) {
    for (const r of recipients) {
      try {
        const coffeeUrl = process.env.DONATE_BUYMEACOFFEE_URL || "https://buymeacoffee.com/evuul";
        const { subject, html } = buildDailyAvgPlayersEmail({
          email: r.email,
          firstName: r.firstName || "there",
          dateLabel: targetYmd,
          totalAvgPlayers: target.totalAvgPlayers,
          changeAbs,
          changePct,
          coverageLabel,
          topGames: target.perGame.slice(0, 5),
          coffeeUrl,
        });
        await sendEmail({ toEmail: r.email, subject, html });
        sent += 1;
      } catch (err) {
        errors.push({
          email: r?.email,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  if (!dryRun) {
    await setJson(LAST_SENT_KEY, { ymd: targetYmd, sentAt: new Date().toISOString() });
  }

  return json({
    ok: errors.length === 0,
    dryRun,
    sent,
    recipients: recipients.map((r) => r.email),
    stockholmHour,
    targetYmd,
    prevYmd,
    totalAvgPlayers: target.totalAvgPlayers,
    changeAbs,
    changePct,
    coverage: { slugsWithData: target.slugsWithData, totalSlugs: SERIES_SLUGS.length },
    topGames: target.perGame.slice(0, 5).map((g) => ({ id: g.id, name: g.name, avg: g.avg })),
    errors,
  });
}

export async function GET(req) {
  return handler(req);
}

export async function POST(req) {
  return handler(req);
}
