import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

const UPSTASH_REST_URL = process.env.UPSTASH_REST_URL;
const UPSTASH_REST_TOKEN = process.env.UPSTASH_REST_TOKEN;
const CURRENT_KEY = process.env.LIVE_TOP3_CURRENT_KEY ?? "liveTop3:current";
const HISTORY_KEY = process.env.LIVE_TOP3_HISTORY_KEY ?? "liveTop3:history";
const DAILY_PREFIX = process.env.LIVE_TOP3_DAILY_PREFIX ?? "liveTop3:daily:";
const DAILY_LIMIT_PER_DAY = (() => {
  const parsed = Number(process.env.LIVE_TOP3_DAILY_LIMIT ?? "48");
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 48;
})();

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const MAX_HISTORY_ITEMS = 2000;
const STOCKHOLM_TZ = "Europe/Stockholm";

const tzDateFormatter = new Intl.DateTimeFormat("sv-SE", {
  timeZone: STOCKHOLM_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const parseTimestamp = (value) => {
  if (!value) return 0;
  const ts = Date.parse(value);
  return Number.isFinite(ts) ? ts : 0;
};

const toTimezoneYmd = (value, timeZone = STOCKHOLM_TZ) => {
  if (!value) return null;
  try {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const formatter = timeZone === STOCKHOLM_TZ ? tzDateFormatter : new Intl.DateTimeFormat("sv-SE", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(date).replace(/\//g, "-");
  } catch {
    return null;
  }
};

const getStockholmTodayYmd = () =>
  toTimezoneYmd(Date.now()) ?? new Date().toISOString().slice(0, 10);

const snapshotYmd = (snapshot) => {
  const raw = snapshot?.fetchedAt ?? snapshot?.updatedAt ?? snapshot?.createdAt;
  if (typeof raw === "string" && raw.length >= 10) return raw.slice(0, 10);
  const date = raw ? new Date(raw) : null;
  if (!date || Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
};

function json(data, init = {}) {
  return NextResponse.json(data, {
    status: init.status ?? 200,
    headers: {
      "Cache-Control": "no-store",
      ...(init.headers || {}),
    },
  });
}

async function upstashGet(key) {
  if (!UPSTASH_REST_URL || !UPSTASH_REST_TOKEN) {
    throw new Error("Missing UPSTASH_REST_URL or UPSTASH_REST_TOKEN");
  }

  const res = await fetch(
    `${UPSTASH_REST_URL}/get/${encodeURIComponent(key)}`,
    {
      headers: {
        Authorization: `Bearer ${UPSTASH_REST_TOKEN}`,
      },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upstash GET ${key} failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  if (!data.result) return null;

  try {
    return JSON.parse(data.result);
  } catch {
    return null;
  }
}

async function upstashLrange(key, start, stop) {
  if (!UPSTASH_REST_URL || !UPSTASH_REST_TOKEN) {
    throw new Error("Missing UPSTASH_REST_URL or UPSTASH_REST_TOKEN");
  }

  const res = await fetch(
    `${UPSTASH_REST_URL}/lrange/${encodeURIComponent(
      key
    )}/${start}/${stop}`,
    {
      headers: {
        Authorization: `Bearer ${UPSTASH_REST_TOKEN}`,
      },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upstash LRANGE ${key} failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  if (!Array.isArray(data.result)) return [];

  return data.result
    .map((raw) => {
      try {
        return typeof raw === "string" ? JSON.parse(raw) : raw;
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function dedupeSnapshotEntries(snapshots, options = {}) {
  if (!Array.isArray(snapshots) || !snapshots.length) return [];
  const targetYmd = options?.targetYmd ?? null;
  const timeZone = options?.timeZone ?? STOCKHOLM_TZ;
  const seen = new Set();
  const merged = [];
  snapshots.forEach((snapshot) => {
    const rows = Array.isArray(snapshot?.entries)
      ? snapshot.entries
      : Array.isArray(snapshot?.data)
      ? snapshot.data
      : [];
    rows.forEach((entry) => {
      if (!entry || typeof entry !== "object") return;
      const key =
        entry.id ??
        [
          entry.gameShow ?? "game",
          entry.settledAt ?? entry.startedAt ?? entry.createdAt ?? "",
          entry.multiplier ?? "",
          entry.totalAmount ?? "",
        ].join("|");
      if (seen.has(key)) return;
      seen.add(key);
      const eventTimestamp =
        entry.settledAt ??
        entry.startedAt ??
        entry.createdAt ??
        entry.fetchedAt ??
        snapshot?.fetchedAt;
      const entryYmd = toTimezoneYmd(eventTimestamp, timeZone);
      if (targetYmd && entryYmd !== targetYmd) return;
      merged.push({
        ...entry,
        fetchedAt: snapshot?.fetchedAt ?? snapshot?.updatedAt ?? entry?.fetchedAt ?? null,
      });
    });
  });
  merged.sort(
    (a, b) =>
      parseTimestamp(b.settledAt ?? b.fetchedAt ?? b.startedAt) -
      parseTimestamp(a.settledAt ?? a.fetchedAt ?? a.startedAt)
  );
  return merged;
}

function filterSnapshotsByYmd(snapshots, ymd) {
  if (!ymd || !Array.isArray(snapshots)) return [];
  return snapshots.filter((snapshot) => snapshotYmd(snapshot) === ymd);
}

// grupperar snapshots (från liveTop3:history) per dag
function groupSnapshotsByDay(snapshots, days, perDay) {
  const safeDays =
    Number.isFinite(days) && days > 0 ? Math.min(Math.round(days), 365) : 0;
  const safePerDay =
    Number.isFinite(perDay) && perDay > 0 ? Math.round(perDay) : 3;

  if (!safeDays || !snapshots.length) return [];

  const map = new Map(); // ymd -> snapshots[]

  for (const snap of snapshots) {
    const rawDate =
      snap?.fetchedAt ?? snap?.updatedAt ?? snap?.createdAt ?? null;
    const date = rawDate ? new Date(rawDate) : null;
    if (!date || Number.isNaN(date.getTime())) continue;
    const ymd = date.toISOString().slice(0, 10);

    const arr = map.get(ymd) ?? [];
    if (arr.length < safePerDay) {
      arr.push(snap);
      map.set(ymd, arr);
    }
  }

  // bygg buckets för senaste N dagar (även om en del blir tomma)
  const buckets = [];
  const today = new Date();
  for (let i = 0; i < safeDays; i++) {
    const d = new Date(today.getTime() - i * ONE_DAY_MS);
    const ymd = d.toISOString().slice(0, 10);
    const daySnaps = map.get(ymd) ?? [];
    buckets.push({ ymd, snapshots: daySnaps });
  }

  // äldre -> nyare (så din UI kan använda .map() direkt)
  return buckets.reverse();
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const historyDays = Number(searchParams.get("historyDays") ?? "0");
    const historyPerDay = Number(searchParams.get("historyPerDay") ?? "0");
    const todayYmd = getStockholmTodayYmd();

    // 1) Läs current snapshot
    const snapshot = await upstashGet(CURRENT_KEY);

    // 2) Läs rå historiklista och gruppera den per dag
    let history = [];
    let rawHistorySnapshots = [];
    if (Number.isFinite(historyDays) && historyDays > 0) {
      const items =
        historyDays * historyPerDay > 0
          ? Math.min(historyDays * historyPerDay, MAX_HISTORY_ITEMS)
          : Math.min(90, MAX_HISTORY_ITEMS); // default max 90 snapshots

      rawHistorySnapshots = await upstashLrange(HISTORY_KEY, 0, items - 1);
      history = groupSnapshotsByDay(rawHistorySnapshots, historyDays, historyPerDay);
    }

    // 3) Läs dagens snapshots från dagliga bucket
    let todayEntries = [];
    try {
      const todaySnapshots = await upstashLrange(
        `${DAILY_PREFIX}${todayYmd}`,
        0,
        Math.max(0, DAILY_LIMIT_PER_DAY - 1)
      );
      todayEntries = dedupeSnapshotEntries(todaySnapshots, {
        targetYmd: todayYmd,
      });
    } catch (error) {
      console.warn("/api/live-top3 daily read failed:", error);
      todayEntries = [];
    }

    if (!todayEntries || todayEntries.length === 0) {
      try {
        if (!rawHistorySnapshots.length) {
          const fallbackItems = Math.min(
            MAX_HISTORY_ITEMS,
            Math.max(DAILY_LIMIT_PER_DAY * 6, 120)
          );
          rawHistorySnapshots = await upstashLrange(
            HISTORY_KEY,
            0,
            Math.max(0, fallbackItems - 1)
          );
        }
        const todaysHistory = filterSnapshotsByYmd(rawHistorySnapshots, todayYmd);
        todayEntries = dedupeSnapshotEntries(todaysHistory, {
          targetYmd: todayYmd,
        });
      } catch (error) {
        console.warn("/api/live-top3 history fallback failed:", error);
      }
    }

    if ((!todayEntries || !todayEntries.length) && snapshot) {
      const fallback = Array.isArray(snapshot.entries) ? snapshot.entries : [];
      todayEntries = dedupeSnapshotEntries(
        [{ entries: fallback, fetchedAt: snapshot.fetchedAt }],
        { targetYmd: todayYmd }
      );
    }

    if (!snapshot) {
      return json(
        {
          ok: false,
          error: "No Live Top 3 snapshot in Upstash yet.",
        },
        { status: 503 }
      );
    }

    return json({
      ok: true,
      source: "upstash",
      entries: Array.isArray(snapshot.entries) ? snapshot.entries : [],
      todayEntries,
      todayYmd,
      fetchedAt: snapshot.fetchedAt ?? null,
      meta: snapshot.meta ?? null,
      history,
    });
  } catch (error) {
    console.error("/api/live-top3 error:", error);
    return json(
      {
        ok: false,
        error:
          error && typeof error === "object" && "message" in error
            ? error.message
            : "Unknown error in /api/live-top3",
      },
      { status: 503 }
    );
  }
}
