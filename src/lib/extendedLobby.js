// Builds the private Extended lobby response from the latest recovery sample.

const BLACKJACK_PATTERN = /(blackjack|\bbj\b|freebet|always6|betstacker|funfun21|easybj)/i;
const POKER_PATTERN = /(poker|hold.?em|teen.?patti)/i;

const normalizeGame = (game) => {
  const id = String(game?.id || "").trim();
  const name = String(game?.name || "").replace(/\s+/g, " ").trim();
  const players = Number(game?.players);
  if (!id || !name || !Number.isFinite(players) || players < 0) return null;
  const category = game?.category === "blackjack" || game?.category === "poker"
    ? game.category
    : null;
  return { id, name, players: Math.round(players), ...(category ? { category } : {}) };
};

export function buildExtendedLobbyPayload(sample) {
  const games = (Array.isArray(sample?.games) ? sample.games : [])
    .map(normalizeGame)
    .filter(Boolean);
  const blackjack = games.filter((game) =>
    game.category === "blackjack" || BLACKJACK_PATTERN.test(`${game.id} ${game.name}`)
  );
  const poker = games.filter((game) =>
    game.category === "poker" || POKER_PATTERN.test(`${game.id} ${game.name}`)
  );
  const all = [...blackjack, ...poker];

  return {
    updatedAt: typeof sample?.collectedAt === "string" ? sample.collectedAt : null,
    categories: {
      blackjack,
      poker,
    },
    summary: {
      games: all.length,
      players: all.reduce((sum, game) => sum + game.players, 0),
      blackjackPlayers: blackjack.reduce((sum, game) => sum + game.players, 0),
      pokerPlayers: poker.reduce((sum, game) => sum + game.players, 0),
    },
  };
}
