/// <reference types="@cloudflare/workers-types" />

const DEFAULT_CURRENT_KEY = "liveTop3:current";
const DEFAULT_HISTORY_KEY = "liveTop3:history";
const DEFAULT_HISTORY_LIMIT = 288; // ~24h at 5 min intervals
const DEFAULT_SNAPSHOT_LIMIT = 200; // how many entries to persist per fetch (use all if shorter)

// ✅ Evolution Game Show whitelist (UPPERCASE)
const EVOLUTION_GAMES = [
  "CRAZY_TIME",
  "CRAZY_TIME_A",
  "MONOPOLY_LIVE",
  "CASH_OR_CRASH_LIVE",
  "LIGHTNING_BACCARAT",
  "MONOPOLY_BIG_BALLER",
  "FUNKY_TIME",
  "RED_DOOR_ROULETTE",
  "LIGHTNING_STORM",
  "FIREBALL_ROULETTE",
];

// ✅ Hall of Fame endpoints to aggregate
const HALL_OF_FAME_URLS = [
  "https://api.casinoscores.com/cg-neptune-notification-center/api/halloffame/latest?page=0&size=10&sort=multiplier,desc&sort=settledAt,desc&gameShows=FUNKY_TIME&duration=720&spinOutcomes=HotSpot,CashHunt,Billy%20Bones%27%20Map,coinRush",
  "https://api.casinoscores.com/cg-neptune-notification-center/api/halloffame/latest?page=0&size=10&sort=multiplier,desc&sort=settledAt,desc&gameShows=MONOPOLY_BIG_BALLER&duration=720&spinOutcomes=HotSpot,CashHunt,Billy%20Bones%27%20Map,coinRush",
  "https://api.casinoscores.com/cg-neptune-notification-center/api/halloffame/latest?page=0&size=10&sort=multiplier,desc&sort=settledAt,desc&gameShows=CRAZY_TIME&duration=720&spinOutcomes=HotSpot,CashHunt,Billy%20Bones%27%20Map,coinRush",
  "https://api.casinoscores.com/cg-neptune-notification-center/api/halloffame/latest?page=0&size=10&sort=multiplier,desc&sort=settledAt,desc&gameShows=LIGHTNING_STORM&duration=720&spinOutcomes=HotSpot,CashHunt,Billy%20Bones%27%20Map,coinRush",
  "https://api.casinoscores.com/cg-neptune-notification-center/api/halloffame/latest?page=0&size=10&sort=multiplier,desc&sort=settledAt,desc&gameShows=RED_DOOR_ROULETTE&duration=720&spinOutcomes=HotSpot,CashHunt,Billy%20Bones%27%20Map,coinRush",
  "https://api.casinoscores.com/cg-neptune-notification-center/api/halloffame/latest?page=0&size=10&sort=multiplier,desc&sort=settledAt,desc&gameShows=MONOPOLY_LIVE&duration=720&spinOutcomes=HotSpot,CashHunt,Billy%20Bones%27%20Map,coinRush",
  "https://api.casinoscores.com/cg-neptune-notification-center/api/halloffame/latest?page=0&size=10&sort=multiplier,desc&sort=settledAt,desc&gameShows=LIGHTNING_BACCARAT&duration=720&spinOutcomes=HotSpot,CashHunt,Billy%20Bones%27%20Map,coinRush",
  "https://api.casinoscores.com/cg-neptune-notification-center/api/halloffame/latest?page=0&size=10&sort=multiplier,desc&sort=settledAt,desc&gameShows=CASH_OR_CRASH_LIVE&duration=720&spinOutcomes=HotSpot,CashHunt,Billy%20Bones%27%20Map,coinRush",
  "https://api.casinoscores.com/cg-neptune-notification-center/api/halloffame/latest?page=0&size=10&sort=multiplier,desc&sort=settledAt,desc&gameShows=FIREBALL_ROULETTE&duration=720&spinOutcomes=HotSpot,CashHunt,Billy%20Bones%27%20Map,coinRush",
];

function normalizeEntry(item) {
  if (!item || typeof item !== "object") return null;

  const totalAmount = Number(item.totalAmount ?? item.amount ?? item.total);
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) return null;

  const rawGameShow = item.gameShow ?? item.game ?? item.name ?? null;
  if (!rawGameShow) return null;
  const gameShowUpper = String(rawGameShow).toUpperCase();
  if (!EVOLUTION_GAMES.includes(gameShowUpper)) return null;

  const gameShow = rawGameShow; // keep original casing for UI
  const multiplier = Number(item.multiplier ?? item.multi ?? item.x);
  const winnersCount = Number(item.winnersCount ?? item.totalWinners ?? item.winners);
  const settledAt = item.settledAt ?? item.startedAt ?? item.createdAt ?? null;
  const id =
    item.id ??
    item.gameShowEventId ??
    item.hash ??
    settledAt ??
    (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${gameShow}-${Date.now()}`);

  return {
    id,
    gameShow,
    multiplier: Number.isFinite(multiplier) ? multiplier : null,
    totalAmount,
    settledAt,
    winnersCount: Number.isFinite(winnersCount) ? winnersCount : null,
  };
}

function normalizeEntries(rows) {
  if (!Array.isArray(rows)) return [];
  const parseAmount = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  };
  const parseTs = (value) => {
    if (!value) return 0;
    const ts = Date.parse(value);
    return Number.isFinite(ts) ? ts : 0;
  };
  return rows
    .map((item) => normalizeEntry(item))
    .filter(Boolean)
    .sort((a, b) => {
      const amountDiff = parseAmount(b.totalAmount) - parseAmount(a.totalAmount);
      if (amountDiff !== 0) return amountDiff;
      return parseTs(b.settledAt ?? b.createdAt) - parseTs(a.settledAt ?? a.createdAt);
    });
}

async function fetchLiveTop3(env) {
  let urls = HALL_OF_FAME_URLS;
  if (typeof env.LIVE_TOP3_SOURCE_URLS === "string" && env.LIVE_TOP3_SOURCE_URLS.trim().length) {
    try {
      const parsed = JSON.parse(env.LIVE_TOP3_SOURCE_URLS);
      if (Array.isArray(parsed) && parsed.length) {
        urls = parsed.map((url) => String(url)).filter((url) => url.startsWith("http"));
      }
    } catch {
      urls = [env.LIVE_TOP3_SOURCE_URLS.trim()];
    }
  }

  if (!urls.length) {
    throw new Error("No Hall of Fame URLs configured for Live Top 3 worker.");
  }

  const responses = await Promise.all(
    urls.map(async (url) => {
      try {
        const res = await fetch(url, {
          headers: {
            Accept: "application/json",
            "Accept-Language": "sv-SE,sv;q=0.9,en;q=0.8",
            "User-Agent": "Mozilla/5.0",
          },
        });
        if (!res.ok) {
          console.warn("[LiveTop3Worker] Upstream HTTP error", url, res.status);
          return [];
        }
        const payload = await res.json();
        if (Array.isArray(payload)) return payload;
        if (Array.isArray(payload?.content)) return payload.content;
        if (Array.isArray(payload?.entries)) return payload.entries;
        return [];
      } catch (error) {
        console.error("[LiveTop3Worker] Fetch failed", url, error);
        return [];
      }
    })
  );

  const allRaw = responses.flat();
  const normalized = normalizeEntries(allRaw);

  if (!normalized.length) {
    throw new Error("No valid Evolution entries found across Hall of Fame sources.");
  }

  const requestedLimit = Number(env.LIVE_TOP3_SNAPSHOT_LIMIT ?? DEFAULT_SNAPSHOT_LIMIT);
  const safeLimit =
    Number.isFinite(requestedLimit) && requestedLimit > 0
      ? Math.min(Math.round(requestedLimit), normalized.length)
      : normalized.length;
  const entries = normalized.slice(0, safeLimit);

  return {
    entries,
    fetchedAt: new Date().toISOString(),
    source: "hall-of-fame-multi",
    meta: {
      sources: urls.length,
      rawTotal: allRaw.length,
      normalizedTotal: normalized.length,
      snapshotLimit: safeLimit,
    },
  };
}

async function writeToUpstash(env, snapshot) {
  const restUrl = env.UPSTASH_REST_URL;
  const restToken = env.UPSTASH_REST_TOKEN;
  if (!restUrl || !restToken) throw new Error("Missing Upstash REST credentials");

  const currentKey = env.LIVE_TOP3_CURRENT_KEY ?? DEFAULT_CURRENT_KEY;
  const historyKey = env.LIVE_TOP3_HISTORY_KEY ?? DEFAULT_HISTORY_KEY;
  const limit = Number(env.LIVE_TOP3_HISTORY_LIMIT ?? DEFAULT_HISTORY_LIMIT);
  const dailyPrefix = env.LIVE_TOP3_DAILY_PREFIX ?? "liveTop3:daily:";
  const dailyLimit = Number(env.LIVE_TOP3_DAILY_LIMIT ?? 48);
  const dailyLimitSafe = Number.isFinite(dailyLimit) && dailyLimit > 0 ? dailyLimit : 48;
  const dailyTtlDays = Number(env.LIVE_TOP3_DAILY_TTL_DAYS ?? 120);
  const ymd =
    typeof snapshot?.fetchedAt === "string"
      ? snapshot.fetchedAt.slice(0, 10)
      : new Date().toISOString().slice(0, 10);
  const dailyKey = `${dailyPrefix}${ymd}`;
  const dailyTtlSeconds = Math.max(1, Math.round(dailyTtlDays * 24 * 60 * 60));

  const commands = [
    ["SET", currentKey, JSON.stringify(snapshot)],
    ["LPUSH", historyKey, JSON.stringify(snapshot)],
    ["LTRIM", historyKey, "0", String(Math.max(0, limit - 1))],
    ["LPUSH", dailyKey, JSON.stringify(snapshot)],
    ["LTRIM", dailyKey, "0", String(Math.max(0, dailyLimitSafe - 1))],
    ["EXPIRE", dailyKey, String(dailyTtlSeconds)],
  ];

  const response = await fetch(`${restUrl}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${restToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Upstash pipeline failed (${response.status}): ${body}`);
  }
}

async function handleSync(env) {
  const snapshot = await fetchLiveTop3(env);
  await writeToUpstash(env, snapshot);
  return snapshot;
}

export default {
  async fetch(request, env) {
    if (request.method === "POST") {
      try {
        const snapshot = await handleSync(env);
        return new Response(JSON.stringify({ ok: true, snapshot }), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(JSON.stringify({ ok: false, error: error.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }
    return new Response("LiveTop3 Worker", { status: 200 });
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(handleSync(env));
  },
};
