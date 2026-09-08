// Builds the completed regular-lobby day from bounded persisted source reads.

import { GAMES } from "../config/games.js";
import { getSeriesBulk, getOverviewSnapshot } from "./csStore.js";
import { getUnibetPilotHistory } from "./unibetPilotStore.js";
import { buildRegularLobbyDaily, previousRegularLobbyDay } from "./regularLobbyDaily.js";
import { getRegularLobbyDailyHistory, saveRegularLobbyDailyHistory } from "./regularLobbyDailyStore.js";

export async function materializeRegularLobbyDay(date, {
  now = Date.now(), readHistory = getUnibetPilotHistory, readSeries = getSeriesBulk,
  readDays = getRegularLobbyDailyHistory, saveDays = saveRegularLobbyDailyHistory,
} = {}) {
  const existing = (await readDays()).find(record => record.date === date);
  if (existing?.complete) return { ...existing, skipped: true };
  // Each request stays below the REST response size limit; two days cover yesterday after midnight.
  const [history, series] = await Promise.all([
    readHistory(288), readSeries(GAMES.map(game => game.id), 3),
  ]);
  const record = buildRegularLobbyDaily(history, series, date, { now });
  await saveDays([record]);
  return record;
}

export async function refreshRegularLobbyDaily({
  now = Date.now(), materializeDay = materializeRegularLobbyDay, readOverview = getOverviewSnapshot,
  publishOverview = async (aggregates, date) => {
    const { materializeLobbyOverviewSnapshots } = await import("./lobbyOverviewMaterializer.js");
    return materializeLobbyOverviewSnapshots(aggregates, date);
  },
} = {}) {
  const date = previousRegularLobbyDay(now);
  const record = await materializeDay(date, { now });
  if (!record.complete) return { ok: false, date, reason: record.reason, coverage: record.coverage };
  const overview = await readOverview(30);
  const current = overview?.data?.dailyQuality?.[date];
  if (!current?.complete || current.method !== record.method) await publishOverview(new Map(), date);
  return { ok: true, date, coverage: record.coverage };
}
