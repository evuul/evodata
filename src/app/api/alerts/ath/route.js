import { NextResponse } from "next/server";
import { getJson, getUserIndexKey, getUserKey, setJson } from "@/lib/authStore";
import { getLatestSample } from "@/lib/csStore";
import { getDailyAggregates } from "@/lib/csStore";
import { SERIES_SLUGS } from "@/app/api/casinoscores/players/shared";
import { GAMES as GAME_CONFIG } from "@/config/games";
import { isMailerConfigured, sendEmail } from "@/lib/mailer";
import { buildAthAlertEmail } from "@/lib/emailTemplates";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;
export const maxDuration = 30;

// Vercel Cron injects Authorization header using CRON_SECRET.
// Allow either ATH_ALERTS_CRON_SECRET or CRON_SECRET to authorize.
const SECRET = process.env.ATH_ALERTS_CRON_SECRET || process.env.CRON_SECRET || "";
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

const computeAthFromDailyMap = (dateMap) => {
  if (!(dateMap instanceof Map) || dateMap.size === 0) return null;
  let max = null;
  let maxTs = null;
  for (const [, row] of dateMap) {
    const v = Number(row?.max);
    const ts = Number(row?.maxTs);
    if (!Number.isFinite(v)) continue;
    if (max == null || v > max) {
      max = v;
      maxTs = Number.isFinite(ts) ? ts : null;
    }
  }
  return max != null ? { value: Math.round(max), ts: maxTs } : null;
};

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
  const events = [];
  const dailyAgg = await getDailyAggregates(SERIES_SLUGS, ATH_BASELINE_DAYS).catch(() => new Map());

  // Detect new ATH per slug.
  const nowTs = Date.now();
  for (const slug of SERIES_SLUGS) {
    const latest = await getLatestSample(slug).catch(() => null);
    if (!latest || !Number.isFinite(latest.value)) continue;
    const dateMap = dailyAgg?.get?.(slug);
    const ath = computeAthFromDailyMap(dateMap);
    if (!ath || !Number.isFinite(ath.value)) continue;
    const athTs = Number(ath.ts);
    if (!Number.isFinite(athTs)) continue;
    if (nowTs - athTs > NEW_ATH_LOOKBACK_MS) continue;

    const previousNotified = Number(prevMap?.[slug]);
    if (Number.isFinite(previousNotified) && ath.value <= previousNotified) continue;

    nextMap[slug] = ath.value;
    events.push({
      id: slug,
      name: gameNameById.get(slug) || slug,
      athValue: ath.value,
      athAt: ath.ts ? new Date(ath.ts).toISOString() : null,
      currentValue: latest.value,
    });
  }

  events.sort((a, b) => {
    const av = Number(a?.athValue);
    const bv = Number(b?.athValue);
    return (Number.isFinite(bv) ? bv : -Infinity) - (Number.isFinite(av) ? av : -Infinity);
  });

  // Load opted-in users.
  const index = (await getJson(getUserIndexKey())) || {};
  const emails = Array.isArray(index?.emails) ? index.emails : [];
  const recipients = [];

  for (const email of emails) {
    const user = await getJson(getUserKey(email)).catch(() => null);
    if (!user?.email) continue;
    const enabled = Boolean(user?.notifications?.athEmail);
    if (!enabled) continue;
    recipients.push(user);
  }

  // During testing: only send to the admin email to avoid spamming real users.
  const effectiveRecipients = (() => {
    if (!effectiveTestOnlyAdmin) return recipients;
    const adminUser = recipients.find((u) => String(u?.email || "").toLowerCase() === ADMIN_EMAIL);
    if (adminUser) return [adminUser];
    return [
      {
        email: ADMIN_EMAIL,
        firstName: "Alexander",
      },
    ];
  })();

  if (!events.length) {
    return json({
      ok: true,
      sent: 0,
      events: [],
      topTrends: [],
      recipients: effectiveRecipients.map((u) => u.email),
      dryRun,
    });
  }

  // Compute trends to add value.
  const topTrends = dailyAgg ? computeTopTrends(dailyAgg) : [];

  let sent = 0;
  const errors = [];

  if (!dryRun) {
    for (const user of effectiveRecipients) {
      try {
        const coffeeUrl = process.env.DONATE_BUYMEACOFFEE_URL || "https://buymeacoffee.com/evuul";
        const { subject, html } = buildAthAlertEmail({
          email: user.email,
          firstName: user.firstName || "there",
          events,
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
      updatedAt: new Date().toISOString(),
    });
  }

  return json({
    ok: errors.length === 0,
    dryRun,
    events,
    topTrends,
    recipients: effectiveRecipients.map((u) => u.email),
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
