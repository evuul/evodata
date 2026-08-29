// Builds and incrementally refreshes the materialized hourly lobby baseline.

import { GAMES as GAME_CONFIG } from "../config/games.js";
import {
  computeBaselineFromSeries,
  getBaselineSnapshot,
  getSeriesBulk,
  setBaselineSnapshot,
} from "./csStore.js";

export const HOURLY_BASELINE_DAYS = 14;
export const HOURLY_BASELINE_BUCKET_MS = 5 * 60 * 1000;
export const HOURLY_BASELINE_CHUNK_SIZE = 5;
const HOURLY_BASELINE_MAX_SAMPLES_PER_SERIES = 2_200;
const HOURLY_BASELINE_CACHE_TTL_MS = 48 * 60 * 60 * 1000;
const HOURLY_MIN_SAMPLES_PER_GAME_HOUR = 10;

const STOCKHOLM_HOUR = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Stockholm",
  hour: "2-digit",
  hour12: false,
});

const finitePositive = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const gameIds = () => GAME_CONFIG.map((game) => game.id).filter(Boolean);

const isEligibleHourlyRow = (row) =>
  finitePositive(row?.avg) != null
  && Number.isFinite(Number(row?.samples))
  && Number(row.samples) >= HOURLY_MIN_SAMPLES_PER_GAME_HOUR;

export function mergeHourlyBaselineBatch({ existing, computed, selectedGameIds, allGameIds, now = new Date() }) {
  const previous = existing && typeof existing === "object" ? existing : {};
  const healthyHourlyBySlug = {
    ...(previous.healthyHourlyBySlug && typeof previous.healthyHourlyBySlug === "object"
      ? previous.healthyHourlyBySlug
      : {}),
  };
  const computedBySlug = computed?.healthyHourlyBySlug && typeof computed.healthyHourlyBySlug === "object"
    ? computed.healthyHourlyBySlug
    : {};

  for (const id of selectedGameIds) {
    const rows = Array.isArray(computedBySlug[id]) ? computedBySlug[id] : [];
    if (rows.length) healthyHourlyBySlug[id] = rows;
  }

  const processedGameIds = new Set(Array.isArray(previous.processedGameIds) ? previous.processedGameIds : []);
  selectedGameIds.forEach((id) => processedGameIds.add(id));
  const totalGames = allGameIds.length;
  const previousCursor = Number.isFinite(Number(previous.nextCursor)) ? Number(previous.nextCursor) : 0;
  const nextCursor = totalGames > 0 ? (previousCursor + selectedGameIds.length) % totalGames : 0;

  return {
    healthyHourlyBySlug,
    processedGameIds: [...processedGameIds].filter((id) => allGameIds.includes(id)),
    processedGames: [...processedGameIds].filter((id) => allGameIds.includes(id)).length,
    totalGames,
    isComplete: allGameIds.length > 0 && allGameIds.every((id) => processedGameIds.has(id)),
    nextCursor,
    lastBatchGameIds: selectedGameIds,
    bucketMs: HOURLY_BASELINE_BUCKET_MS,
    days: HOURLY_BASELINE_DAYS,
    distinctDays: Math.max(Number(previous.distinctDays) || 0, Number(computed?.distinctDays) || 0),
    computedAt: now.toISOString(),
    source: "healthy-game-hourly-incremental-v1",
  };
}

export function stockholmHourLabel(now = new Date()) {
  try {
    return STOCKHOLM_HOUR.format(now);
  } catch {
    return String(now.getUTCHours()).padStart(2, "0");
  }
}

export function computeHourBaseline(baseline, hour) {
  const buckets = Array.isArray(baseline?.buckets) ? baseline.buckets : [];
  const sameHour = buckets.filter((row) => String(row?.bucket || "").startsWith(`${hour}:`));
  const minimumSamples = Math.max(6, Math.floor(HOURLY_BASELINE_DAYS * 0.25));
  const eligible = sameHour
    .map((row) => ({ avg: finitePositive(row?.avg), samples: finitePositive(row?.samples) }))
    .filter((row) => row.avg != null && row.samples != null && row.samples >= minimumSamples);

  if (!eligible.length) return { hour, baselineAvg: null, samples: 0 };

  const weightedCount = eligible.reduce((sum, row) => sum + row.samples, 0);
  const weightedSum = eligible.reduce((sum, row) => sum + row.avg * row.samples, 0);
  const mean = weightedCount > 0 ? weightedSum / weightedCount : null;
  const values = eligible.map((row) => row.avg).sort((a, b) => a - b);
  const middle = Math.floor(values.length / 2);
  const median = values.length % 2 === 0
    ? (values[middle - 1] + values[middle]) / 2
    : values[middle];
  const meanToMedianRatio = finitePositive(mean) && finitePositive(median)
    ? mean / median
    : 1;
  const resolved = meanToMedianRatio > 1.35 ? median : mean;

  return {
    hour,
    baselineAvg: finitePositive(resolved) == null ? null : Math.round(resolved),
    samples: Math.round(weightedCount),
  };
}

export function buildHourlyLobbyPayload({ baseline, latestSnapshot, now = new Date() }) {
  const latestItems = Array.isArray(latestSnapshot?.items) ? latestSnapshot.items : [];
  const healthyHourlyBySlug = baseline?.healthyHourlyBySlug && typeof baseline.healthyHourlyBySlug === "object"
    ? baseline.healthyHourlyBySlug
    : {};
  const currentHealthyItems = latestItems.filter((item) => {
    const players = finitePositive(item?.players);
    return players != null && !item?.stuck && !item?.stale;
  });
  const currentHour = stockholmHourLabel(now);
  const comparableGameIds = new Set();
  const hourlyByHour = Array.from({ length: 24 }, (_, index) => {
    const hour = String(index).padStart(2, "0");
    const comparableItems = currentHealthyItems.flatMap((item) => {
      const baselineRow = healthyHourlyBySlug[String(item?.id)]
        ?.find((row) => row?.hour === hour);
      return isEligibleHourlyRow(baselineRow) ? [{ item, baselineRow }] : [];
    });
    comparableItems.forEach(({ item }) => comparableGameIds.add(String(item.id)));
    const baselineAvg = comparableItems.length
      ? comparableItems.reduce((sum, { baselineRow }) => sum + Number(baselineRow.avg), 0)
      : null;
    const currentTotal = comparableItems.length
      ? comparableItems.reduce((sum, { item }) => sum + Number(item.players), 0)
      : null;
    const samples = comparableItems.reduce(
      (sum, { baselineRow }) => sum + Number(baselineRow.samples),
      0
    );
    const deltaPct = currentTotal != null && baselineAvg != null
      ? ((currentTotal - baselineAvg) / baselineAvg) * 100
      : null;

    return {
      hour,
      baselineAvg: baselineAvg == null ? null : Math.round(baselineAvg),
      currentTotal,
      deltaPct: Number.isFinite(deltaPct) ? Math.round(deltaPct * 10) / 10 : null,
      samples: Number.isFinite(samples) ? Math.round(samples) : 0,
      comparableGames: comparableItems.length,
      isCurrentHour: hour === currentHour,
    };
  });
  const hourlyComparison = hourlyByHour.find((row) => row.isCurrentHour && row.baselineAvg != null) ?? null;

  return {
    hourlyComparison,
    hourlyByHour,
    coverage: {
      requestedDays: HOURLY_BASELINE_DAYS,
      distinctDays: Number.isFinite(Number(baseline?.distinctDays))
        ? Math.round(Number(baseline.distinctDays))
        : null,
      samples: Number.isFinite(Number(baseline?.samples))
        ? Math.round(Number(baseline.samples))
        : null,
      computedAt: baseline?.computedAt ?? null,
      source: "healthy-game-baseline-v1",
      trackedGames: latestItems.length,
      healthyGames: currentHealthyItems.length,
      comparableGames: comparableGameIds.size,
    },
    liveUpdatedAt: latestSnapshot?.updatedAt ?? null,
  };
}

export async function loadHourlyLobbyBaseline() {
  const allGameIds = gameIds();
  if (!allGameIds.length) return null;
  const existing = await getCachedHourlyLobbyBaseline();
  const cursor = Number.isFinite(Number(existing?.nextCursor))
    ? Math.max(0, Math.floor(Number(existing.nextCursor))) % allGameIds.length
    : 0;
  const selectedGameIds = Array.from(
    { length: Math.min(HOURLY_BASELINE_CHUNK_SIZE, allGameIds.length) },
    (_, index) => allGameIds[(cursor + index) % allGameIds.length]
  );
  const seriesMap = await getSeriesBulk(selectedGameIds, HOURLY_BASELINE_DAYS, {
    maxSamplesPerSeries: HOURLY_BASELINE_MAX_SAMPLES_PER_SERIES,
  });
  const computed = computeBaselineFromSeries(
    seriesMap,
    HOURLY_BASELINE_DAYS,
    HOURLY_BASELINE_BUCKET_MS
  );
  const merged = mergeHourlyBaselineBatch({
    existing,
    computed,
    selectedGameIds,
    allGameIds,
  });
  await setBaselineSnapshot(
    HOURLY_BASELINE_DAYS,
    HOURLY_BASELINE_BUCKET_MS,
    merged,
    HOURLY_BASELINE_CACHE_TTL_MS
  );
  return merged;
}

export function getCachedHourlyLobbyBaseline() {
  return getBaselineSnapshot(HOURLY_BASELINE_DAYS, HOURLY_BASELINE_BUCKET_MS);
}
