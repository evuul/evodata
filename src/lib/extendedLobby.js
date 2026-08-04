// Builds the private Extended lobby response from the latest recovery sample.

const normalizeGame = (game) => {
  const id = String(game?.id || "").trim();
  const name = String(game?.name || "").replace(/\s+/g, " ").trim();
  const players = Number(game?.players);
  if (!id || !name || !Number.isFinite(players) || players < 0) return null;
  return { id, name, players: Math.round(players) };
};

export function buildExtendedLobbyPayload(sample) {
  const games = (Array.isArray(sample?.games) ? sample.games : [])
    .map(normalizeGame)
    .filter(Boolean);
  return {
    updatedAt: typeof sample?.collectedAt === "string" ? sample.collectedAt : null,
    games,
    summary: {
      games: games.length,
      players: games.reduce((sum, game) => sum + game.players, 0),
    },
  };
}
