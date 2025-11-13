/// <reference types="@cloudflare/workers-types" />

const DEFAULT_CURRENT_KEY = "liveTop3:current";
const DEFAULT_HISTORY_KEY = "liveTop3:history";
const DEFAULT_HISTORY_LIMIT = 288; // ~24h at 5 min intervals

function normalizeEntry(item) {
  if (!item || typeof item !== "object") return null;
  const totalAmount = Number(item.totalAmount ?? item.amount ?? item.total);
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) return null;
  const gameShow = item.gameShow ?? item.game ?? item.name ?? null;
  if (!gameShow) return null;
  const multiplier = Number(item.multiplier ?? item.multi ?? item.x);
  const winnersCount = Number(item.winnersCount ?? item.totalWinners ?? item.winners);
  const settledAt = item.settledAt ?? item.startedAt ?? item.createdAt ?? null;
  const id =
    item.id ??
    item.gameShowEventId ??
    item.hash ??
    settledAt ??
    crypto.randomUUID();

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
  const parseTs = (value) => {
    if (!value) return 0;
    const ts = Date.parse(value);
    return Number.isFinite(ts) ? ts : 0;
  };
  return rows
    .map((item) => normalizeEntry(item))
    .filter(Boolean)
    .sort((a, b) => parseTs(b.settledAt ?? b.createdAt) - parseTs(a.settledAt ?? a.createdAt))
    .slice(0, 3);
}

async function fetchLiveTop3(env) {
  const url = env.LIVE_TOP3_SOURCE_URL;
  if (!url) throw new Error("LIVE_TOP3_SOURCE_URL is not configured");
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "Accept-Language": "sv-SE,sv;q=0.9,en;q=0.8",
      "User-Agent": "Mozilla/5.0",
    },
  });
  if (!res.ok) throw new Error(`CasinoScores HTTP ${res.status}`);
  const payload = await res.json();
  const entries = normalizeEntries(payload);
  if (!entries.length) throw new Error("Upstream payload lacked entries");
  return {
    entries,
    fetchedAt: new Date().toISOString(),
    source: "live-feed",
    meta: {
      rawCount: Array.isArray(payload) ? payload.length : Array.isArray(payload?.entries) ? payload.entries.length : null,
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
