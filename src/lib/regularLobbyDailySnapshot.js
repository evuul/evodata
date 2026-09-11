// Applies verified regular-lobby days consistently to trends, forecasts and aggregate consumers.

import { applyApprovedLobbyTrendEstimates } from "./lobbyTrendEstimates.js";
import { GAMES, FORECAST_GAME_IDS } from "../config/games.js";
import { REGULAR_LOBBY_DAILY_METHOD, regularLobbyCatalogForDate } from "./regularLobbyDaily.js";
import { composeLobbyOverviewSnapshots } from "./lobbyOverviewSnapshot.js";

export function isRegularLobbyDailyRecord(record, catalog = GAMES) {
  const ids = regularLobbyCatalogForDate(record?.date, catalog).map(game => game.id).sort();
  const validCoverage = Number.isInteger(record?.coverage?.slots) && Number.isInteger(record?.coverage?.expectedSlots)
    && [138, 144, 150].includes(record.coverage.expectedSlots)
    && record.coverage.slots >= 0 && record.coverage.slots <= record.coverage.expectedSlots
    && Array.isArray(record.coverage.missingHours);
  const validIdentity = record?.method === REGULAR_LOBBY_DAILY_METHOD
    && /^\d{4}-\d{2}-\d{2}$/.test(record.date) && Number.isFinite(Date.parse(record.computedAt))
    && JSON.stringify(record.gameIds) === JSON.stringify(ids);
  if (!validCoverage || !validIdentity) return false;
  if (record.complete === false) return record.reason === "insufficient-daily-coverage";
  return record.complete === true
    && Object.keys(record.averages ?? {}).length === ids.length
    && ids.every(id => Number.isFinite(record.averages[id]) && record.averages[id] >= 0 && record.averages[id] <= 5_000_000)
    && record.coverage.slots >= Math.ceil(record.coverage.expectedSlots * 0.9)
    && record.coverage.missingHours.length === 0;
}

export function applyRegularLobbyDailyToAggregates(aggregates, records, { catalog = GAMES } = {}) {
  const result = new Map([...aggregates].map(([id, dates]) => [id, new Map(dates)]));
  for (const record of records.filter(r => isRegularLobbyDailyRecord(r, catalog))) {
    if (!record.complete) {
      for (const dates of result.values()) dates.delete(record.date);
      continue;
    }
    for (const [id, dates] of result) {
      if (!record.gameIds.includes(id)) dates.delete(record.date);
    }
    for (const [id, average] of Object.entries(record.averages)) {
      const dates = result.get(id);
      if (!dates) continue;
      dates.set(record.date, {
        ...dates.get(record.date), sum: average * record.coverage.slots,
        count: record.coverage.slots, method: record.method,
      });
    }
  }
  return result;
}

export function applyRegularLobbyDailyToOverview(overview, records, {
  catalog = GAMES, days = 730, forecastIds = FORECAST_GAME_IDS,
} = {}) {
  if (!overview) return overview;
  let result = overview;
  const quality = { ...overview.dailyQuality };
  const correctedDates = new Set();
  for (const record of records.filter(r => isRegularLobbyDailyRecord(r, catalog)).sort((a, b) => a.date.localeCompare(b.date))) {
    quality[record.date] = { method: record.method, complete: record.complete, games: record.gameIds.length, ...record.coverage };
    correctedDates.add(record.date);
    if (!record.complete) {
      const keep = row => row.date !== record.date;
      const filterGames = values => Object.fromEntries(Object.entries(values ?? {}).map(([id, rows]) => [id, rows.filter(keep)]));
      result = {
        ...result,
        ...Object.fromEntries(["dailyTotals", "rawDailyTotals", "adjustedDailyTotals", "forecastDailyTotals"].map(key => [key, (result[key] ?? []).filter(keep)])),
        slugDaily: filterGames(result.slugDaily), rawSlugDaily: filterGames(result.rawSlugDaily),
      };
      continue;
    }
    const row = { date: record.date, avgPlayers: Math.round(Object.values(record.averages).reduce((n, avg) => n + avg, 0) * 100) / 100 };
    const slugDaily = Object.fromEntries(Object.entries(record.averages).map(([id, avg]) => [id, [{ date: record.date, avg }]]));
    const forecast = Object.entries(record.averages).filter(([id]) => forecastIds.has(id)).reduce((n, [, avg]) => n + avg, 0);
    result = composeLobbyOverviewSnapshots(result, {
      dailyTotals: [row], rawDailyTotals: [row], adjustedDailyTotals: [row], slugDaily, rawSlugDaily: slugDaily,
      forecastDailyTotals: [{ date: record.date, avgPlayers: Math.round(forecast * 100) / 100 }],
    }, days);
  }
  if (!correctedDates.size) return applyApprovedLobbyTrendEstimates(overview, { days });
  result = composeLobbyOverviewSnapshots(result, {}, days);
  const allowedByDate = new Map([...correctedDates].map(date => [
    date, new Set(regularLobbyCatalogForDate(date, catalog).map(game => game.id)),
  ]));
  const pruneUntrackedDates = values => Object.fromEntries(Object.entries(values ?? {}).map(([id, rows]) => [
    id, rows.filter(row => !correctedDates.has(row.date) || allowedByDate.get(row.date).has(id)),
  ]));
  return applyApprovedLobbyTrendEstimates({
    ...result, dailyQuality: quality,
    slugDaily: pruneUntrackedDates(result.slugDaily), rawSlugDaily: pruneUntrackedDates(result.rawSlugDaily),
    estimatedDates: (result.estimatedDates ?? []).filter(date => !correctedDates.has(date)),
    averages: { ...result.averages, days7: result.dailyTotals.slice(-7), days30: result.dailyTotals.slice(-30) },
  }, { days });
}
