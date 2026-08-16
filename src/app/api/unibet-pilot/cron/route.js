// Collects Unibet recovery values and persists history only for primary-feed games marked stuck.

import { requireCronAuth, resolveCronSecret } from "@/lib/cronAuth";
import { collectUnibetPilotSample } from "@/lib/unibetPilotCollector";
import { createUnibetPilotFailure } from "@/lib/unibetPilot";
import { appendUnibetPilotSample } from "@/lib/unibetPilotStore";
import {
  getLatestPlayersSnapshot,
  saveSample,
  setLatestPlayersSnapshot,
  updateGameAthSnapshot,
} from "@/lib/csStore";
import { UNIBET_TRACKED_GAMES } from "@/config/games";
import {
  buildRecoveredLatestPlayersSnapshot,
  persistRecoverySeriesItems,
  selectUnibetRecoverySeriesItems,
} from "@/lib/unibetRecoveryPersistence";
import { selectUnibetTrackedSeriesItems } from "@/lib/unibetTrackedGames";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const SECRET = resolveCronSecret(process.env.UNIBET_PILOT_CRON_SECRET, process.env.CRON_SECRET);

const json = (data, status = 200) =>
  Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });

async function persistRecoveredGames(sample) {
  const snapshot = await getLatestPlayersSnapshot().catch(() => null);
  const recoveryItems = selectUnibetRecoverySeriesItems(snapshot?.items, sample);
  if (!recoveryItems.length) {
    return {
      matchedGames: 0,
      seriesSavedGames: 0,
      seriesSavedGameIds: [],
      seriesFailedGames: 0,
      athUpdatedGames: 0,
    };
  }

  const seriesResult = await persistRecoverySeriesItems(recoveryItems, saveSample);
  let athUpdatedGames = 0;
  try {
    await updateGameAthSnapshot(recoveryItems, sample.collectedAt);
    athUpdatedGames = recoveryItems.length;
  } catch {
    // Series persistence must remain independent from optional ATH metadata.
  }

  return {
    matchedGames: recoveryItems.length,
    seriesSavedGames: seriesResult.savedGameIds.length,
    seriesSavedGameIds: seriesResult.savedGameIds,
    seriesFailedGames: seriesResult.failedGameIds.length,
    athUpdatedGames,
  };
}

async function persistTrackedExtendedGames(sample) {
  const trackedItems = selectUnibetTrackedSeriesItems(UNIBET_TRACKED_GAMES, sample);
  if (!trackedItems.length) {
    return {
      matchedGames: 0,
      seriesSavedGames: 0,
      seriesSavedGameIds: [],
      seriesFailedGames: 0,
      athUpdatedGames: 0,
    };
  }

  const seriesResult = await persistRecoverySeriesItems(trackedItems, saveSample);
  let athUpdatedGames = 0;
  try {
    await updateGameAthSnapshot(trackedItems, sample.collectedAt);
    athUpdatedGames = trackedItems.length;
  } catch {
    // Series persistence must remain independent from optional ATH metadata.
  }

  return {
    matchedGames: trackedItems.length,
    seriesSavedGames: seriesResult.savedGameIds.length,
    seriesSavedGameIds: seriesResult.savedGameIds,
    seriesFailedGames: seriesResult.failedGameIds.length,
    athUpdatedGames,
  };
}

async function materializeRecoveredGames(sample) {
  const current = await getLatestPlayersSnapshot().catch(() => null);
  const recovered = buildRecoveredLatestPlayersSnapshot(current, sample);
  if (!recovered.snapshot || !recovered.applied.length) {
    return { updatedGames: 0, updatedGameIds: [] };
  }

  await setLatestPlayersSnapshot(recovered.snapshot);
  return {
    updatedGames: recovered.applied.length,
    updatedGameIds: recovered.applied.map((item) => item.id),
  };
}

export async function POST(request) {
  const auth = requireCronAuth(request, SECRET, "UNIBET_PILOT_CRON_SECRET is not configured");
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status);

  const startedAt = Date.now();
  try {
    const sample = await collectUnibetPilotSample();
    sample.durationMs = Date.now() - startedAt;
    const persisted = await persistRecoveredGames(sample);
    const tracked = await persistTrackedExtendedGames(sample);
    sample.seriesSavedGameIds = [...persisted.seriesSavedGameIds, ...tracked.seriesSavedGameIds];
    const materialized = await materializeRecoveredGames(sample);
    await appendUnibetPilotSample(sample);
    return json({
      ok: true,
      pilot: true,
      isolated: true,
      sample: {
        collectedAt: sample.collectedAt,
        durationMs: sample.durationMs,
        gameCount: sample.gameCount,
        totalPlayers: sample.totalPlayers,
        recovered: persisted,
        tracked,
        materialized,
      },
    });
  } catch (error) {
    const failure = createUnibetPilotFailure(error);
    failure.durationMs = Date.now() - startedAt;
    try {
      await appendUnibetPilotSample(failure);
    } catch {
      // Preserve the collector error if pilot storage is also unavailable.
    }
    return json({ ok: false, pilot: true, isolated: true, error: failure.error }, 502);
  }
}

export async function GET() {
  return json({ ok: false, error: "Method not allowed" }, 405);
}
