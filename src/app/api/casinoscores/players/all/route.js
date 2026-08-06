// Returns normalized live player counts while respecting the shared lobby cache.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

import {
  normalizePlayers,
  getLatestSample,
  getOrBuildBaseline,
  getGameAthSnapshot,
  getGlobalLobbyAth,
  getLatestPlayersSnapshot,
  maybeUpdateDailyLobbyPeak,
  setGlobalLobbyAth,
  updateGameAthSnapshot,
  bucketLabelFromTs,
} from "@/lib/csStore";
import { recordCostEvent } from "@/lib/csCostTracker";
import { GAMES as GAME_CONFIG, isUnibetTrackedGame } from "@/config/games";
import { selectLiveAthCandidates } from "@/lib/liveAthGuard";
import { summarizeObservedLobby } from "@/lib/liveLobbyPeak";
import { applyUnibetPilotFallback } from "@/lib/unibetPilotFallback";
import { getLatestUnibetPilotSample } from "@/lib/unibetPilotStore";
import { lobbyKeyFor, CRAZY_TIME_A_RESET_MS } from "../shared";

const LOBBY_API = process.env.EVO_PROXY_URL ?? "https://evo-lobby-proxy.alexander-ek.workers.dev";
const LOBBY_API_FALLBACK =
  process.env.EVO_LOBBY_FALLBACK_URL ??
  "https://api.casinoscores.com/cg-neptune-notification-center/api/evolobby/playercount/latest";
const RAW_LOBBY_AUTH = process.env.EVO_PROXY_SECRET || "";
const LOBBY_AUTH =
  RAW_LOBBY_AUTH && RAW_LOBBY_AUTH.toLowerCase().startsWith("bearer ")
    ? RAW_LOBBY_AUTH
    : RAW_LOBBY_AUTH
    ? `Bearer ${RAW_LOBBY_AUTH}`
    : "";
const LOBBY_TTL_MS = 30 * 1000;
const SOURCE_STALE_AFTER_MS = 20 * 60 * 1000;
const CACHE_CONTROL = "public, s-maxage=30, stale-while-revalidate=60";
const BASELINE_DAYS = 30;
const BASELINE_BUCKET_MS = 5 * 60 * 1000;
const LIVE_ATH_SNAPSHOT_REFRESH_MS = 5 * 60 * 1000;

const g = globalThis;
if (!g.__CS_LOBBY_CACHE__) {
  g.__CS_LOBBY_CACHE__ = { ts: 0, data: null };
}
if (!g.__CS_LIVE_ATH_GUARD__) {
  g.__CS_LIVE_ATH_GUARD__ = { snapshot: null, refreshedAt: 0, initialized: false, refreshPromise: null };
}

async function syncObservedLiveAth(items, updatedAt) {
  const guard = g.__CS_LIVE_ATH_GUARD__;
  const now = Date.now();

  if (!guard.initialized || now - guard.refreshedAt >= LIVE_ATH_SNAPSHOT_REFRESH_MS) {
    if (!guard.refreshPromise) {
      guard.refreshPromise = getGameAthSnapshot()
        .then((snapshot) => {
          guard.snapshot = snapshot;
          guard.refreshedAt = Date.now();
          guard.initialized = true;
          return snapshot;
        })
        .finally(() => {
          guard.refreshPromise = null;
        });
    }
    await guard.refreshPromise;
  }

  const candidates = selectLiveAthCandidates(guard.snapshot, items);
  if (!candidates.length) return;

  const updated = await updateGameAthSnapshot(candidates, updatedAt);
  if (updated) {
    guard.snapshot = updated;
    guard.refreshedAt = Date.now();
    guard.initialized = true;
  }
}

async function syncObservedLobbyPeak(items) {
  const observed = summarizeObservedLobby(items);
  if (!Number.isFinite(observed.totalPlayers) || !observed.measuredAt) return;

  const measuredAt = Date.parse(observed.measuredAt);
  if (!Number.isFinite(measuredAt)) return;

  const dailyPeak = await maybeUpdateDailyLobbyPeak(observed.totalPlayers, measuredAt);
  const currentAth = await getGlobalLobbyAth();
  if (!Number.isFinite(Number(currentAth?.value)) || observed.totalPlayers > Number(currentAth.value)) {
    await setGlobalLobbyAth({
      value: observed.totalPlayers,
      date: dailyPeak?.date ?? observed.measuredAt.slice(0, 10),
      at: observed.measuredAt,
    });
  }
}

function resJSON(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": CACHE_CONTROL,
    },
  });
}

async function fetchLobbyCounts(force = false) {
  const cache = g.__CS_LOBBY_CACHE__;
  const now = Date.now();
  if (!force && cache.data && now - cache.ts < LOBBY_TTL_MS) return cache.data;

  const headers = {
    Accept: "application/json",
    "Accept-Language": "sv-SE,sv;q=0.9,en;q=0.8",
    "User-Agent": "Mozilla/5.0",
    Referer: "https://casinoscores.com/",
  };

  const parseCreatedAtMs = (payload) => {
    const ts = Date.parse(String(payload?.createdAt || ""));
    return Number.isFinite(ts) ? ts : null;
  };

  const isSourceFresh = (payload, nowMs) => {
    const ts = parseCreatedAtMs(payload);
    if (!Number.isFinite(ts)) return false;
    return nowMs - ts <= SOURCE_STALE_AFTER_MS;
  };

  const tryFetch = async (url, withAuth = false) => {
    const res = await fetch(url, {
      headers: {
        ...headers,
        ...(withAuth && LOBBY_AUTH ? { Authorization: LOBBY_AUTH } : {}),
      },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Lobby HTTP ${res.status} (${url})`);
    const json = await res.json();
    return { json, createdAtMs: parseCreatedAtMs(json) };
  };

  let lastError = null;
  let best = null;
  const targets = [
    { url: LOBBY_API, withAuth: true },
    { url: LOBBY_API_FALLBACK, withAuth: false },
  ];

  for (const target of targets) {
    try {
      const fetched = await tryFetch(target.url, target.withAuth);
      if (!best || (Number.isFinite(fetched.createdAtMs) && fetched.createdAtMs > (best.createdAtMs || 0))) {
        best = fetched;
      }
      if (isSourceFresh(fetched.json, now)) {
        cache.data = fetched.json;
        cache.ts = now;
        return fetched.json;
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (best?.json) {
    cache.data = best.json;
    cache.ts = now;
    return best.json;
  }

  throw lastError || new Error("Lobby fetch failed");
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
  recordCostEvent({
    endpoint: "/api/casinoscores/players/all",
  });

  let lobby = null;
  try {
    lobby = await fetchLobbyCounts(false);
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
      entry.stale = !isUnibetTrackedGame(GAME_CONFIG[itemIndex]);
      newestTs = Math.max(newestTs, usable.ts);
    });
  }

  const storedSnapshot = await getLatestPlayersSnapshot().catch(() => null);
  const storedById = new Map(
    Array.isArray(storedSnapshot?.items)
      ? storedSnapshot.items.filter((item) => item?.id).map((item) => [item.id, item])
      : []
  );

  for (const entry of items) {
    const stored = storedById.get(entry.id);
    entry.stuck = Boolean(stored?.stuck);
    entry.stuckDays = Number.isFinite(Number(stored?.stuckDays)) ? Number(stored.stuckDays) : null;
    entry.stuckSince = stored?.stuckSince ?? null;
    entry.stuckLatestAt = stored?.stuckLatestAt ?? null;
    entry.stuckValue = Number.isFinite(Number(stored?.stuckValue)) ? Number(stored.stuckValue) : null;
    entry.stuckRunLength = Number.isFinite(Number(stored?.stuckRunLength))
      ? Number(stored.stuckRunLength)
      : 0;
  }

  if (items.some((entry) => entry.stuck)) {
    try {
      const pilotSample = await getLatestUnibetPilotSample();
      const repaired = applyUnibetPilotFallback(items, pilotSample);
      items.splice(0, items.length, ...repaired.items);
      for (const item of repaired.applied) {
        const timestamp = Date.parse(item.fetchedAt);
        if (Number.isFinite(timestamp)) newestTs = Math.max(newestTs, timestamp);
      }
    } catch {
      // Primary lobby data remains available if the optional repair feed is unavailable.
    }
  }

  // Only an actual record triggers a KV write; ordinary live page reads remain write-free.
  try {
    await syncObservedLiveAth(items, newestTs ? new Date(newestTs).toISOString() : new Date().toISOString());
  } catch {
    // The live response must remain available if optional ATH persistence fails.
  }
  try {
    await syncObservedLobbyPeak(items);
  } catch {
    // The live response must remain available if optional peak persistence fails.
  }

  let baseline = null;
  let baselineBucket = null;
  let baselineEntry = null;
  try {
    baselineBucket = bucketLabelFromTs(Date.now(), BASELINE_BUCKET_MS);
    const slugs = GAME_CONFIG.map((g) => g.id).filter(Boolean);
    baseline = await getOrBuildBaseline(slugs, BASELINE_DAYS, BASELINE_BUCKET_MS);
    baselineEntry = baseline?.buckets?.find((b) => b.bucket === baselineBucket) ?? null;
  } catch {
    baseline = null;
  }

  return resJSON({
    ok: true,
    items,
    fetchedAt: newestTs ? new Date(newestTs).toISOString() : lobby?.createdAt ?? null,
    baseline: {
      bucket: baselineBucket,
      bucketMs: BASELINE_BUCKET_MS,
      days: BASELINE_DAYS,
      avg: baselineEntry?.avg ?? null,
      samples: baselineEntry?.samples ?? null,
      computedAt: baseline?.computedAt ?? null,
      source: baseline?.source ?? null,
    },
  });
}
