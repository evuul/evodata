// Rolls persisted lobby overview snapshots forward from one completed aggregate day.

import { FORECAST_GAME_IDS } from "@/config/games";
import { getOverviewSnapshot, setOverviewSnapshot } from "@/lib/csStore";
import {
  appendDailyAggregateDateToOverview,
  composeLobbyOverviewSnapshots,
} from "@/lib/lobbyOverviewSnapshot";

export const MATERIALIZED_OVERVIEW_RANGES = Object.freeze([30, 60, 90, 180, 365, 730]);

export async function materializeLobbyOverviewSnapshots(dailyAggregates, targetDate) {
  const snapshots = await Promise.all(
    MATERIALIZED_OVERVIEW_RANGES.map((days) => getOverviewSnapshot(days))
  );
  const recentData = snapshots[0]?.data ?? null;
  const now = Date.now();
  const cachedAt = new Date(now).toISOString();
  const staleAfter = new Date(now + 48 * 60 * 60 * 1000).toISOString();
  let updated = 0;

  for (let index = 0; index < MATERIALIZED_OVERVIEW_RANGES.length; index += 1) {
    const days = MATERIALIZED_OVERVIEW_RANGES[index];
    const stored = snapshots[index];
    if (!stored?.data) continue;
    const composed = composeLobbyOverviewSnapshots(stored.data, recentData, days);
    const data = appendDailyAggregateDateToOverview(
      composed,
      dailyAggregates,
      targetDate,
      days,
      FORECAST_GAME_IDS
    );
    if (!data) continue;
    await setOverviewSnapshot(days, {
      data,
      meta: {
        refreshIntervalMs: 24 * 60 * 60 * 1000,
        cachedAt,
        staleAfter,
        persisted: true,
        source: "daily-materialized-snapshot",
      },
    });
    updated += 1;
  }

  return { targetDate, updated, ranges: MATERIALIZED_OVERVIEW_RANGES };
}
