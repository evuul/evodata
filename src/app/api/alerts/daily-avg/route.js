import { NextResponse } from "next/server";
import { getJson, getUserIndexKey, getUserKey, setJson } from "@/lib/authStore";
import { getDailyAggregates } from "@/lib/csStore";
import { SERIES_SLUGS } from "@/app/api/casinoscores/players/shared";
import { GAMES as GAME_CONFIG } from "@/config/games";
import { isMailerConfigured, sendEmail } from "@/lib/mailer";
import { buildDailyAvgPlayersEmail } from "@/lib/emailTemplates";
import {
  applyRecoveryForDate,
  resolveRecoveryDate,
  shouldUseLiveTrackerRecovery,
} from "@/lib/liveTrackerRecovery";

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
const SEND_HOUR_RAW = Number(process.env.DAILY_AVG_SEND_HOUR_STOCKHOLM);
const SEND_HOUR_STOCKHOLM =
  Number.isFinite(SEND_HOUR_RAW) && SEND_HOUR_RAW >= 0 && SEND_HOUR_RAW <= 23
    ? Math.floor(SEND_HOUR_RAW)
    : 6; // default 06:00 Stockholm
const RESEND_MIN_GAP_MS = 550; // keep below 2 req/s
const RESEND_MAX_RETRIES = 4;
const MANUAL_DAILY_TOTAL_OVERRIDES = Object.freeze({
  "2026-02-11": 61972,
});

const resolveTestOnlyAdmin = (raw) => {
  if (typeof raw?.testOnlyAdmin === "boolean") return raw.testOnlyAdmin;
  return TEST_ONLY_ADMIN;
};

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
  const override = Number(MANUAL_DAILY_TOTAL_OVERRIDES[ymd]);
  const totalAvgPlayers = Number.isFinite(override) && override > 0 ? override : total;
  return { totalAvgPlayers, slugsWithData, perGame };
}

function buildTrendSeries(dailyAggMap, dateKeys, targetYmd, days = 90) {
  const sorted = Array.isArray(dateKeys) ? [...dateKeys].sort() : [];
  const targetIdx = sorted.lastIndexOf(targetYmd);
  if (targetIdx < 0) return [];
  const start = Math.max(0, targetIdx - (days - 1));
  const selected = sorted.slice(start, targetIdx + 1);
  return selected
    .map((ymd) => {
      const row = computeTotalAvg(dailyAggMap, ymd);
      const v = Number(row?.totalAvgPlayers);
      return {
        ymd,
        avgPlayers: Number.isFinite(v) ? v : null,
      };
    })
    .filter((row) => Number.isFinite(row.avgPlayers) && row.avgPlayers > 0);
}

function buildTopGamesWindow(dailyAggMap, dateKeys, targetYmd, days = 14) {
  const sorted = Array.isArray(dateKeys) ? [...dateKeys].sort() : [];
  const targetIdx = sorted.lastIndexOf(targetYmd);
  if (targetIdx < 0) return [];
  const start = Math.max(0, targetIdx - (days - 1));
  const selected = sorted.slice(start, targetIdx + 1);

  const rows = [];
  for (const slug of SERIES_SLUGS) {
    const dateMap = dailyAggMap.get(slug);
    if (!dateMap) continue;
    let sumTotal = 0;
    let countTotal = 0;
    for (const ymd of selected) {
      const row = dateMap.get(ymd);
      const sum = Number(row?.sum);
      const count = Number(row?.count);
      if (!Number.isFinite(sum) || !Number.isFinite(count) || count <= 0) continue;
      sumTotal += sum;
      countTotal += count;
    }
    if (!(countTotal > 0)) continue;
    const avg = sumTotal / countTotal;
    if (!Number.isFinite(avg) || avg <= 0) continue;
    rows.push({
      id: slug,
      name: gameNameById.get(slug) || slug,
      avg,
    });
  }

  return rows.sort((a, b) => b.avg - a.avg);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isRateLimitError = (err) => {
  const msg = String(err?.message || err || "").toLowerCase();
  return msg.includes("429") || msg.includes("too many requests") || msg.includes("rate limit");
};

async function sendWithRetry(sendFn) {
  let attempt = 0;
  while (attempt < RESEND_MAX_RETRIES) {
    try {
      await sendFn();
      return;
    } catch (err) {
      attempt += 1;
      if (!isRateLimitError(err) || attempt >= RESEND_MAX_RETRIES) throw err;
      // 429 backoff: 1.2s, 2.4s, 4.8s...
      await sleep(1200 * 2 ** (attempt - 1));
    }
  }
}

async function handler(req) {
  const auth = requireAuth(req);
  if (!auth.ok) return json({ ok: false, error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const dryRun = searchParams.get("dryRun") === "1";
  const forceSend = searchParams.get("force") === "1";
  const targetYmdParam = String(searchParams.get("targetYmd") || "").trim();
  const hasExplicitTarget = /^\d{4}-\d{2}-\d{2}$/.test(targetYmdParam);

  const settingsRaw = (await getJson(SETTINGS_KEY)) || {};
  const dailyAvgEnabled = settingsRaw?.dailyAvgEnabled === false ? false : true;
  const effectiveTestOnlyAdmin = resolveTestOnlyAdmin(settingsRaw);

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

  // Run hourly (UTC) but send at one fixed local Stockholm hour.
  // This ensures predictable timing and that "yesterday" is typically complete.
  const atScheduledHour = stockholmHour === SEND_HOUR_STOCKHOLM;
  const lastSentYmd = (await getJson(LAST_SENT_KEY))?.ymd || null;

  const dailyAgg = await getDailyAggregates(SERIES_SLUGS, 120).catch(() => new Map());
  let recoveryMeta = null;
  if (shouldUseLiveTrackerRecovery(process.env)) {
    const fixYmd = resolveRecoveryDate(todayYmd, process.env);
    recoveryMeta = applyRecoveryForDate(dailyAgg, fixYmd);
  }
  const anySlug = SERIES_SLUGS.find(Boolean);
  const dateKeys = anySlug && dailyAgg.get(anySlug) ? Array.from(dailyAgg.get(anySlug).keys()).sort() : [];
  if (dateKeys.length < 3) {
    return json({ ok: true, dryRun, sent: 0, skipped: true, reason: "Not enough daily data" });
  }

  // Default target selection:
  // - if today's key exists: target = yesterday
  // - if today's key is missing (lagging pipeline): target = latest available day
  let targetYmd = dateKeys[dateKeys.length - 2];
  let prevYmd = dateKeys[dateKeys.length - 3];
  const todayIdx = dateKeys.lastIndexOf(todayYmd);
  if (todayIdx >= 1) {
    targetYmd = dateKeys[todayIdx - 1];
    prevYmd = todayIdx >= 2 ? dateKeys[todayIdx - 2] : null;
  } else {
    targetYmd = dateKeys[dateKeys.length - 1];
    prevYmd = dateKeys[dateKeys.length - 2] ?? null;
  }
  if (hasExplicitTarget) {
    const idx = dateKeys.lastIndexOf(targetYmdParam);
    if (idx <= 0) {
      return json(
        {
          ok: false,
          error: "targetYmd is outside available daily data range",
          targetYmd: targetYmdParam,
          availableFrom: dateKeys[0],
          availableTo: dateKeys[dateKeys.length - 1],
        },
        { status: 400 }
      );
    }
    targetYmd = dateKeys[idx];
    prevYmd = dateKeys[idx - 1];
  }

  if (!prevYmd) {
    return json({
      ok: true,
      dryRun,
      sent: 0,
      skipped: true,
      reason: "Not enough prior-day data",
      targetYmd,
    });
  }

  if (!atScheduledHour && !dryRun && !forceSend) {
    return json({
      ok: true,
      dryRun,
      sent: 0,
      skipped: true,
      reason: "Outside Stockholm scheduled send hour",
      stockholmHour,
      scheduledHour: SEND_HOUR_STOCKHOLM,
      targetYmd,
      prevYmd,
    });
  }

  if (!dryRun && !forceSend && lastSentYmd === targetYmd) {
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
  const trendSeries = buildTrendSeries(dailyAgg, dateKeys, targetYmd, 90);
  const topGames14d = buildTopGamesWindow(dailyAgg, dateKeys, targetYmd, 14);
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
    let lastSendAt = 0;
    for (const r of recipients) {
      try {
        const now = Date.now();
        const waitMs = Math.max(0, RESEND_MIN_GAP_MS - (now - lastSendAt));
        if (waitMs > 0) await sleep(waitMs);

        const coffeeUrl = process.env.DONATE_BUYMEACOFFEE_URL || "https://buymeacoffee.com/evuul";
        const { subject, html } = buildDailyAvgPlayersEmail({
          email: r.email,
          firstName: r.firstName || "there",
          dateLabel: targetYmd,
          totalAvgPlayers: target.totalAvgPlayers,
          changeAbs,
          changePct,
          coverageLabel,
          trendSeries,
          topGames: topGames14d.slice(0, 5),
          coffeeUrl,
        });
        await sendWithRetry(() => sendEmail({ toEmail: r.email, subject, html }));
        lastSendAt = Date.now();
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
    testOnlyAdmin: effectiveTestOnlyAdmin,
    stockholmHour,
    scheduledHour: SEND_HOUR_STOCKHOLM,
    forceSend,
    targetYmd,
    prevYmd,
    totalAvgPlayers: target.totalAvgPlayers,
    changeAbs,
    changePct,
    coverage: { slugsWithData: target.slugsWithData, totalSlugs: SERIES_SLUGS.length },
    trendSeries,
    topGames: topGames14d.slice(0, 5).map((g) => ({ id: g.id, name: g.name, avg: g.avg })),
    recovery: recoveryMeta,
    errors,
  });
}

export async function GET(req) {
  return handler(req);
}

export async function POST(req) {
  return handler(req);
}
