// Combines persisted lobby overview snapshots without rebuilding raw player samples.

const normalizeDate = (value) => String(value || "").slice(0, 10);

function mergeDatedRows(olderRows, newerRows, limit) {
  const byDate = new Map();
  for (const rows of [olderRows, newerRows]) {
    for (const row of Array.isArray(rows) ? rows : []) {
      const date = normalizeDate(row?.date ?? row?.Datum);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      byDate.set(date, { ...row, date });
    }
  }
  return Array.from(byDate.values())
    .sort((left, right) => left.date.localeCompare(right.date))
    .slice(-Math.max(1, Number(limit) || 1));
}

function mergeSlugDaily(older, newer, limit) {
  const slugs = new Set([
    ...Object.keys(older && typeof older === "object" ? older : {}),
    ...Object.keys(newer && typeof newer === "object" ? newer : {}),
  ]);
  return Object.fromEntries(
    Array.from(slugs).map((slug) => [slug, mergeDatedRows(older?.[slug], newer?.[slug], limit)])
  );
}

function buildSlugAverages(slugDaily) {
  return Object.entries(slugDaily || {}).map(([slug, rows]) => {
    const values = (Array.isArray(rows) ? rows : [])
      .map((row) => Number(row?.avg ?? row?.avgPlayers ?? row?.players))
      .filter(Number.isFinite);
    return {
      slug,
      avgPlayers: values.length
        ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100
        : null,
    };
  });
}

function buildTrendDelta(rows) {
  if (!Array.isArray(rows) || rows.length < 2) return null;
  const first = rows[0];
  const last = rows[rows.length - 1];
  const startValue = Number(first?.avgPlayers);
  const endValue = Number(last?.avgPlayers);
  if (!Number.isFinite(startValue) || !Number.isFinite(endValue)) return null;
  return {
    start: { date: first.date, value: startValue },
    end: { date: last.date, value: endValue },
    absolute: Math.round((endValue - startValue) * 100) / 100,
    percent: startValue !== 0
      ? Math.round(((endValue - startValue) / startValue) * 10000) / 100
      : null,
  };
}

function pickHigherPeak(older, newer) {
  const olderValue = Number(older?.value);
  const newerValue = Number(newer?.value);
  if (!Number.isFinite(olderValue)) return newer ?? null;
  if (!Number.isFinite(newerValue)) return older ?? null;
  return newerValue >= olderValue ? newer : older;
}

export function composeLobbyOverviewSnapshots(older, newer, targetDays) {
  if (!older || typeof older !== "object") return newer ?? null;
  if (!newer || typeof newer !== "object") return older;

  const dailyTotals = mergeDatedRows(older.dailyTotals, newer.dailyTotals, targetDays);
  const rawDailyTotals = mergeDatedRows(
    older.rawDailyTotals ?? older.dailyTotals,
    newer.rawDailyTotals ?? newer.dailyTotals,
    targetDays
  );
  const adjustedDailyTotals = mergeDatedRows(
    older.adjustedDailyTotals ?? older.dailyTotals,
    newer.adjustedDailyTotals ?? newer.dailyTotals,
    targetDays
  );
  const forecastDailyTotals = mergeDatedRows(older.forecastDailyTotals, newer.forecastDailyTotals, targetDays);
  const slugDaily = mergeSlugDaily(older.slugDaily, newer.slugDaily, targetDays);
  const rawSlugDaily = mergeSlugDaily(
    older.rawSlugDaily ?? older.slugDaily,
    newer.rawSlugDaily ?? newer.slugDaily,
    targetDays
  );

  return {
    ...older,
    ...newer,
    dailyTotals,
    rawDailyTotals,
    adjustedDailyTotals,
    forecastDailyTotals,
    slugDaily,
    rawSlugDaily,
    slugAverages: buildSlugAverages(slugDaily),
    ath: pickHigherPeak(older.ath, newer.ath),
    trendDelta: buildTrendDelta(dailyTotals),
    rawTrendDelta: buildTrendDelta(rawDailyTotals),
    estimatedDates: Array.from(new Set([
      ...(Array.isArray(older.estimatedDates) ? older.estimatedDates : []),
      ...(Array.isArray(newer.estimatedDates) ? newer.estimatedDates : []),
    ])).sort(),
  };
}

export function appendDailyAggregateDateToOverview(
  overview,
  dailyAggregates,
  targetDate,
  targetDays,
  forecastGameIds = new Set()
) {
  if (!overview || !dailyAggregates || typeof dailyAggregates.entries !== "function") {
    return overview;
  }

  const slugDaily = {};
  const rawSlugDaily = {};
  let total = 0;
  let forecastTotal = 0;
  let games = 0;

  for (const [slug, dateMap] of dailyAggregates.entries()) {
    const entry = dateMap?.get?.(targetDate);
    const sum = Number(entry?.sum);
    const count = Number(entry?.count);
    if (!Number.isFinite(sum) || !Number.isFinite(count) || count <= 0) continue;
    const avg = Math.round((sum / count) * 100) / 100;
    slugDaily[slug] = [{ date: targetDate, avg }];
    rawSlugDaily[slug] = [{ date: targetDate, avg }];
    total += avg;
    if (forecastGameIds?.has?.(slug)) forecastTotal += avg;
    games += 1;
  }

  if (!games) return overview;
  const avgPlayers = Math.round(total * 100) / 100;
  const incoming = {
    dailyTotals: [{ date: targetDate, avgPlayers }],
    rawDailyTotals: [{ date: targetDate, avgPlayers }],
    adjustedDailyTotals: [{ date: targetDate, avgPlayers }],
    forecastDailyTotals: forecastTotal > 0
      ? [{ date: targetDate, avgPlayers: Math.round(forecastTotal * 100) / 100 }]
      : [],
    slugDaily,
    rawSlugDaily,
    generatedAt: new Date().toISOString(),
  };
  return composeLobbyOverviewSnapshots(overview, incoming, targetDays);
}
