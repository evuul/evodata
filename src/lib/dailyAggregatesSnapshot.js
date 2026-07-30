// Serializes daily aggregate maps for compact materialized Redis snapshots.

export function serializeDailyAggregates(map) {
  const output = {};
  for (const [slug, dateMap] of map?.entries?.() ?? []) {
    output[slug] = Array.from(dateMap?.entries?.() ?? []).map(([date, entry]) => ({
      date,
      sum: entry?.sum ?? 0,
      count: entry?.count ?? 0,
      max: entry?.max ?? null,
      maxTs: entry?.maxTs ?? null,
      latestValue: entry?.latestValue ?? null,
      latestTs: entry?.latestTs ?? null,
    }));
  }
  return output;
}

export function deserializeDailyAggregates(value) {
  const map = new Map();
  const entries = value && typeof value === "object" ? Object.entries(value) : [];

  for (const [slug, rows] of entries) {
    const dateMap = new Map();
    for (const row of Array.isArray(rows) ? rows : []) {
      if (!row?.date) continue;
      dateMap.set(row.date, {
        sum: Number(row.sum) || 0,
        count: Number(row.count) || 0,
        max: row.max != null && Number.isFinite(Number(row.max)) ? Number(row.max) : null,
        maxTs: row.maxTs != null && Number.isFinite(Number(row.maxTs)) ? Number(row.maxTs) : null,
        latestValue:
          row.latestValue != null && Number.isFinite(Number(row.latestValue))
            ? Number(row.latestValue)
            : null,
        latestTs:
          row.latestTs != null && Number.isFinite(Number(row.latestTs)) ? Number(row.latestTs) : null,
      });
    }
    map.set(slug, dateMap);
  }

  return map;
}
