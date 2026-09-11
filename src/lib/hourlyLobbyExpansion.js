// Adds games only when the complete expanded selection has recent, simultaneous hourly coverage.

import { GAMES } from "../config/games.js";
import { HOURLY_LOBBY_COHORT } from "../config/hourlyLobbyCohort.js";
import { buildHourlyBaseline } from "./hourlyLobbyAggregation.js";
import { expandedHourlyCohort, publishedHourlyCohort } from "./hourlyLobbyCohortSelection.js";
import { usableHourlySeries } from "./hourlyLobbyHistoryAudit.js";
import { cohortSignature, HOURLY_SLOT_MS, HOURLY_MAX_SOURCE_SKEW_MS, validHourlyPlayers } from "./hourlyLobbyPolicy.js";

function indexGameReadings(points, now, allowed) {
  const bySource = new Map();
  const lastReading = new Map();
  for (const point of points) {
    if (!allowed.has(point?.id) || !["primary", "unibet"].includes(point.source)
        || !Number.isFinite(point.ts) || point.ts > now || validHourlyPlayers(point.value) == null) continue;
    const key = `${point.source}:${point.id}`;
    const group = bySource.get(key) ?? { id: point.id, source: point.source, points: [] };
    group.points.push(point);
    bySource.set(key, group);
  }
  const games = new Map();
  for (const { id, source, points: readings } of bySource.values()) {
    const slots = games.get(id) ?? new Map();
    // Clean each source separately: alternating recovery values must not disguise a frozen primary feed.
    const usable = source === "primary" && readings.every((point) => point.qualityVerified === true)
      ? readings.map((point) => [point.ts, point.value])
      : usableHourlySeries(readings, now);
    for (const [ts, value] of usable) {
      lastReading.set(id, Math.max(lastReading.get(id) ?? 0, ts));
      const slot = Math.floor(ts / HOURLY_SLOT_MS);
      const previous = slots.get(slot);
      if (!previous || (source === "unibet" && previous.source !== "unibet")
          || (source === previous.source && ts > previous.ts)) slots.set(slot, { ts, value, source });
    }
    games.set(id, slots);
  }
  return { games, lastReading };
}

function joinObservations(basePoints, gameIds, games, base) {
  const cohort = expandedHourlyCohort(gameIds, base);
  const signature = cohortSignature(cohort);
  const baseSignature = cohortSignature(base);
  const additions = gameIds.filter((id) => !base.gameIds.includes(id));
  if (!additions.length) return { cohort, points: basePoints };
  const points = [];
  for (const point of basePoints) {
    if (point?.signature !== baseSignature || !Number.isFinite(point.ts)
        || !Number.isFinite(point.newestTs) || !Number.isInteger(point.value)
        || point.value < 0 || point.value > base.gameIds.length * 5_000_000 || point.newestTs < point.ts) continue;
    const slot = Math.floor(point.ts / HOURLY_SLOT_MS);
    const matched = additions.map((id) => games.get(id)?.get(slot));
    if (matched.some((reading) => !reading)) continue;
    const oldestTs = Math.min(point.ts, ...matched.map((reading) => reading.ts));
    const newestTs = Math.max(point.newestTs, ...matched.map((reading) => reading.ts));
    if (newestTs - oldestTs > HOURLY_MAX_SOURCE_SKEW_MS) continue;
    points.push({ ...point, ts: oldestTs, newestTs, signature,
      value: point.value + matched.reduce((sum, reading) => sum + reading.value, 0) });
  }
  return { cohort, points };
}

function joinGameReadings(gameIds, games, base) {
  const cohort = expandedHourlyCohort(gameIds, base);
  const signature = cohortSignature(cohort);
  const anchor = games.get(gameIds[0]);
  if (!anchor) return { cohort, points: [] };
  const points = [];
  for (const [slot, anchorReading] of anchor) {
    const readings = gameIds.map((id) => games.get(id)?.get(slot));
    if (readings.some((reading) => !reading)) continue;
    const oldestTs = Math.min(...readings.map((reading) => reading.ts));
    const newestTs = Math.max(...readings.map((reading) => reading.ts));
    if (newestTs - oldestTs > HOURLY_MAX_SOURCE_SKEW_MS) continue;
    points.push({
      ts: oldestTs,
      newestTs,
      signature,
      value: readings.reduce((sum, reading) => sum + reading.value, 0),
    });
  }
  return { cohort, points };
}

export function buildExpandingHourlyBaseline({
  observations, gameObservations = [], previous, now = Date.now(), base = HOURLY_LOBBY_COHORT, catalog = GAMES,
}) {
  const { games, lastReading } = indexGameReadings(gameObservations, now, new Set(catalog.map((game) => game.id)));
  const previousCohort = publishedHourlyCohort(previous, { base, catalog });
  let selected = [...(previousCohort?.gameIds ?? base.gameIds)];
  const evaluate = (ids) => {
    const legacy = joinObservations(observations, ids, games, base);
    const native = joinGameReadings(ids, games, base);
    return buildHourlyBaseline([...legacy.points, ...native.points], { now, cohort: native.cohort });
  };
  const addedGameIds = [];
  for (const { id } of catalog) {
    if (selected.includes(id)) continue;
    const proposed = evaluate([...selected, id]);
    if (proposed.recentHours === 24) {
      selected.push(id);
      addedGameIds.push(id);
    }
  }
  const baseline = evaluate(selected);
  const waitingGames = catalog.filter(({ id }) => !selected.includes(id)).map(({ id }) => {
    const proposed = evaluate([...selected, id]);
    return {
      id, coveredHours: proposed.recentHours,
      minimumDays: Math.min(...proposed.hourlyByHour.map((row) => row.distinctDays)),
      lastReadingAt: lastReading.has(id) ? new Date(lastReading.get(id)).toISOString() : null,
    };
  });
  return {
    ...baseline,
    expansion: {
      version: 1, totalGames: catalog.length, waitingGames,
      lastChange: addedGameIds.length ? { at: new Date(now).toISOString(), addedGameIds }
        : previous?.expansion?.lastChange ?? null,
      requirements: { ...baseline.requirements, requiredHours: 24 },
    },
  };
}
