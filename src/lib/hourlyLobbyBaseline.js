// Materializes the fixed-cohort hourly baseline once per completed Stockholm day.

import { buildExpandingHourlyBaseline } from "./hourlyLobbyExpansion.js";
import { publishedHourlyCohort } from "./hourlyLobbyCohortSelection.js";
import { getHourlyGameObservations } from "./hourlyLobbyGameStore.js";
import { HOURLY_LOBBY_COHORT } from "../config/hourlyLobbyCohort.js";
import { hourlyArchiveObservations, loadHourlyHistoryArchive } from "./hourlyLobbyHistoryArchive.js";
import { hourlyWindow } from "./hourlyLobbyPolicy.js";
import { getHourlyLobbyObservations, getStoredHourlyBaseline, setStoredHourlyBaseline } from "./hourlyLobbyStore.js";

export function shouldReuseHourlyLobbyBaseline(baseline, now = Date.now()) {
  return Boolean(publishedHourlyCohort(baseline)) && baseline.expansion?.version === 1
    && baseline.period?.endDay === hourlyWindow(now).endDay;
}

export async function loadHourlyLobbyBaseline({
  now = Date.now(), force = false,
  getBaseline = getStoredHourlyBaseline,
  getObservations = getHourlyLobbyObservations,
  setBaseline = setStoredHourlyBaseline,
  getHistory = loadHourlyHistoryArchive,
  getGameObservations = getHourlyGameObservations,
} = {}) {
  const existing = await getBaseline();
  if (!force && shouldReuseHourlyLobbyBaseline(existing, now)) return existing;
  // A failed read throws before the last successful materialization is touched.
  const observations = await getObservations({ now });
  const history = await getHistory({ now });
  const archived = history ? hourlyArchiveObservations(history) : [];
  const gameObservations = await getGameObservations({ now });
  const baseline = buildExpandingHourlyBaseline({ observations: [...archived, ...observations], gameObservations, previous: existing, now });
  baseline.history = history && baseline.cohort.gameIds.length === HOURLY_LOBBY_COHORT.gameIds.length
    ? { ...history.coverage, importedAt: history.importedAt } : null;
  if (await setBaseline(baseline) === false) return getBaseline();
  return baseline;
}

export const getCachedHourlyLobbyBaseline = getStoredHourlyBaseline;
