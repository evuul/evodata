// Applies a fresh Unibet value only when the primary game feed is marked as stuck.

export const UNIBET_PILOT_MAX_AGE_MS = 25 * 60 * 1000;

const GAME_ID_ALIASES = Object.freeze({
  "fan-tan-live": "fan-tan",
});

const toFinitePlayers = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : null;
};

export function isFreshUnibetPilotSample(sample, { now = Date.now(), maxAgeMs = UNIBET_PILOT_MAX_AGE_MS } = {}) {
  if (sample?.status !== "ok" || !Array.isArray(sample?.games)) return false;
  const collectedAt = Date.parse(String(sample?.collectedAt || ""));
  if (!Number.isFinite(collectedAt)) return false;
  return collectedAt <= now + 5 * 60 * 1000 && now - collectedAt <= maxAgeMs;
}

export function applyUnibetPilotFallback(items, sample, options = {}) {
  if (!isFreshUnibetPilotSample(sample, options)) {
    return { items: Array.isArray(items) ? items : [], applied: [] };
  }

  const gamesById = new Map(
    sample.games
      .map((game) => [String(game?.id || ""), toFinitePlayers(game?.players)])
      .filter(([id, players]) => id && players != null)
  );
  const applied = [];
  const resolvedItems = (Array.isArray(items) ? items : []).map((item) => {
    if (!item?.stuck) return item;

    const pilotId = GAME_ID_ALIASES[item.id] || item.id;
    const players = gamesById.get(pilotId);
    if (players == null) return item;

    applied.push({ id: item.id, players, fetchedAt: sample.collectedAt });
    return {
      ...item,
      players,
      fetchedAt: sample.collectedAt,
      stale: false,
      stuck: false,
    };
  });

  return { items: resolvedItems, applied };
}
