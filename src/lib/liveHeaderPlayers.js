// Derived player metrics for the live header.

export const DEFAULT_GAME_COLOR = "#38bdf8";

export function buildLiveHeaderPlayerMetrics({
  playerGames,
  liveGames,
  gameColors = {},
} = {}) {
  const games = Array.isArray(playerGames) ? playerGames : [];
  const entries = liveGames && typeof liveGames === "object" ? liveGames : {};

  const rankedRows = games.map((game) => {
    const entry = entries?.[game.id] || {};
    const rawPlayers = typeof entry.players === "number" ? entry.players : null;
    const stuck = Boolean(entry.stuck);
    const players = stuck ? null : rawPlayers;

    return {
      ...game,
      players,
      updated: entry.updated ?? null,
      stuck,
      stuckDays: Number.isFinite(Number(entry.stuckDays)) ? Math.round(Number(entry.stuckDays)) : null,
      stuckSince: entry.stuckSince ?? null,
      stuckLatestAt: entry.stuckLatestAt ?? null,
      stuckValue: Number.isFinite(Number(entry.stuckValue)) ? Math.round(Number(entry.stuckValue)) : null,
      stuckRunLength: Number.isFinite(Number(entry.stuckRunLength)) ? Math.round(Number(entry.stuckRunLength)) : null,
      color: gameColors?.[game.id] || DEFAULT_GAME_COLOR,
    };
  });

  rankedRows.sort((a, b) => {
    const av = a.players;
    const bv = b.players;
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return bv - av;
  });

  let totalPlayers = 0;
  let hasPlayers = false;
  const zeroPlayerGames = [];
  let stuckLiveGamesCount = 0;
  let activeGamesCount = 0;
  let staleGamesCount = 0;

  for (const game of games) {
    const entry = entries?.[game.id] || {};
    const stuck = Boolean(entry.stuck);
    if (stuck) stuckLiveGamesCount += 1;
    if (entry.stale) staleGamesCount += 1;

    const value = stuck ? null : entry.players;
    if (Number.isFinite(value)) {
      totalPlayers += value;
      hasPlayers = true;
      activeGamesCount += 1;
    }

    if (Number(entry.players) === 0 && !entry.stale && !stuck) {
      zeroPlayerGames.push({
        id: game.id,
        label: game.label || game.id,
        players: entry.players,
        stale: Boolean(entry.stale),
        stuck,
      });
    }
  }

  const liveTotalPlayers = hasPlayers ? totalPlayers : null;
  return {
    top3: rankedRows.slice(0, 3),
    totalPlayers: liveTotalPlayers,
    playersValue: liveTotalPlayers,
    zeroPlayerGames,
    stuckLiveGamesCount,
    activeGamesCount,
    trackedGamesCount: games.length,
    staleGamesCount,
  };
}

export function buildMaintenanceWarningParts(zeroPlayerGames, maxShown = 4) {
  const labels = (Array.isArray(zeroPlayerGames) ? zeroPlayerGames : []).map((game) => String(game.label || game.id));
  if (!labels.length) return null;

  return {
    shown: labels.slice(0, maxShown).join(", "),
    moreCount: Math.max(0, labels.length - maxShown),
  };
}
