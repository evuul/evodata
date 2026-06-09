"use client";

// Data and derived state for the short intelligence dashboard.

import { useCallback, useEffect, useMemo, useState } from "react";
import { parseJsonResponse } from "@/lib/apiResponse";
import { totalSharesData } from "./buybacks/utils";
import { useStockPriceContext } from "@/context/StockPriceContext";
import { EVO_LEI } from "@/lib/fiShortRegister";

export const VIEW_OPTIONS = [
  { value: "blanking", labelSv: "Blankningstrend", labelEn: "Short interest trend" },
  { value: "trading", labelSv: "Handel & andelar", labelEn: "Trading & short share" },
];

export const BLANKING_RANGES = [7, 30, 90];
export const TRADING_RANGES_DESKTOP = [14, 30, 90];
export const TRADING_RANGES_MOBILE = [7, 14, 30];

export const LATEST_TOTAL_SHARES =
  totalSharesData?.[totalSharesData.length - 1]?.totalShares || null;

export const formatPercent = (value, digits = 2) =>
  Number.isFinite(value) ? `${value.toFixed(digits)}%` : "–";

export const formatNumber = (value) =>
  Number.isFinite(value) ? value.toLocaleString("sv-SE") : "–";

export const formatMillion = (value, digits = 1) =>
  Number.isFinite(value)
    ? value.toLocaleString("sv-SE", { maximumFractionDigits: digits })
    : "–";

export const shortLabel = (dateStr) => {
  try {
    const date = new Date(`${dateStr}T00:00:00Z`);
    return date.toLocaleDateString("sv-SE", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
};

export const fullLabel = (dateStr) => {
  try {
    const date = new Date(`${dateStr}T00:00:00Z`);
    return date.toLocaleDateString("sv-SE", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
};

export const buildTradingSeries = (items) =>
  items.map((item) => ({
    date: item.date,
    xLabel: shortLabel(item.date),
    volumeShares: item.volumeShares,
    volumeM: Number.isFinite(item.volumeShares)
      ? item.volumeShares / 1_000_000
      : null,
    volumeAverage5M: Number.isFinite(item.volumeAverage5)
      ? item.volumeAverage5 / 1_000_000
      : null,
    shortSharePct: item.shortShareOfVolumePercent,
    shortShareAvg5: item.shortShareOfVolumeAverage5,
    shortChangeShares: item.shortChangeShares,
  }));

export const computeBlankingSummary = (series, stockPrice, liveSnapshot = null) => {
  if (!series.length && !Number.isFinite(liveSnapshot?.totalPercent)) {
    return {
      latestPercent: null,
      latestDate: null,
      deltaPP: null,
      deltaShares: null,
      totalShares: null,
      totalValue: null,
      valueDelta: null,
    };
  }

  const latestHistory = series.length ? series[series.length - 1] : null;
  const previous = series.length > 1 ? series[series.length - 2] : null;
  const livePercent = Number.isFinite(liveSnapshot?.totalPercent) ? Number(liveSnapshot.totalPercent) : null;
  const latestPercent = livePercent ?? (Number.isFinite(Number(latestHistory?.percent)) ? Number(latestHistory.percent) : null);
  const latestDate = liveSnapshot?.observedDate ?? latestHistory?.date ?? null;
  const sameDate =
    Boolean(liveSnapshot?.observedDate) &&
    Boolean(latestHistory?.date) &&
    liveSnapshot.observedDate === latestHistory.date;
  const historyDelta =
    previous && latestHistory
      ? Number((Number(latestHistory.percent) - Number(previous.percent)).toFixed(2))
      : null;
  const liveDelta =
    Number.isFinite(livePercent) && Number.isFinite(latestHistory?.percent)
      ? Number((livePercent - Number(latestHistory.percent)).toFixed(2))
      : null;
  const deltaPP = sameDate ? historyDelta : liveDelta ?? historyDelta;

  const totalShares =
    Number.isFinite(latestPercent) && LATEST_TOTAL_SHARES
      ? Math.round((latestPercent / 100) * LATEST_TOTAL_SHARES)
      : null;
  const deltaShares =
    deltaPP != null && LATEST_TOTAL_SHARES
      ? Math.round((deltaPP / 100) * LATEST_TOTAL_SHARES)
      : null;

  const price = stockPrice?.price?.regularMarketPrice?.raw;
  const totalValue =
    totalShares != null && Number.isFinite(price) ? totalShares * price : null;
  const valueDelta =
    deltaShares != null && Number.isFinite(price) ? deltaShares * price : null;

  return {
    latestPercent,
    latestDate,
    deltaPP,
    deltaShares,
    totalShares,
    totalValue,
    valueDelta,
  };
};

const buildBlankingSeries = (items, limit) => {
  const safeLimit = Math.max(limit, 1);
  return items.slice(-safeLimit).map((item) => ({
    ...item,
    xLabel: shortLabel(item.date),
  }));
};

const buildBlankingDomain = (series) => {
  if (!series.length) return [0, 1];
  const values = series.map((item) => item.percent).filter(Number.isFinite);
  if (!values.length) return [0, 1];
  let min = Math.min(...values);
  let max = Math.max(...values);
  const range = max - min;
  const padding = range > 0 ? range * 0.1 : 0.3;
  min = Math.max(0, min - padding);
  max = max + padding;
  if (min === max) {
    min = Math.max(0, min - 0.5);
    max = max + 0.5;
  }
  return [Math.floor(min * 10) / 10, Math.ceil(max * 10) / 10];
};

const buildLatestTradingSummary = (latestTrading, meta = null) => {
  if (!latestTrading && !meta) return null;
  return {
    date: latestTrading?.date ? fullLabel(latestTrading.date) : null,
    volumeM: Number.isFinite(latestTrading?.volumeShares)
      ? latestTrading.volumeShares / 1_000_000
      : null,
    shortPercent: Number.isFinite(latestTrading?.shortShareOfVolumePercent)
      ? formatPercent(latestTrading.shortShareOfVolumePercent)
      : null,
    netChange: Number.isFinite(latestTrading?.shortChangeShares)
      ? `${latestTrading.shortChangeShares > 0 ? "+" : latestTrading.shortChangeShares < 0 ? "-" : ""}${formatNumber(
          Math.abs(latestTrading.shortChangeShares)
        )}`
      : "–",
    daysToCover: Number.isFinite(meta?.daysToCoverEstimate)
      ? meta.daysToCoverEstimate
      : Number.isFinite(latestTrading?.daysToCoverEstimate)
        ? latestTrading.daysToCoverEstimate
        : Number.isFinite(latestTrading?.daysToCover)
          ? latestTrading.daysToCover
          : null,
    currentShortInterestPercent: Number.isFinite(meta?.currentShortInterestPercent)
      ? formatPercent(meta.currentShortInterestPercent)
      : null,
    currentShortInterestShares: Number.isFinite(meta?.currentShortInterestShares)
      ? meta.currentShortInterestShares
      : null,
    currentShortInterestDate: meta?.currentShortInterestDate
      ? fullLabel(meta.currentShortInterestDate)
      : null,
    averageDailyVolumeShares: Number.isFinite(meta?.averageDailyVolumeShares)
      ? meta.averageDailyVolumeShares
      : null,
  };
};

export function useShortIntelligenceModel({ isMobile, translate }) {
  const { stockPrice } = useStockPriceContext();
  const [view, setView] = useState("blanking");
  const [blankingRange, setBlankingRange] = useState(30);
  const [blankingLoading, setBlankingLoading] = useState(false);
  const [blankingData, setBlankingData] = useState([]);
  const [blankingUpdatedAt, setBlankingUpdatedAt] = useState(null);
  const [shortSnapshotLoading, setShortSnapshotLoading] = useState(false);
  const [shortSnapshot, setShortSnapshot] = useState(null);
  const [publicPositions, setPublicPositions] = useState([]);
  const [publicPositionsError, setPublicPositionsError] = useState("");

  const tradingRanges = isMobile ? TRADING_RANGES_MOBILE : TRADING_RANGES_DESKTOP;
  const [tradingRange, setTradingRange] = useState(tradingRanges[1]);
  const [tradingLoading, setTradingLoading] = useState(false);
  const [tradingError, setTradingError] = useState("");
  const [tradingItems, setTradingItems] = useState([]);
  const [aggregateShare, setAggregateShare] = useState(null);
  const [latestTrading, setLatestTrading] = useState(null);
  const [latestTradingMeta, setLatestTradingMeta] = useState(null);

  useEffect(() => {
    if (!tradingRanges.includes(tradingRange)) {
      setTradingRange(tradingRanges[tradingRanges.length - 1]);
    }
  }, [tradingRanges, tradingRange]);

  const fetchBlanking = useCallback(async () => {
    setBlankingLoading(true);
    try {
      const res = await fetch("/api/short/history", { cache: "no-store" });
      const json = await parseJsonResponse(res, { requireOk: false });
      const items = Array.isArray(json?.items) ? json.items : [];
      const sorted = items
        .slice()
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .map((item, idx, arr) => {
          const prev = idx > 0 ? arr[idx - 1] : null;
          const percent = Number(item.percent);
          const prevPercent = prev != null ? Number(prev.percent) : null;
          const delta =
            prevPercent != null &&
            Number.isFinite(prevPercent) &&
            Number.isFinite(percent)
              ? Number(percent - prevPercent).toFixed(2)
              : null;
          return {
            date: item.date,
            percent: Number.isFinite(percent) ? percent : null,
            delta: delta != null ? Number(delta) : null,
          };
        })
        .filter((item) => item.date && Number.isFinite(item.percent));
      setBlankingData(sorted);
      setBlankingUpdatedAt(json?.updatedAt || null);
    } catch (error) {
      console.error("Failed to fetch blanking history", error);
    } finally {
      setBlankingLoading(false);
    }
  }, []);

  const fetchShortSnapshot = useCallback(async () => {
    setShortSnapshotLoading(true);
    try {
      const res = await fetch(`/api/short?lei=${EVO_LEI}`, { cache: "no-store" });
      const json = await parseJsonResponse(res, { requireOk: false });
      const totalPercent = Number.isFinite(json?.totalPercent) ? json.totalPercent : null;
      setShortSnapshot(
        totalPercent != null
          ? {
              totalPercent,
              observedDate: json?.observedDate ?? null,
            }
          : null
      );
      setPublicPositions(Array.isArray(json?.publicPositions) ? json.publicPositions : []);
      setPublicPositionsError(
        typeof json?.publicPositionsError === "string" && json.publicPositionsError.trim()
          ? json.publicPositionsError.trim()
          : ""
      );
    } catch (error) {
      console.error("Failed to fetch live short snapshot", error);
      setShortSnapshot(null);
      setPublicPositions([]);
      setPublicPositionsError(
        error instanceof Error
          ? error.message
          : translate("Kunde inte hämta publika blankare", "Could not fetch public short positions")
      );
    } finally {
      setShortSnapshotLoading(false);
    }
  }, [translate]);

  const refreshBlanking = useCallback(async () => {
    setBlankingLoading(true);
    try {
      await fetch("/api/short/snapshot?force=1", {
        method: "POST",
        cache: "no-store",
      }).catch(() => {});
    } finally {
      await Promise.all([fetchBlanking(), fetchShortSnapshot()]);
    }
  }, [fetchBlanking, fetchShortSnapshot]);

  const fetchTrading = useCallback(
    async (days) => {
      setTradingLoading(true);
      setTradingError("");
      try {
        const res = await fetch(`/api/short/activity?days=${days}`);
        const json = await parseJsonResponse(res, { requireOk: false });
        setTradingItems(Array.isArray(json?.items) ? json.items : []);
        setLatestTrading(json?.latest ?? null);
        setLatestTradingMeta({
          daysToCoverEstimate: Number.isFinite(json?.daysToCoverEstimate) ? json.daysToCoverEstimate : null,
          currentShortInterestPercent: Number.isFinite(json?.currentShortInterestPercent)
            ? json.currentShortInterestPercent
            : null,
          currentShortInterestShares: Number.isFinite(json?.currentShortInterestShares)
            ? json.currentShortInterestShares
            : null,
          currentShortInterestDate: json?.currentShortInterestDate ?? null,
          averageDailyVolumeShares: Number.isFinite(json?.averageDailyVolumeShares)
            ? json.averageDailyVolumeShares
            : null,
        });
        setAggregateShare(Number.isFinite(json?.aggregateShare) ? json.aggregateShare : null);
      } catch (error) {
        console.error("Failed to fetch trading activity", error);
        setTradingError(
          error instanceof Error
            ? error.message
            : translate("Kunde inte hämta handelsdata", "Could not fetch trading data")
        );
      } finally {
        setTradingLoading(false);
      }
    },
    [translate]
  );

  useEffect(() => {
    refreshBlanking();
  }, [refreshBlanking]);

  useEffect(() => {
    fetchTrading(tradingRange);
  }, [fetchTrading, tradingRange]);

  const blankingSeries = useMemo(
    () => buildBlankingSeries(blankingData, blankingRange),
    [blankingData, blankingRange]
  );

  const blankingSummary = useMemo(
    () => computeBlankingSummary(blankingSeries, stockPrice, shortSnapshot),
    [blankingSeries, stockPrice, shortSnapshot]
  );

  const blankingDomain = useMemo(() => buildBlankingDomain(blankingSeries), [blankingSeries]);

  const blankingAxisInterval = useMemo(() => {
    const length = blankingSeries.length;
    if (!length) return 0;
    const divisor = isMobile ? 6 : 10;
    return Math.max(Math.floor(length / divisor) - 1, 0);
  }, [blankingSeries, isMobile]);

  const tradingSeries = useMemo(() => buildTradingSeries(tradingItems), [tradingItems]);

  const tradingAxisInterval = useMemo(() => {
    const length = tradingSeries.length;
    if (!length) return 0;
    const divisor = isMobile ? 6 : 12;
    return Math.max(Math.floor(length / divisor) - 1, 0);
  }, [tradingSeries, isMobile]);

  const latestTradingSummary = useMemo(
    () => buildLatestTradingSummary(latestTrading, latestTradingMeta),
    [latestTrading, latestTradingMeta]
  );

  const activeLoading = view === "blanking" ? blankingLoading || shortSnapshotLoading : tradingLoading;

  return {
    view,
    setView,
    blankingRange,
    setBlankingRange,
    blankingLoading,
    blankingData,
    blankingUpdatedAt,
    shortSnapshot,
    shortSnapshotLoading,
    publicPositions,
    publicPositionsError,
    tradingRanges,
    tradingRange,
    setTradingRange,
    tradingLoading,
    tradingError,
    tradingItems,
    aggregateShare,
    latestTrading,
    latestTradingMeta,
    blankingSeries,
    blankingSummary,
    blankingDomain,
    blankingAxisInterval,
    tradingSeries,
    tradingAxisInterval,
    latestTradingSummary,
    activeLoading,
    refreshBlanking,
  };
}
