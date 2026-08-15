// Builds the private Extended lobby response with stable game categories and totals.

const EXTENDED_LOBBY_CATEGORIES = new Set(["gameshows", "roulette", "baccarat"]);
export const EXTENDED_LOBBY_STALE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const inferCategory = (game) => {
  const category = String(game?.category || "").trim().toLowerCase();
  if (EXTENDED_LOBBY_CATEGORIES.has(category)) return category;

  const searchable = `${game?.id || ""} ${game?.name || ""}`.toLowerCase();
  if (/roulette|roulett|rulet/.test(searchable)) return "roulette";
  if (/baccarat|bac\s*bo|bacbo/.test(searchable)) return "baccarat";
  return "gameshows";
};

const normalizeGame = (game) => {
  const id = String(game?.id || "").trim();
  const name = String(game?.name || "").replace(/\s+/g, " ").trim();
  const players = Number(game?.players);
  if (!id || !name || !Number.isFinite(players) || players < 0) return null;
  return { id, name, players: Math.round(players), category: inferCategory(game) };
};

export function buildExtendedLobbyPayload(sample) {
  const games = (Array.isArray(sample?.games) ? sample.games : [])
    .map(normalizeGame)
    .filter(Boolean);
  const categories = Object.fromEntries(
    Array.from(EXTENDED_LOBBY_CATEGORIES, (category) => [category, { games: 0, players: 0 }])
  );

  for (const game of games) {
    categories[game.category].games += 1;
    categories[game.category].players += game.players;
  }

  return {
    updatedAt: typeof sample?.collectedAt === "string" ? sample.collectedAt : null,
    games,
    summary: {
      games: games.length,
      players: games.reduce((sum, game) => sum + game.players, 0),
      categories,
    },
  };
}

export function resolveExtendedLobbySample(
  latestSample,
  latestSuccessfulSample,
  { now = Date.now(), maxStaleAgeMs = EXTENDED_LOBBY_STALE_MAX_AGE_MS } = {}
) {
  if (latestSample?.status === "ok") {
    return { sample: latestSample, stale: false, staleAgeMs: 0 };
  }
  if (latestSuccessfulSample?.status !== "ok") return null;

  const collectedAt = Date.parse(String(latestSuccessfulSample.collectedAt || ""));
  const ageMs = now - collectedAt;
  if (!Number.isFinite(collectedAt) || ageMs < 0 || ageMs > maxStaleAgeMs) return null;

  return {
    sample: latestSuccessfulSample,
    stale: true,
    staleAgeMs: ageMs,
  };
}
