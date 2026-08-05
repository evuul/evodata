// Selects configured Extended Lobby games for durable player-series tracking.

const normalizePlayers = (value) => {
  const players = Number(value);
  return Number.isFinite(players) && players >= 0 ? Math.round(players) : null;
};

export function selectUnibetTrackedSeriesItems(trackedGames, sample) {
  if (sample?.status !== "ok" || !Array.isArray(sample?.games) || !sample?.collectedAt) return [];

  const playersByUnibetId = new Map(
    sample.games
      .map((game) => [String(game?.id || ""), normalizePlayers(game?.players)])
      .filter(([id, players]) => id && players != null)
  );

  return (Array.isArray(trackedGames) ? trackedGames : []).flatMap((game) => {
    const id = String(game?.id || "").trim();
    const unibetId = String(game?.unibetId || "").trim();
    const players = playersByUnibetId.get(unibetId);
    if (!id || players == null) return [];
    return [{ id, players, fetchedAt: sample.collectedAt }];
  });
}
