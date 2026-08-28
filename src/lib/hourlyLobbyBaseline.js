// Builds and loads the materialized hourly lobby baseline used by premium views.

import { GAMES as GAME_CONFIG } from "../config/games.js";
import { getBaselineSnapshot, getOrBuildBaseline } from "./csStore.js";

export const HOURLY_BASELINE_DAYS = 60;
export const HOURLY_BASELINE_BUCKET_MS = 5 * 60 * 1000;

const STOCKHOLM_HOUR = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Stockholm",
  hour: "2-digit",
  hour12: false,
});

const finitePositive = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

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
  const comparableItems = currentHealthyItems.filter((item) => {
    return Array.from({ length: 24 }, (_, index) => {
      const hour = String(index).padStart(2, "0");
      return finitePositive(
        healthyHourlyBySlug[String(item?.id)]?.find((row) => row?.hour === hour)?.avg
      ) != null;
    }).every(Boolean);
  });
  const totalPlayers = comparableItems.reduce((sum, item) => {
    const players = finitePositive(item?.players);
    return players != null ? sum + players : sum;
  }, 0);
  const currentTotal = finitePositive(totalPlayers) == null ? null : Math.round(totalPlayers);
  const currentHour = stockholmHourLabel(now);
  const hourlyByHour = Array.from({ length: 24 }, (_, index) => {
    const hour = String(index).padStart(2, "0");
    const gameBaselines = comparableItems
      .map((item) => healthyHourlyBySlug[String(item?.id)]?.find((row) => row?.hour === hour))
      .filter((row) => finitePositive(row?.avg) != null);
    const baselineAvg = gameBaselines.length === comparableItems.length
      ? gameBaselines.reduce((sum, row) => sum + row.avg, 0)
      : null;
    const samples = gameBaselines.reduce((sum, row) => sum + row.samples, 0);
    const deltaPct = currentTotal != null && baselineAvg != null
      ? ((currentTotal - baselineAvg) / baselineAvg) * 100
      : null;

    return {
      hour,
      baselineAvg: baselineAvg == null ? null : Math.round(baselineAvg),
      currentTotal,
      deltaPct: Number.isFinite(deltaPct) ? Math.round(deltaPct * 10) / 10 : null,
      samples: Number.isFinite(samples) ? Math.round(samples) : 0,
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
      comparableGames: comparableItems.length,
    },
    liveUpdatedAt: latestSnapshot?.updatedAt ?? null,
  };
}

export function loadHourlyLobbyBaseline() {
  return getOrBuildBaseline(
    GAME_CONFIG.map((game) => game.id).filter(Boolean),
    HOURLY_BASELINE_DAYS,
    HOURLY_BASELINE_BUCKET_MS
  );
}

export function getCachedHourlyLobbyBaseline() {
  return getBaselineSnapshot(HOURLY_BASELINE_DAYS, HOURLY_BASELINE_BUCKET_MS);
}
