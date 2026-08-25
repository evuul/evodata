// Serves Extended lobby data only to Premium, Founder, and administrator accounts.

import { resolveRequestUser } from "@/lib/authSession";
import { hasExtendedDataAccess } from "@/lib/founderAccess";
import { PRIMARY_TRACKED_GAMES } from "@/config/games";
import { buildLiveLobbyItems, fetchLiveLobbyCounts } from "@/lib/csLobbySource";
import { getLatestPlayersSnapshot } from "@/lib/csStore";
import {
  getLatestSuccessfulUnibetPilotSample,
  getLatestUnibetPilotSample,
} from "@/lib/unibetPilotStore";
import {
  buildExtendedLobbyPayload,
  mergeExtendedLobbyPrimaryFallback,
  resolveExtendedLobbySample,
} from "@/lib/extendedLobby";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

const json = (data, status = 200) => Response.json(data, {
  status,
  headers: { "Cache-Control": "private, no-store" },
});

const PRIMARY_GAME_NAMES = new Map(PRIMARY_TRACKED_GAMES.map((game) => [game.id, game.label]));

const withPrimaryGameNames = (items) => (Array.isArray(items) ? items : []).flatMap((item) => {
  const name = PRIMARY_GAME_NAMES.get(item?.id);
  return name ? [{ ...item, name }] : [];
});

async function getPrimaryLobbyFallbackItems() {
  try {
    const lobby = await fetchLiveLobbyCounts();
    return withPrimaryGameNames(buildLiveLobbyItems(lobby, PRIMARY_TRACKED_GAMES));
  } catch {
    // The materialized snapshot is a secondary fallback when the live primary source is unavailable.
    const snapshot = await getLatestPlayersSnapshot().catch(() => null);
    return withPrimaryGameNames(snapshot?.items);
  }
}

export async function GET(request) {
  const resolved = await resolveRequestUser(request);
  if (!resolved) return json({ ok: false, error: "Unauthorized" }, 401);
  if (!hasExtendedDataAccess(resolved.user)) {
    return json({ ok: false, error: "Extended lobby access required" }, 403);
  }

  const [sample, primaryFallbackItems] = await Promise.all([
    getLatestUnibetPilotSample(),
    getPrimaryLobbyFallbackItems(),
  ]);
  const latestSuccessfulSample = sample?.status === "ok"
    ? sample
    : await getLatestSuccessfulUnibetPilotSample();
  const resolvedSample = resolveExtendedLobbySample(sample, latestSuccessfulSample);
  if (!resolvedSample) {
    return json({ ok: false, error: "Extended lobby data is temporarily unavailable" }, 503);
  }

  return json({
    ok: true,
    ...buildExtendedLobbyPayload(mergeExtendedLobbyPrimaryFallback(resolvedSample.sample, primaryFallbackItems)),
    stale: resolvedSample.stale,
    staleAgeMs: resolvedSample.staleAgeMs,
  });
}
