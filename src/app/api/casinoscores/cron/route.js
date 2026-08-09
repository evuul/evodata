// Runs the authenticated bulk player refresh and materializes read-optimized snapshots.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
import { shouldSkipMaterializedRefresh } from "@/lib/upstashCostPolicy";
import { GAMES as GAME_CONFIG, PRIMARY_TRACKED_GAMES } from "@/config/games";
import { buildLiveLobbyItems, fetchLiveLobbyCounts } from "@/lib/csLobbySource";
import { getLatestUnibetPilotSample } from "@/lib/unibetPilotStore";
import { partitionPrimarySeriesItems } from "@/lib/unibetRecoveryPersistence";

const SECRET = resolveCronSecret(process.env.CASINOSCORES_CRON_SECRET, process.env.CRON_SECRET);
const STUCK_LOOKBACK_DAYS = 90;
const STUCK_MIN_RUN = 4;
const STUCK_MIN_DAYS = 0;
const CRON_MIN_INTERVAL_MS = (() => {
  const configured = Number(process.env.CS_CRON_MIN_INTERVAL_MS);
  if (!Number.isFinite(configured) || configured <= 0) return 10 * 60 * 1000;
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
  if (shouldSkipMaterializedRefresh({
    materializedAt: previousSnapshot?.materializedAt,
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
    .filter((item) => item?.id && Number.isFinite(Number(item.players)) && item.fetchedAt)
    .map((item) => ({ id: item.id, players: Number(item.players), fetchedAt: item.fetchedAt }));
  const results = PRIMARY_TRACKED_GAMES.map((game) => {
    const item = liveItems.find((candidate) => candidate.id === game.id);
    const ok = Boolean(item && Number.isFinite(Number(item.players)) && item.fetchedAt);
    return {
      slug: game.apiSlug,
      variant: game.apiVariant === "a" ? "a" : "default",
      status: ok ? 200 : 503,
      ok,
      players: item?.players ?? null,
      fetchedAt: item?.fetchedAt ?? null,
      error: ok ? undefined : sourceError || "No live lobby value",
    };
  });
  const fetched = successfulItems.length;
  let saved = 0;
  let recoveryDeferred = 0;

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
    const seriesMap = await getSeriesBulk(ids, STUCK_LOOKBACK_DAYS).catch(() => new Map());
    const previousById = new Map(
      Array.isArray(previousSnapshot?.items)
        ? previousSnapshot.items.filter((item) => item?.id).map((item) => [item.id, item])
        : []
    );
    const freshById = new Map(successfulItems.map((item) => [item.id, item]));

    const snapshotItems = ids.map((id) => {
      const item = freshById.get(id) ?? previousById.get(id) ?? { id, players: null, fetchedAt: null };
      const stuck =
        computeTrailingStuckMeta(seriesMap.get(id) ?? [], {
          minRun: STUCK_MIN_RUN,
          minDays: STUCK_MIN_DAYS,
        }) ??
        continueKnownStuckMeta(previousById.get(id), item);
      return {
        id,
        players: Number.isFinite(Number(item.players)) ? Number(item.players) : null,
        fetchedAt: item.fetchedAt ?? null,
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
    await Promise.all([
      setLatestPlayersSnapshot({ items: snapshotItems, updatedAt, materializedAt }),
      updateGameAthSnapshot(successfulItems, updatedAt),
    ]);

    const stuckIds = new Set(snapshotItems.filter((item) => item.stuck).map((item) => item.id));
    const totalPlayers = successfulItems.reduce(
      (sum, item) => (stuckIds.has(item.id) ? sum : sum + item.players),
      0
    );
    const newestTimestamp = Date.parse(updatedAt);
    if (totalPlayers > 0 && Number.isFinite(newestTimestamp)) {
      try {
        const updatedPeak = await maybeUpdateDailyLobbyPeak(totalPlayers, newestTimestamp);
        const existingAth = await getGlobalLobbyAth();
        if (!Number.isFinite(Number(existingAth?.value)) || totalPlayers > Number(existingAth.value)) {
          await setGlobalLobbyAth({
            value: totalPlayers,
            date: updatedPeak?.date ?? updatedAt.slice(0, 10),
            at: updatedAt,
          });
        }
      } catch {
        // Snapshot freshness is more important than optional peak metadata.
      }
    }
  }

  return json({
    ok: fetched === results.length,
    fetched,
    saved,
    recoveryDeferred,
    total: results.length,
    results,
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req) {
  return runCron(req);
}

export async function GET(req) {
  return runCron(req);
}
