// Builds the premium hourly view from totals with an identical healthy-game universe.

import {
  getBaselineSnapshot,
  getLatestLobbyTotalSample,
  getLobbyTotalSeries,
  setBaselineSnapshot,
} from "./csStore.js";
import { summarizeObservedLobby } from "./liveLobbyPeak.js";
import { LIVE_PLAYER_FRESHNESS_MS } from "./livePlayerSnapshot.js";

export const HOURLY_BASELINE_DAYS = 60;
export const HOURLY_BASELINE_BUCKET_MS = 60 * 60 * 1000;
export const HOURLY_BASELINE_MIN_DISTINCT_DAYS = 3;
export const HOURLY_BASELINE_SOURCE = "lobby-total-hourly-v3";
const HOURLY_BASELINE_CACHE_TTL_MS = 48 * 60 * 60 * 1000;

const readyHourCount = (baseline) => {
  const explicit = Number(baseline?.readyHours);
  if (Number.isFinite(explicit)) return Math.max(0, Math.round(explicit));
  return Array.isArray(baseline?.hourlyByHour)
    ? baseline.hourlyByHour.filter((row) => finitePositive(row?.baselineAvg) != null).length
    : 0;
};

export function shouldReuseHourlyLobbyBaseline(baseline, latestSample) {
  if (baseline?.source !== HOURLY_BASELINE_SOURCE) return false;
  if (!latestSample) return readyHourCount(baseline) > 0;
  const latestTimestamp = Number(latestSample?.ts);
  const baselineTimestamp = Date.parse(String(baseline?.sourceLatestSampleAt || ""));
  return Number.isFinite(latestTimestamp)
    && Number.isFinite(baselineTimestamp)
    && baselineTimestamp >= latestTimestamp;
}

export function preferLastReadyHourlyBaseline(existing, candidate) {
  return existing?.source === HOURLY_BASELINE_SOURCE
    && readyHourCount(existing) > 0
    && readyHourCount(candidate) === 0
    ? existing
    : candidate;
}

const STOCKHOLM_HOUR = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Stockholm",
  hour: "2-digit",
  hour12: false,
});
const STOCKHOLM_DAY = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Stockholm",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const finitePositive = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const stockholmHour = (timestamp) => {
  try {
    return STOCKHOLM_HOUR.format(new Date(timestamp));
  } catch {
    return null;
  }
};

const stockholmDay = (timestamp) => {
  try {
    return STOCKHOLM_DAY.format(new Date(timestamp));
  } catch {
    return null;
  }
};

export function stockholmHourLabel(now = new Date()) {
  return stockholmHour(now) ?? String(now.getUTCHours()).padStart(2, "0");
}

function robustAverage(values) {
  const sorted = values.filter((value) => finitePositive(value) != null).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const mean = sorted.reduce((sum, value) => sum + value, 0) / sorted.length;
  const middle = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
  return mean > 0 && median > 0 && mean / median > 1.35 ? median : mean;
}

export function hourlyCoverageStage(distinctDays) {
  const days = Math.max(0, Math.round(Number(distinctDays) || 0));
  if (days < HOURLY_BASELINE_MIN_DISTINCT_DAYS) return "collecting";
  if (days < 7) return "preliminary";
  if (days < HOURLY_BASELINE_DAYS) return "building";
  return "complete";
}

export function buildHourlyBaselineFromTotalSeries(points, { days = HOURLY_BASELINE_DAYS, now = new Date() } = {}) {
  const cutoff = Number(now) - Math.max(1, Number(days) || HOURLY_BASELINE_DAYS) * 24 * 60 * 60 * 1000;
  const eligiblePoints = (Array.isArray(points) ? points : []).filter((point) => {
    return Number.isFinite(Number(point?.ts))
      && Number(point.ts) >= cutoff
      && finitePositive(point?.value) != null
      && typeof point?.universeKey === "string"
      && point.universeKey.length > 0;
  });
  const universeStats = new Map();
  for (const point of eligiblePoints) {
    const current = universeStats.get(point.universeKey) ?? {
      samples: 0,
      days: new Set(),
      latestTimestamp: Number.NEGATIVE_INFINITY,
      includedGames: null,
    };
    current.samples += 1;
    current.latestTimestamp = Math.max(current.latestTimestamp, Number(point.ts));
    const pointDay = stockholmDay(Number(point.ts));
    if (pointDay) current.days.add(pointDay);
    if (Number.isInteger(Number(point.includedGames)) && Number(point.includedGames) > 0) {
      current.includedGames = Number(point.includedGames);
    }
    universeStats.set(point.universeKey, current);
  }
  const selectedUniverse = Array.from(universeStats.entries()).sort((left, right) => {
    return right[1].days.size - left[1].days.size
      || right[1].samples - left[1].samples
      || right[1].latestTimestamp - left[1].latestTimestamp;
  })[0] ?? null;
  const universeKey = selectedUniverse?.[0] ?? null;
  const comparableGames = selectedUniverse?.[1]?.includedGames ?? null;
  const sourceLatestTimestamp = eligiblePoints.reduce(
    (latest, point) => Math.max(latest, Number(point.ts)),
    Number.NEGATIVE_INFINITY
  );
  const byHour = Array.from({ length: 24 }, () => new Map());
  const observedDays = new Set();

  for (const point of eligiblePoints) {
    if (point.universeKey !== universeKey) continue;
    const timestamp = Number(point?.ts);
    const value = finitePositive(point?.value);
    const hour = stockholmHour(timestamp);
    const day = stockholmDay(timestamp);
    const index = Number(hour);
    if (!Number.isInteger(index) || index < 0 || index > 23 || !day) continue;
    const dailyValues = byHour[index].get(day) ?? [];
    dailyValues.push(value);
    byHour[index].set(day, dailyValues);
    observedDays.add(day);
  }

  const distinctDays = observedDays.size;
  const hourlyByHour = byHour.map((entry, index) => {
    const dailyAverages = Array.from(entry.values())
      .map((values) => robustAverage(values))
      .filter((value) => finitePositive(value) != null);
    const hourDistinctDays = dailyAverages.length;
    const average = hourDistinctDays >= HOURLY_BASELINE_MIN_DISTINCT_DAYS
      ? robustAverage(dailyAverages)
      : null;
    return {
      hour: String(index).padStart(2, "0"),
      baselineAvg: average == null ? null : Math.round(average),
      samples: Array.from(entry.values()).reduce((sum, values) => sum + values.length, 0),
      distinctDays: hourDistinctDays,
      coverageStage: hourlyCoverageStage(hourDistinctDays),
    };
  });

  return {
    hourlyByHour,
    requestedDays: HOURLY_BASELINE_DAYS,
    distinctDays,
    samples: hourlyByHour.reduce((sum, row) => sum + row.samples, 0),
    minimumDistinctDays: HOURLY_BASELINE_MIN_DISTINCT_DAYS,
    readyHours: hourlyByHour.filter((row) => row.baselineAvg != null).length,
    universeKey,
    comparableGames,
    sourceLatestSampleAt: Number.isFinite(sourceLatestTimestamp)
      ? new Date(sourceLatestTimestamp).toISOString()
      : null,
    isComplete: distinctDays >= HOURLY_BASELINE_DAYS,
    computedAt: new Date(now).toISOString(),
    source: HOURLY_BASELINE_SOURCE,
  };
}

export function buildHourlyLobbyPayload({ baseline, latestSnapshot, now = new Date() }) {
  const observedLobby = summarizeObservedLobby(latestSnapshot?.items, {
    now: Number(now),
    maxAgeMs: LIVE_PLAYER_FRESHNESS_MS,
  });
  const universeMatches = Boolean(
    baseline?.universeKey
      && observedLobby.universeKey
      && baseline.universeKey === observedLobby.universeKey
  );
  const currentTotal = universeMatches ? observedLobby.totalPlayers : null;
  const currentHour = stockholmHourLabel(now);
  const baselineByHour = new Map(
    (Array.isArray(baseline?.hourlyByHour) ? baseline.hourlyByHour : [])
      .filter((row) => String(row?.hour || "").length === 2)
      .map((row) => [String(row.hour), row])
  );
  const hourlyByHour = Array.from({ length: 24 }, (_, index) => {
    const hour = String(index).padStart(2, "0");
    const row = baselineByHour.get(hour);
    const baselineAvg = finitePositive(row?.baselineAvg);
    const isCurrentHour = hour === currentHour;
    const rowCurrentTotal = isCurrentHour ? currentTotal : null;
    const deltaPct = rowCurrentTotal != null && baselineAvg != null
      ? ((rowCurrentTotal - baselineAvg) / baselineAvg) * 100
      : null;
    return {
      hour,
      baselineAvg: baselineAvg == null ? null : Math.round(baselineAvg),
      currentTotal: rowCurrentTotal,
      deltaPct: Number.isFinite(deltaPct) ? Math.round(deltaPct * 10) / 10 : null,
      samples: Number.isFinite(Number(row?.samples)) ? Math.round(Number(row.samples)) : 0,
      distinctDays: Number.isFinite(Number(row?.distinctDays))
        ? Math.max(0, Math.round(Number(row.distinctDays)))
        : 0,
      coverageStage: hourlyCoverageStage(row?.distinctDays),
      comparableGames: universeMatches ? observedLobby.includedGames : 0,
      isCurrentHour,
    };
  });
  const hourlyComparison = universeMatches
    ? hourlyByHour.find((row) => row.isCurrentHour && row.baselineAvg != null && row.currentTotal != null) ?? null
    : null;
  const distinctDays = Number.isFinite(Number(baseline?.distinctDays))
    ? Math.min(HOURLY_BASELINE_DAYS, Math.max(0, Math.round(Number(baseline.distinctDays))))
    : 0;

  const readyHours = Number.isFinite(Number(baseline?.readyHours))
    ? Math.max(0, Math.min(24, Math.round(Number(baseline.readyHours))))
    : hourlyByHour.filter((row) => row.baselineAvg != null).length;
  const ready = readyHours > 0;

  return {
    ready,
    hourlyComparison,
    hourlyByHour,
    coverage: {
      requestedDays: HOURLY_BASELINE_DAYS,
      distinctDays,
      samples: Number.isFinite(Number(baseline?.samples)) ? Math.round(Number(baseline.samples)) : 0,
      minimumDistinctDays: Number.isFinite(Number(baseline?.minimumDistinctDays))
        ? Math.max(1, Math.round(Number(baseline.minimumDistinctDays)))
        : HOURLY_BASELINE_MIN_DISTINCT_DAYS,
      readyHours,
      computedAt: baseline?.computedAt ?? null,
      source: HOURLY_BASELINE_SOURCE,
      trackedGames: Array.isArray(latestSnapshot?.items) ? latestSnapshot.items.length : 0,
      healthyGames: observedLobby.includedGames,
      comparableGames: universeMatches ? observedLobby.includedGames : 0,
      universeMatches,
      isComplete: distinctDays >= HOURLY_BASELINE_DAYS,
      remainingDays: Math.max(0, HOURLY_BASELINE_DAYS - distinctDays),
    },
    liveUpdatedAt: observedLobby.measuredAt ?? latestSnapshot?.updatedAt ?? null,
  };
}

export async function loadHourlyLobbyBaseline() {
  const [existing, latestSample] = await Promise.all([
    getCachedHourlyLobbyBaseline(),
    getLatestLobbyTotalSample(),
  ]);
  if (shouldReuseHourlyLobbyBaseline(existing, latestSample)) return existing;

  const series = await getLobbyTotalSeries(HOURLY_BASELINE_DAYS);
  const candidate = buildHourlyBaselineFromTotalSeries(series);
  const baseline = preferLastReadyHourlyBaseline(existing, candidate);
  if (baseline === existing) return existing;
  await setBaselineSnapshot(
    HOURLY_BASELINE_DAYS,
    HOURLY_BASELINE_BUCKET_MS,
    baseline,
    HOURLY_BASELINE_CACHE_TTL_MS
  );
  return baseline;
}

export function getCachedHourlyLobbyBaseline() {
  return getBaselineSnapshot(HOURLY_BASELINE_DAYS, HOURLY_BASELINE_BUCKET_MS);
}
