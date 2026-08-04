// Summarizes matching primary-feed and Unibet player values for the admin dashboard.

import { getUnibetPilotGameId, isFreshUnibetPilotSample } from "./unibetPilotFallback.js";

const toPlayers = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : null;
};

export function buildUnibetPilotComparison(snapshot, sample, options = {}) {
  if (!isFreshUnibetPilotSample(sample, options)) {
    return { available: false, matchedGames: 0, recoveredGames: 0 };
  }

  const pilotById = new Map(
    sample.games
      .map((game) => [String(game?.id || ""), toPlayers(game?.players)])
      .filter(([id, players]) => id && players != null)
  );
  const primaryItems = Array.isArray(snapshot?.items) ? snapshot.items : [];
  let primaryTotal = 0;
  let pilotTotal = 0;
  let matchedGames = 0;
  let recoveredGames = 0;

  for (const item of primaryItems) {
    const primaryPlayers = toPlayers(item?.players);
    const pilotPlayers = pilotById.get(getUnibetPilotGameId(item?.id));
    if (primaryPlayers == null || pilotPlayers == null) continue;
    matchedGames += 1;
    primaryTotal += primaryPlayers;
    pilotTotal += pilotPlayers;
    if (item?.stuck) recoveredGames += 1;
  }

  const difference = pilotTotal - primaryTotal;
  return {
    available: matchedGames > 0,
    collectedAt: sample.collectedAt,
    primaryUpdatedAt: snapshot?.updatedAt ?? null,
    matchedGames,
    recoveredGames,
    primaryTotal,
    pilotTotal,
    difference,
    differencePct: primaryTotal > 0 ? (difference / primaryTotal) * 100 : null,
  };
}
