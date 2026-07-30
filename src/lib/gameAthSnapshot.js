// Builds and incrementally updates the materialized per-game ATH snapshot.

const toFiniteNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export function computeGameAthFromDailyMap(dateMap) {
  if (!(dateMap instanceof Map) || dateMap.size === 0) return null;

  const points = [];
  for (const row of dateMap.values()) {
    const value = toFiniteNumber(row?.max);
    const timestamp = toFiniteNumber(row?.maxTs);
    if (value == null) continue;
    points.push({ value, timestamp });
  }
  if (!points.length) return null;

  points.sort((left, right) => {
    if (right.value !== left.value) return right.value - left.value;
    return (right.timestamp ?? -Infinity) - (left.timestamp ?? -Infinity);
  });

  const highest = points[0];
  const previous = points
    .filter((point) => point.timestamp != null && highest.timestamp != null && point.timestamp < highest.timestamp)
    .sort((left, right) => {
      if (right.value !== left.value) return right.value - left.value;
      return (right.timestamp ?? -Infinity) - (left.timestamp ?? -Infinity);
    })[0] ?? null;

  return {
    value: Math.round(highest.value),
    at: highest.timestamp != null ? new Date(highest.timestamp).toISOString() : null,
    previousValue: previous ? Math.round(previous.value) : null,
    previousAt: previous?.timestamp != null ? new Date(previous.timestamp).toISOString() : null,
  };
}

export function normalizeGameAthSnapshot(value) {
  if (!value || typeof value !== "object") return null;
  const rawGames = value.games && typeof value.games === "object" ? value.games : {};
  const games = {};

  for (const [slug, entry] of Object.entries(rawGames)) {
    const athValue = toFiniteNumber(entry?.value);
    if (!slug || athValue == null) continue;
    games[slug] = {
      value: Math.round(athValue),
      at: typeof entry?.at === "string" ? entry.at : null,
      previousValue: toFiniteNumber(entry?.previousValue),
      previousAt: typeof entry?.previousAt === "string" ? entry.previousAt : null,
    };
  }

  return {
    version: 1,
    source: typeof value.source === "string" ? value.source : null,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : null,
    games,
  };
}

export function buildGameAthSnapshot(dailyAggregates, slugs, updatedAt = new Date().toISOString()) {
  const games = {};
  for (const slug of Array.from(new Set(slugs || []))) {
    const ath = computeGameAthFromDailyMap(dailyAggregates?.get?.(slug));
    if (ath) games[slug] = ath;
  }
  return { version: 1, source: "daily-history", updatedAt, games };
}

export function mergeGameAthSnapshot(currentValue, items, updatedAt = new Date().toISOString()) {
  const current = normalizeGameAthSnapshot(currentValue) ?? { version: 1, updatedAt: null, games: {} };
  const games = { ...current.games };
  let changed = false;

  for (const item of items || []) {
    const slug = typeof item?.id === "string" ? item.id : "";
    const value = toFiniteNumber(item?.players);
    if (!slug || value == null) continue;

    const previous = games[slug] ?? null;
    if (previous && value <= previous.value) continue;

    games[slug] = {
      value: Math.round(value),
      at: typeof item?.fetchedAt === "string" ? item.fetchedAt : updatedAt,
      previousValue: previous?.value ?? null,
      previousAt: previous?.at ?? null,
    };
    changed = true;
  }

  return {
    changed,
    snapshot: {
      version: 1,
      source: current.source,
      updatedAt: changed ? updatedAt : current.updatedAt,
      games,
    },
  };
}
