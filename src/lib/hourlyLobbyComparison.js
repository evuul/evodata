// Compares the shared live feed with every historical hour without issuing requests.

import { HOURLY_LOBBY_COHORT } from "../config/hourlyLobbyCohort.js";
import { publishedHourlyCohort } from "./hourlyLobbyCohortSelection.js";
import {
  cohortSignature, HOURLY_BASELINE_SOURCE, HOURLY_MAX_BASELINE_AGE_MS,
  summarizeHourlyCohort, stockholmParts,
} from "./hourlyLobbyPolicy.js";

export function buildHourlyLobbyComparison({ baseline, items, now = Date.now(), cohort: requestedCohort }) {
  const published = publishedHourlyCohort(baseline);
  const cohort = requestedCohort ?? published ?? HOURLY_LOBBY_COHORT;
  const compatible = baseline?.source === HOURLY_BASELINE_SOURCE && baseline.signature === cohortSignature(cohort)
    && Boolean(requestedCohort || published)
    && Array.isArray(baseline.hourlyByHour);
  const currentHour = stockholmParts(now).hour;
  const live = summarizeHourlyCohort(items, { now, cohort });
  const computedAt = Date.parse(baseline?.computedAt ?? "");
  const baselineFresh = Number.isFinite(computedAt) && computedAt <= Number(now)
    && Number(now) - computedAt <= HOURLY_MAX_BASELINE_AGE_MS;
  const currentTotal = compatible && baselineFresh && live.complete ? live.total : null;
  const rows = compatible ? baseline.hourlyByHour.map((row) => {
    const average = typeof row.baselineAvg === "number" && Number.isFinite(row.baselineAvg)
      && row.baselineAvg >= 0 ? row.baselineAvg : null;
    return {
      ...row, baseline: average == null ? null : Math.round(average), currentTotal,
      deltaPlayers: currentTotal != null && average != null ? Math.round(currentTotal - average) : null,
      delta: currentTotal != null && average > 0 ? (currentTotal - average) / average * 100 : null,
      isCurrentHour: row.hour === currentHour,
    };
  }) : [];
  return {
    rows, currentHour, currentTotal,
    coverage: {
      ...(compatible ? baseline : {}),
      readyHours: rows.filter((row) => row.baseline != null).length,
      expectedGames: cohort.gameIds.length, healthyGames: live.healthyGames,
      gameIds: cohort.gameIds,
      status: !compatible ? "not-materialized" : !baselineFresh ? "stale-baseline" : live.reason,
      liveUpdatedAt: live.measuredAt,
      missingGameIds: live.missingGameIds,
    },
  };
}
