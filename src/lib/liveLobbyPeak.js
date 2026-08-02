// Derives a persistable lobby total from the same fresh, non-stuck rows shown to users.

const toFiniteNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export function summarizeObservedLobby(items) {
  let totalPlayers = 0;
  let newestTimestamp = Number.NEGATIVE_INFINITY;
  let includedGames = 0;

  for (const item of Array.isArray(items) ? items : []) {
    const players = toFiniteNumber(item?.players);
    const timestamp = Date.parse(String(item?.fetchedAt || ""));
    if (item?.stuck || item?.stale || players == null || players < 0 || !Number.isFinite(timestamp)) continue;

    totalPlayers += players;
    newestTimestamp = Math.max(newestTimestamp, timestamp);
    includedGames += 1;
  }

  return {
    totalPlayers: includedGames > 0 ? Math.round(totalPlayers) : null,
    measuredAt: Number.isFinite(newestTimestamp) ? new Date(newestTimestamp).toISOString() : null,
    includedGames,
  };
}
