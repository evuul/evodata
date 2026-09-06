// Reconstructs historical references without treating unknown source health as verified live data.

import { HOURLY_LOBBY_COHORT } from "../config/hourlyLobbyCohort.js";
import { buildHourlyObservation, validHourlyPlayers, hourlyWindow, stockholmParts } from "./hourlyLobbyPolicy.js";

export function usableHourlySeries(points, now) {
  const values = new Map();
  const conflicts = new Set();
  for (const point of Array.isArray(points) ? points : []) {
    const value = validHourlyPlayers(point?.value);
    if (!Number.isFinite(point?.ts) || !Number.isFinite(new Date(point.ts).getTime()) || point.ts > now
        || value == null || point.stale || point.stuck) continue;
    if (values.has(point.ts) && values.get(point.ts).value !== value) conflicts.add(point.ts);
    values.set(point.ts, { ts: point.ts, value });
  }
  const sorted = [...values.values()].sort((a, b) => a.ts - b.ts);
  const rejected = new Set(conflicts);
  for (let start = 0; start < sorted.length;) {
    let end = start + 1;
    while (end < sorted.length && sorted[end].value === sorted[start].value) end++;
    if (end - start >= 4 && sorted[end - 1].ts - sorted[start].ts >= 30 * 60000) {
      for (let i = start; i < end; i++) rejected.add(sorted[i].ts);
    }
    start = end;
  }
  return new Map(sorted.filter((point) => !rejected.has(point.ts)).map((point) => [point.ts, point.value]));
}

export function auditHourlyHistory(series, { now = Date.now(), cohort = HOURLY_LOBBY_COHORT } = {}) {
  const period = hourlyWindow(now);
  const raw = cohort.gameIds.map((id) => series?.[`cs:${id}:samples`] ?? series?.[id] ?? []);
  const perGame = raw.map((points) => usableHourlySeries(points, now));
  const observations = [];
  for (const ts of perGame[0].keys()) {
    const { day } = stockholmParts(ts);
    if (day < period.startDay || day >= period.endDay || perGame.some((game) => !game.has(ts))) continue;
    const items = cohort.gameIds.map((id, index) => ({ id, players: perGame[index].get(ts), fetchedAt: new Date(ts).toISOString() }));
    const observation = buildHourlyObservation(items, { now: ts, cohort });
    if (observation) observations.push({ ...observation, quality: "reconstructed" });
  }
  observations.sort((a, b) => a.ts - b.ts);
  return {
    observations,
    provenance: "reconstructed-without-original-health-metadata",
    rawSamples: raw.reduce((sum, points) => sum + (Array.isArray(points) ? points.length : 0), 0),
    matchedObservations: observations.length,
    firstObservationAt: observations.length ? new Date(observations[0].ts).toISOString() : null,
    lastObservationAt: observations.length ? new Date(observations.at(-1).ts).toISOString() : null,
  };
}
