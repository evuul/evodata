// Computes hourly reference means and reports recency separately from historical coverage.

import { HOURLY_LOBBY_COHORT } from "../config/hourlyLobbyCohort.js";
import {
  cohortSignature, HOURLY_BASELINE_DAYS, HOURLY_BASELINE_SOURCE, HOURLY_MIN_DAYS,
  HOURLY_MIN_RECENT_DAYS, HOURLY_MIN_SLOTS, HOURLY_MIN_SPAN_MS, HOURLY_RECENT_DAYS,
  HOURLY_MAX_SOURCE_SKEW_MS, HOURLY_SLOT_MS, hourlyWindow, stockholmParts,
} from "./hourlyLobbyPolicy.js";

const HOUR_MS = 60 * 60 * 1000;
const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;

export function buildHourlyBaseline(observations, { now = Date.now(), cohort = HOURLY_LOBBY_COHORT } = {}) {
  const signature = cohortSignature(cohort);
  const period = hourlyWindow(now);
  const slots = new Map();
  for (const point of Array.isArray(observations) ? observations : []) {
    if (point?.signature !== signature || !Number.isFinite(point.ts) || !Number.isFinite(new Date(point.ts).getTime()) || point.ts > Number(now)
        || !Number.isFinite(point.newestTs) || point.newestTs < point.ts || point.newestTs > Number(now)
        || point.newestTs - point.ts > HOURLY_MAX_SOURCE_SKEW_MS
        || !Number.isInteger(point.value) || point.value < 0 || point.value > cohort.gameIds.length * 5_000_000) continue;
    const { day } = stockholmParts(point.ts);
    if (day < period.startDay || day >= period.endDay) continue;
    const slot = Math.floor(point.ts / HOURLY_SLOT_MS) * HOURLY_SLOT_MS;
    const previous = slots.get(slot);
    // Prefer a health-checked observation when archived and live collection overlap.
    const quality = point.quality === "reconstructed" ? 0 : 1;
    const previousQuality = previous?.quality === "reconstructed" ? 0 : 1;
    if (!previous || quality > previousQuality || (quality === previousQuality && previous.ts < point.ts)) slots.set(slot, point);
  }

  const utcHours = new Map();
  for (const [slot, point] of slots) {
    const hour = Math.floor(slot / HOUR_MS) * HOUR_MS;
    const values = utcHours.get(hour) ?? [];
    values.push(point);
    utcHours.set(hour, values);
  }
  const byHour = Array.from({ length: 24 }, () => new Map());
  for (const [timestamp, values] of utcHours) {
    if (values.length < HOURLY_MIN_SLOTS
        || Math.max(...values.map((point) => point.ts)) - Math.min(...values.map((point) => point.ts)) < HOURLY_MIN_SPAN_MS) continue;
    const { day, hour } = stockholmParts(timestamp);
    const daily = byHour[Number(hour)].get(day) ?? { means: [], samples: 0, reconstructed: false };
    daily.means.push(mean(values.map((point) => point.value)));
    daily.samples += values.length;
    daily.reconstructed ||= values.some((point) => point.quality === "reconstructed");
    byHour[Number(hour)].set(day, daily);
  }

  const hourlyByHour = byHour.map((days, hour) => {
    const recentDistinctDays = [...days.keys()].filter((day) => day >= period.recentStartDay).length;
    const ready = days.size >= HOURLY_MIN_DAYS;
    const reconstructedDays = [...days.values()].filter((day) => day.reconstructed).length;
    return {
      hour: String(hour).padStart(2, "0"),
      // During the autumn clock change, the repeated hour still gives its day one vote.
      baselineAvg: ready ? mean([...days.values()].map((day) => mean(day.means))) : null,
      distinctDays: days.size,
      recentDistinctDays,
      reconstructedDays,
      firstDay: [...days.keys()].sort()[0] ?? null,
      lastDay: [...days.keys()].sort().at(-1) ?? null,
      samples: [...days.values()].reduce((sum, day) => sum + day.samples, 0),
      status: !ready ? "collecting" : reconstructedDays || recentDistinctDays < HOURLY_MIN_RECENT_DAYS ? "historical-reference" : "ready",
    };
  });
  return {
    source: HOURLY_BASELINE_SOURCE, signature,
    cohort: { id: cohort.id, gameIds: [...cohort.gameIds] },
    period, requestedDays: HOURLY_BASELINE_DAYS,
    computedAt: new Date(now).toISOString(),
    samples: slots.size,
    readyHours: hourlyByHour.filter((row) => row.baselineAvg != null).length,
    recentHours: hourlyByHour.filter((row) => row.status === "ready").length,
    hourlyByHour,
    requirements: {
      minimumDistinctDays: HOURLY_MIN_DAYS, minimumSlotsPerHour: HOURLY_MIN_SLOTS,
      minimumSpanMinutes: HOURLY_MIN_SPAN_MS / 60000,
      recentDays: HOURLY_RECENT_DAYS, minimumRecentDays: HOURLY_MIN_RECENT_DAYS,
    },
  };
}
