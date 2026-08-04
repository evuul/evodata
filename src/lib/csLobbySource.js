// Fetches one shared Evolution lobby snapshot and normalizes its game values.

import { normalizePlayers } from "./csStore.js";
import { lobbyKeyFor } from "./csLobbyGameKeys.js";

const LOBBY_TTL_MS = 30 * 1000;
const SOURCE_STALE_AFTER_MS = 20 * 60 * 1000;
const g = globalThis;
g.__CS_SHARED_LOBBY_CACHE__ ??= { ts: 0, data: null };

const parseCreatedAtMs = (payload) => {
  const timestamp = Date.parse(String(payload?.createdAt || ""));
  return Number.isFinite(timestamp) ? timestamp : null;
};

const isSourceFresh = (payload, now) => {
  const createdAt = parseCreatedAtMs(payload);
  return Number.isFinite(createdAt) && now - createdAt <= SOURCE_STALE_AFTER_MS;
};

function getLobbySources() {
  const primaryUrl = process.env.EVO_PROXY_URL ?? "https://evo-lobby-proxy.alexander-ek.workers.dev";
  const fallbackUrl = process.env.EVO_LOBBY_FALLBACK_URL ?? "https://api.casinoscores.com/cg-neptune-notification-center/api/evolobby/playercount/latest";
  const rawSecret = process.env.EVO_PROXY_SECRET || "";
  const authorization = rawSecret.toLowerCase().startsWith("bearer ") ? rawSecret : rawSecret ? `Bearer ${rawSecret}` : "";

  return [
    { url: primaryUrl, authorization },
    { url: fallbackUrl, authorization: "" },
  ];
}

export async function fetchLiveLobbyCounts({ force = false, fetchImpl = fetch, now = Date.now() } = {}) {
  const cache = g.__CS_SHARED_LOBBY_CACHE__;
  if (!force && cache.data && now - cache.ts < LOBBY_TTL_MS) return cache.data;

  const headers = {
    Accept: "application/json",
    "Accept-Language": "sv-SE,sv;q=0.9,en;q=0.8",
    "User-Agent": "Mozilla/5.0",
    Referer: "https://casinoscores.com/",
  };
  let latest = null;
  let lastError = null;

  for (const source of getLobbySources()) {
    try {
      const response = await fetchImpl(source.url, {
        headers: {
          ...headers,
          ...(source.authorization ? { Authorization: source.authorization } : {}),
        },
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`Lobby HTTP ${response.status}`);
      const payload = await response.json();
      const createdAt = parseCreatedAtMs(payload);
      if (!latest || (Number.isFinite(createdAt) && createdAt > latest.createdAt)) {
        latest = { payload, createdAt };
      }
      if (isSourceFresh(payload, now)) {
        cache.ts = now;
        cache.data = payload;
        return payload;
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (latest?.payload) {
    cache.ts = now;
    cache.data = latest.payload;
    return latest.payload;
  }
  throw lastError || new Error("Lobby fetch failed");
}

export function buildLiveLobbyItems(lobby, games) {
  const fetchedAt = Date.parse(String(lobby?.createdAt || ""));
  const timestamp = Number.isFinite(fetchedAt) ? new Date(fetchedAt).toISOString() : null;

  return (Array.isArray(games) ? games : []).map((game) => {
    const variant = game?.apiVariant === "a" ? "a" : "default";
    const lobbyKey = game?.apiSlug ? lobbyKeyFor(game.apiSlug, variant) : null;
    const rawValue = lobbyKey ? lobby?.gameShowPlayerCounts?.[lobbyKey] : null;
    const value = rawValue && typeof rawValue === "object"
      ? rawValue.players ?? rawValue.value ?? rawValue.count
      : rawValue;
    const players = value == null ? null : normalizePlayers(value);

    return {
      id: game?.id,
      slug: game?.apiSlug,
      variant,
      players,
      fetchedAt: players != null ? timestamp : null,
      stale: false,
    };
  });
}
