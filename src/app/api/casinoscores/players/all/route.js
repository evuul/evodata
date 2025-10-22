export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

import { normalizePlayers, saveSample, getLatestSample } from "@/lib/csStore";
import { GAMES as GAME_CONFIG } from "@/config/games";
import { lobbyKeyFor, CRAZY_TIME_A_RESET_MS } from "../shared";

const LOBBY_API = process.env.EVO_PROXY_URL ?? "https://evo-lobby-proxy.alexander-ek.workers.dev";
const RAW_LOBBY_AUTH = process.env.EVO_PROXY_SECRET || "";
const LOBBY_AUTH =
  RAW_LOBBY_AUTH && RAW_LOBBY_AUTH.toLowerCase().startsWith("bearer ")
    ? RAW_LOBBY_AUTH
    : RAW_LOBBY_AUTH
    ? `Bearer ${RAW_LOBBY_AUTH}`
    : "";
const LOBBY_TTL_MS = 30 * 1000;

const g = globalThis;
if (!g.__CS_LOBBY_CACHE__) {
  g.__CS_LOBBY_CACHE__ = { ts: 0, data: null };
}

function resJSON(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

async function fetchLobbyCounts(force = false) {
  const cache = g.__CS_LOBBY_CACHE__;
  const now = Date.now();
  if (!force && cache.data && now - cache.ts < LOBBY_TTL_MS) return cache.data;

  const res = await fetch(LOBBY_API, {
    headers: {
      Accept: "application/json",
      "Accept-Language": "sv-SE,sv;q=0.9,en;q=0.8",
      "User-Agent": "Mozilla/5.0",
      Referer: "https://casinoscores.com/",
      ...(LOBBY_AUTH ? { Authorization: LOBBY_AUTH } : {}),
    },
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`Lobby HTTP ${res.status}`);

  const data = await res.json();
  cache.data = data;
  cache.ts = now;
  return data;
}

function normalizeLobbyValue(raw) {
  if (raw == null) return null;
  if (typeof raw === "object") {
    const candidate = raw.players ?? raw.value ?? raw.count;
    return normalizePlayers(candidate);
  }
  return normalizePlayers(raw);
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const force = searchParams.get("force") === "1";

  let lobby = null;
  try {
    lobby = await fetchLobbyCounts(force);
  } catch (error) {
    lobby = null;
  }

  const items = [];
  let newestTs = 0;
  const lobbyCreatedAt = lobby?.createdAt ? Date.parse(lobby.createdAt) : null;
  const fallbackPromises = [];
  const fallbackIndices = [];

  GAME_CONFIG.forEach((game, index) => {
    const slug = game.apiSlug;
    const variant = game.apiVariant === "a" ? "a" : "default";
    const id = game.id;

    const lobbyKey = slug ? lobbyKeyFor(slug, variant) : null;
    const raw = lobbyKey ? lobby?.gameShowPlayerCounts?.[lobbyKey] : null;
    const normalized = normalizeLobbyValue(raw);

    const entry = {
      id,
      slug,
      variant,
      players: normalized,
      fetchedAt:
        normalized != null && Number.isFinite(lobbyCreatedAt)
          ? new Date(lobbyCreatedAt).toISOString()
          : null,
      stale: false,
    };

    if (normalized != null && entry.fetchedAt) {
      const ts = Date.parse(entry.fetchedAt);
      if (Number.isFinite(ts)) {
        newestTs = Math.max(newestTs, ts);
        saveSample(id, entry.fetchedAt, normalized).catch(() => undefined);
      }
    }

    if (entry.players == null) {
      fallbackIndices.push(index);
      fallbackPromises.push(getLatestSample(id));
    }

    items.push(entry);
  });

  if (fallbackPromises.length) {
    const fallbackResults = await Promise.all(fallbackPromises);
    fallbackResults.forEach((sample, idx) => {
      const itemIndex = fallbackIndices[idx];
      const seriesId = GAME_CONFIG[itemIndex].id;
      const usable =
        seriesId === "crazy-time:a" && sample && sample.ts < CRAZY_TIME_A_RESET_MS ? null : sample;
      if (!usable) return;
      const entry = items[itemIndex];
      entry.players = usable.value;
      entry.fetchedAt = new Date(usable.ts).toISOString();
      entry.stale = true;
      newestTs = Math.max(newestTs, usable.ts);
    });
  }

  return resJSON({
    ok: true,
    items,
    fetchedAt: newestTs ? new Date(newestTs).toISOString() : lobby?.createdAt ?? null,
  });
}
