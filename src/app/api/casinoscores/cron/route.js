// Runs the authenticated bulk player refresh and materializes read-optimized snapshots.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

import { requireCronAuth, resolveCronSecret } from "@/lib/cronAuth";
import {
  getGlobalLobbyAth,
  getLatestPlayersSnapshot,
  getSeriesBulk,
  maybeUpdateDailyLobbyPeak,
  setGlobalLobbyAth,
  setLatestPlayersSnapshot,
  saveSample,
  updateGameAthSnapshot,
} from "@/lib/csStore";
import { computeTrailingStuckMeta, continueKnownStuckMeta } from "@/lib/stuckGames";
import { shouldSkipPrimaryLobbyRefresh } from "@/lib/upstashCostPolicy";
import { GAMES as GAME_CONFIG, PRIMARY_TRACKED_GAMES } from "@/config/games";
import { buildLiveLobbyItems, fetchLiveLobbyCounts } from "@/lib/csLobbySource";
import { getLatestUnibetPilotSample } from "@/lib/unibetPilotStore";
import { partitionPrimarySeriesItems } from "@/lib/unibetRecoveryPersistence";
import { summarizeObservedLobby } from "@/lib/liveLobbyPeak";
import { saveHourlyLobbyObservation } from "@/lib/hourlyLobbyStore";
import { saveHourlyGameObservations } from "@/lib/hourlyLobbyGameStore";
import { validHourlyPlayers } from "@/lib/hourlyLobbyPolicy";
import { HOURLY_LOBBY_COHORT } from "@/config/hourlyLobbyCohort";
import {
  finiteNumberOrNull,
  isPlayerSampleFresh,
  LIVE_PLAYER_FRESHNESS_MS,
} from "@/lib/livePlayerSnapshot";

const SECRET = resolveCronSecret(process.env.CASINOSCORES_CRON_SECRET, process.env.CRON_SECRET);
const STUCK_LOOKBACK_DAYS = 2;
const STUCK_RECENT_SAMPLE_LIMIT = 32;
const STUCK_MIN_RUN = 4;
const STUCK_MIN_DAYS = 0;
const CRON_MIN_INTERVAL_MS = (() => {
  const configured = Number(process.env.CS_CRON_MIN_INTERVAL_MS);
  if (!Number.isFinite(configured) || configured <= 0) return 8 * 60 * 1000;
  return Math.min(Math.max(configured, 60 * 1000), 60 * 60 * 1000);
})();

const SAMPLE_WRITE_CONCURRENCY = 6;

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });
}

async function saveSamples(items) {
  let cursor = 0;
  let saved = 0;
  const workers = Array.from({ length: Math.min(SAMPLE_WRITE_CONCURRENCY, items.length) }, async () => {
    while (cursor < items.length) {
      const item = items[cursor++];
      try {
        await saveSample(item.id, item.fetchedAt, item.players);
        saved += 1;
      } catch {
        // A single series write must not block the latest lobby snapshot.
      }
    }
  });
  await Promise.all(workers);
  return saved;
}

async function runCron(req) {
  const auth = requireCronAuth(req, SECRET, "CASINOSCORES_CRON_SECRET is not configured");
  if (!auth.ok) {
    return json({ ok: false, error: auth.error }, auth.status, {
      "WWW-Authenticate": auth.status === 401 ? "Bearer" : undefined,
    });
  }

  const previousSnapshot = await getLatestPlayersSnapshot().catch(() => null);
  if (shouldSkipPrimaryLobbyRefresh({
    snapshot: previousSnapshot,
    minIntervalMs: CRON_MIN_INTERVAL_MS,
  })) {
    return json({
      ok: true,
      skipped: true,
      reason: "Refresh interval has not elapsed",
      materializedAt: previousSnapshot.materializedAt,
      minIntervalMs: CRON_MIN_INTERVAL_MS,
    });
  }

  let sourceError = null;
  let liveItems = [];
  try {
    const lobby = await fetchLiveLobbyCounts({ force: true });
    liveItems = buildLiveLobbyItems(lobby, PRIMARY_TRACKED_GAMES);
  } catch (error) {
    sourceError = error instanceof Error ? error.message : String(error);
  }

  const successfulItems = liveItems
    .filter((item) => item?.id && validHourlyPlayers(item.players) != null
      && isPlayerSampleFresh(item.fetchedAt, { maxAgeMs: LIVE_PLAYER_FRESHNESS_MS }))
    .map((item) => ({ id: item.id, players: Number(item.players), fetchedAt: item.fetchedAt }));
  const results = PRIMARY_TRACKED_GAMES.map((game) => {
    const item = liveItems.find((candidate) => candidate.id === game.id);
    const ok = successfulItems.some((candidate) => candidate.id === game.id);
    return {
      slug: game.apiSlug,
      variant: game.apiVariant === "a" ? "a" : "default",
      status: ok ? 200 : 503,
      ok,
      players: item?.players ?? null,
      fetchedAt: item?.fetchedAt ?? null,
      error: ok ? undefined : sourceError ? "Lobby source unavailable" : "No fresh lobby value",
    };
  });
  const fetched = successfulItems.length;
  let saved = 0;
  let recoveryDeferred = 0;
  let hourly = { saved: false, reason: "no-fresh-lobby" };

  if (successfulItems.length) {
    let primarySamples = successfulItems;
    try {
      const latestPilotSample = await getLatestUnibetPilotSample();
      const partitioned = partitionPrimarySeriesItems(
        successfulItems,
        previousSnapshot?.items,
        latestPilotSample
      );
      primarySamples = partitioned.primary;
      recoveryDeferred = partitioned.deferred.length;
    } catch {
      // Preserve the primary-feed write path when recovery state is unavailable.
    }
    saved = await saveSamples(primarySamples);

    const ids = GAME_CONFIG.map((game) => game.id).filter(Boolean);
    const seriesMap = await getSeriesBulk(ids, STUCK_LOOKBACK_DAYS, {
      maxSamplesPerSeries: STUCK_RECENT_SAMPLE_LIMIT,
    }).catch(() => new Map());
    const previousById = new Map(
      Array.isArray(previousSnapshot?.items)
        ? previousSnapshot.items.filter((item) => item?.id).map((item) => [item.id, item])
        : []
    );
    const freshById = new Map(successfulItems.map((item) => [item.id, item]));

    const snapshotNow = Date.now();
    const snapshotItems = ids.map((id) => {
      const latestSeriesSample = seriesMap.get(id)?.at(-1);
      const seriesPlayers = finiteNumberOrNull(latestSeriesSample?.value);
      const seriesItem = seriesPlayers != null
        && Number.isFinite(Number(latestSeriesSample?.ts))
        ? {
            id,
            players: seriesPlayers,
            fetchedAt: new Date(Number(latestSeriesSample.ts)).toISOString(),
          }
        : null;
      const item = freshById.get(id) ?? seriesItem ?? previousById.get(id) ?? { id, players: null, fetchedAt: null };
      const stuck =
        computeTrailingStuckMeta(seriesMap.get(id) ?? [], {
          minRun: STUCK_MIN_RUN,
          minDays: STUCK_MIN_DAYS,
        }) ??
        continueKnownStuckMeta(previousById.get(id), item);
      return {
        id,
        players: finiteNumberOrNull(item.players),
        fetchedAt: item.fetchedAt ?? null,
        stale: !isPlayerSampleFresh(item.fetchedAt, {
          now: snapshotNow,
          maxAgeMs: LIVE_PLAYER_FRESHNESS_MS,
        }),
        stuck: Boolean(stuck),
        stuckDays: stuck?.stuckDays ?? null,
        stuckSince: stuck?.stuckSince ?? null,
        stuckLatestAt: stuck?.stuckLatestAt ?? null,
        stuckValue: stuck?.stuckValue ?? null,
        stuckRunLength: stuck?.stuckRunLength ?? 0,
      };
    });
    const updatedAt = successfulItems
      .map((item) => item.fetchedAt)
      .filter(Boolean)
      .sort()
      .at(-1) ?? new Date().toISOString();

    const materializedAt = new Date().toISOString();
    const qualityVerified = HOURLY_LOBBY_COHORT.gameIds.every((id) => (seriesMap.get(id)?.length ?? 0) >= STUCK_MIN_RUN);
    const observedLobby = summarizeObservedLobby(snapshotItems);
    await Promise.all([
      setLatestPlayersSnapshot({ items: snapshotItems, updatedAt, materializedAt, primaryMaterializedAt: materializedAt, hourlyQualityVerified: qualityVerified }),
      updateGameAthSnapshot(successfulItems, updatedAt),
    ]);
    try {
      const candidates = await saveHourlyGameObservations(snapshotItems.map((item) => ({
        ...item, qualityVerified: (seriesMap.get(item.id)?.length ?? 0) >= STUCK_MIN_RUN,
      })), { source: "primary" });
      hourly = qualityVerified
        ? await saveHourlyLobbyObservation(snapshotItems)
        : { saved: false, reason: "insufficient-quality-history" };
      hourly.candidates = candidates;
    } catch {
      hourly = { saved: false, reason: "storage-unavailable" };
    }

    const newestTimestamp = Date.parse(observedLobby.measuredAt);
    if (observedLobby.totalPlayers != null && Number.isFinite(newestTimestamp)) {
      try {
        const updatedPeak = await maybeUpdateDailyLobbyPeak(observedLobby.totalPlayers, newestTimestamp);
        const existingAth = await getGlobalLobbyAth();
        if (!Number.isFinite(Number(existingAth?.value)) || observedLobby.totalPlayers > Number(existingAth.value)) {
          await setGlobalLobbyAth({
            value: observedLobby.totalPlayers,
            date: updatedPeak?.date ?? observedLobby.measuredAt.slice(0, 10),
            at: observedLobby.measuredAt,
          });
        }
      } catch {
        // Snapshot freshness is more important than optional peak metadata.
      }
    }
  }

  return json({
    ok: fetched > 0,
    complete: fetched === results.length,
    fetched,
    saved,
    recoveryDeferred,
    hourly,
    total: results.length,
    results,
    timestamp: new Date().toISOString(),
  }, fetched > 0 ? 200 : 502);
}

export async function POST(req) {
  return runCron(req);
}

export async function GET(req) {
  return runCron(req);
}
