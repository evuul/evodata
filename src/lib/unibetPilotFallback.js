// Applies fresh Unibet values only for frozen or explicitly missing primary readings.

export const UNIBET_PILOT_MAX_AGE_MS = 25 * 60 * 1000;

const GAME_ID_ALIASES = Object.freeze({
  "fan-tan-live": "fan-tan",
  "crazy-time:a": "crazy-time-a",
  "extra-chili-epic-spins": "extra-chilli-epic-spins",
  "craps-live": "craps",
  "war-live": "war",
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

export function getUnibetPilotGameId(gameId) {
  return GAME_ID_ALIASES[gameId] || gameId;
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
    const canRepairMissingValue = options.allowMissing === true && item?.players == null;
    if (!item?.stuck && !canRepairMissingValue) return item;

    const pilotId = getUnibetPilotGameId(item.id);
    const players = gamesById.get(pilotId);
    if (players == null) return item;

    applied.push({ id: item.id, players, fetchedAt: sample.collectedAt });
    return {
      ...item,
      players,
      fetchedAt: sample.collectedAt,
      stale: false,
      stuck: false,
      stuckDays: null,
      stuckSince: null,
      stuckLatestAt: null,
      stuckValue: null,
      stuckRunLength: 0,
    };
  });

  return { items: resolvedItems, applied };
}
