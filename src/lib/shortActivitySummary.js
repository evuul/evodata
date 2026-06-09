// Helpers for the short activity summary and current short-interest resolution.

import { totalSharesData } from "../Components/buybacks/utils.js";
import { EVO_LEI } from "./fiShortRegister.js";
import { resolveFiShortSnapshot } from "./fiShortSnapshot.js";

function getTotalSharesForDate(dateStr) {
  const year = Number.parseInt(String(dateStr).slice(0, 4), 10);
  if (!Number.isFinite(year)) {
    return totalSharesData[totalSharesData.length - 1]?.totalShares ?? null;
  }
  let candidate = null;
  for (const entry of totalSharesData) {
    const entryYear = Number.parseInt(entry.date, 10);
    if (!Number.isFinite(entryYear)) continue;
    if (entryYear <= year) {
      candidate = entry.totalShares;
    }
  }
  return candidate ?? totalSharesData[totalSharesData.length - 1]?.totalShares ?? null;
}

export function buildDaysToCoverEstimate(shortHistory, tradingDates, totalVolume, latestTrading, currentShortContext = null) {
  const latestShort = Array.isArray(shortHistory) && shortHistory.length ? shortHistory[shortHistory.length - 1] : null;
  const currentShortInterestPercent = Number.isFinite(Number(currentShortContext?.currentShortInterestPercent))
    ? Number(currentShortContext.currentShortInterestPercent)
    : Number.isFinite(Number(latestShort?.percent))
      ? Number(latestShort.percent)
      : null;
  const currentShortInterestDate = currentShortContext?.currentShortInterestDate ?? latestShort?.date ?? null;
  const currentShortInterestShares =
    currentShortInterestPercent != null && Number.isFinite(getTotalSharesForDate(currentShortInterestDate))
      ? Math.round((currentShortInterestPercent / 100) * getTotalSharesForDate(currentShortInterestDate))
      : null;
  const averageDailyVolumeShares =
    Number.isFinite(latestTrading?.volumeAverage20)
      ? latestTrading.volumeAverage20
      : tradingDates.length > 0 && Number.isFinite(totalVolume)
        ? Math.round(totalVolume / tradingDates.length)
        : null;
  const daysToCoverEstimate =
    currentShortInterestShares != null &&
    Number.isFinite(averageDailyVolumeShares) &&
    averageDailyVolumeShares > 0
      ? +(currentShortInterestShares / averageDailyVolumeShares).toFixed(2)
      : null;

  return {
    currentShortInterestDate,
    currentShortInterestPercent,
    currentShortInterestShares,
    averageDailyVolumeShares,
    daysToCoverEstimate,
  };
}

export async function resolveCurrentShortContext(shortHistory) {
  const latestHistoricalShort = Array.isArray(shortHistory) && shortHistory.length ? shortHistory[shortHistory.length - 1] : null;

  try {
    const liveSnapshot = await resolveFiShortSnapshot({ lei: EVO_LEI });
    const livePercent = Number.isFinite(Number(liveSnapshot?.totalPercent))
      ? Number(liveSnapshot.totalPercent)
      : null;
    if (livePercent != null) {
      const currentDate = liveSnapshot?.observedDate ?? latestHistoricalShort?.date ?? null;
      const totalShares = currentDate ? getTotalSharesForDate(currentDate) : null;
      return {
        currentShortInterestDate: currentDate,
        currentShortInterestPercent: livePercent,
        currentShortInterestShares:
          livePercent != null && Number.isFinite(totalShares)
            ? Math.round((livePercent / 100) * totalShares)
            : null,
        currentShortInterestSource: "fi-live",
      };
    }
  } catch {
    // fall back to the historical series below
  }

  const historicalPercent = Number.isFinite(Number(latestHistoricalShort?.percent))
    ? Number(latestHistoricalShort.percent)
    : null;
  const historicalDate = latestHistoricalShort?.date ?? null;
  const historicalShares =
    historicalPercent != null && Number.isFinite(getTotalSharesForDate(historicalDate))
      ? Math.round((historicalPercent / 100) * getTotalSharesForDate(historicalDate))
      : null;

  return {
    currentShortInterestDate: historicalDate,
    currentShortInterestPercent: historicalPercent,
    currentShortInterestShares: historicalShares,
    currentShortInterestSource: historicalDate ? "history" : null,
  };
}
