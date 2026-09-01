// Builds the premium hourly view from a single complete-lobby time series.

import {
  getBaselineSnapshot,
  getLobbyTotalSeries,
  setBaselineSnapshot,
} from "./csStore.js";
import { summarizeObservedLobby } from "./liveLobbyPeak.js";

export const HOURLY_BASELINE_DAYS = 60;
export const HOURLY_BASELINE_BUCKET_MS = 60 * 60 * 1000;
const HOURLY_BASELINE_CACHE_TTL_MS = 2 * 60 * 60 * 1000;

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

export function buildHourlyBaselineFromTotalSeries(points, { days = HOURLY_BASELINE_DAYS, now = new Date() } = {}) {
  const cutoff = Number(now) - Math.max(1, Number(days) || HOURLY_BASELINE_DAYS) * 24 * 60 * 60 * 1000;
  const byHour = Array.from({ length: 24 }, () => ({ values: [], days: new Set() }));
  const observedDays = new Set();

  for (const point of Array.isArray(points) ? points : []) {
    const timestamp = Number(point?.ts);
    const value = finitePositive(point?.value);
    if (!Number.isFinite(timestamp) || timestamp < cutoff || value == null) continue;
    const hour = stockholmHour(timestamp);
    const day = stockholmDay(timestamp);
    const index = Number(hour);
    if (!Number.isInteger(index) || index < 0 || index > 23 || !day) continue;
    byHour[index].values.push(value);
    byHour[index].days.add(day);
    observedDays.add(day);
  }

  const distinctDays = observedDays.size;
  const minimumSamples = Math.min(12, Math.max(3, Math.ceil(distinctDays * 0.25)));
  const hourlyByHour = byHour.map((entry, index) => {
    const average = entry.values.length >= minimumSamples ? robustAverage(entry.values) : null;
    return {
      hour: String(index).padStart(2, "0"),
      baselineAvg: average == null ? null : Math.round(average),
      samples: entry.values.length,
      distinctDays: entry.days.size,
    };
  });

  return {
    hourlyByHour,
    requestedDays: HOURLY_BASELINE_DAYS,
    distinctDays,
    samples: hourlyByHour.reduce((sum, row) => sum + row.samples, 0),
    isComplete: distinctDays >= HOURLY_BASELINE_DAYS,
    computedAt: new Date(now).toISOString(),
    source: "lobby-total-hourly-v1",
  };
}

export function buildHourlyLobbyPayload({ baseline, latestSnapshot, now = new Date() }) {
  const observedLobby = summarizeObservedLobby(latestSnapshot?.items);
  const currentTotal = observedLobby.totalPlayers;
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
    const deltaPct = currentTotal != null && baselineAvg != null
      ? ((currentTotal - baselineAvg) / baselineAvg) * 100
      : null;
    return {
      hour,
      baselineAvg: baselineAvg == null ? null : Math.round(baselineAvg),
      currentTotal,
      deltaPct: Number.isFinite(deltaPct) ? Math.round(deltaPct * 10) / 10 : null,
      samples: Number.isFinite(Number(row?.samples)) ? Math.round(Number(row.samples)) : 0,
      comparableGames: observedLobby.includedGames,
      isCurrentHour: hour === currentHour,
    };
  });
  const hourlyComparison = hourlyByHour.find((row) => row.isCurrentHour && row.baselineAvg != null) ?? null;
  const distinctDays = Number.isFinite(Number(baseline?.distinctDays))
    ? Math.min(HOURLY_BASELINE_DAYS, Math.max(0, Math.round(Number(baseline.distinctDays))))
    : 0;

  return {
    hourlyComparison,
    hourlyByHour,
    coverage: {
      requestedDays: HOURLY_BASELINE_DAYS,
      distinctDays,
      samples: Number.isFinite(Number(baseline?.samples)) ? Math.round(Number(baseline.samples)) : 0,
      computedAt: baseline?.computedAt ?? null,
      source: "lobby-total-hourly-v1",
      trackedGames: Array.isArray(latestSnapshot?.items) ? latestSnapshot.items.length : 0,
      healthyGames: observedLobby.includedGames,
      comparableGames: observedLobby.includedGames,
      isComplete: distinctDays >= HOURLY_BASELINE_DAYS,
      remainingDays: Math.max(0, HOURLY_BASELINE_DAYS - distinctDays),
    },
    liveUpdatedAt: latestSnapshot?.updatedAt ?? observedLobby.measuredAt,
  };
}

export async function loadHourlyLobbyBaseline() {
  const series = await getLobbyTotalSeries(HOURLY_BASELINE_DAYS);
  const baseline = buildHourlyBaselineFromTotalSeries(series);
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
