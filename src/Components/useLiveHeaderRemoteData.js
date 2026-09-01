"use client";

// Remote header data loaders for lobby ATH and buyback summary.

import { useEffect, useMemo, useState } from "react";
import { useBuybackData } from "./useBuybackData.js";
import { fetchShortActivityShared } from "../lib/marketDataClient.js";
import {
  buildBuybackComplianceSeries,
  buildBuybackWeeklyEstimate as calculateWeeklyBuybackEstimate,
} from "../lib/buybackCompliance.js";

const BUYBACK_CASH_EUR = 2_000_000_000;
const BUYBACK_MANDATE_START_DATE = "2026-05-18";
const BUYBACK_VOLUME_LOOKBACK_DAYS = 45;

function toTradingVolumeMap(items) {
  const volumeByDate = new Map();
  for (const item of Array.isArray(items) ? items : []) {
    const date = String(item?.date || "").slice(0, 10);
    const volume = Number(item?.volumeShares);
    if (date && Number.isFinite(volume) && volume > 0) volumeByDate.set(date, volume);
  }
  return volumeByDate;
}

export function buildHeaderWeeklyBuybackEstimate(buybackData, activityItems) {
  const currentRows = Array.isArray(buybackData?.current) ? buybackData.current : [];
  const volumeByDate = toTradingVolumeMap(activityItems);
  if (!currentRows.length || !volumeByDate.size) return null;

  const complianceSeries = buildBuybackComplianceSeries(currentRows, volumeByDate, {
    startDate: BUYBACK_MANDATE_START_DATE,
  });
  return calculateWeeklyBuybackEstimate(complianceSeries, volumeByDate);
}

export function buildBuybackFallbackSummary(fxRateNumber, error) {
  return {
    mandateStart: BUYBACK_MANDATE_START_DATE,
    mandateEur: BUYBACK_CASH_EUR,
    usedSek: 0,
    usedEur: 0,
    remainingSek: Number.isFinite(fxRateNumber) ? BUYBACK_CASH_EUR * fxRateNumber : null,
    remainingEur: BUYBACK_CASH_EUR,
    sharesRepurchased: 0,
    updatedAt: new Date().toISOString(),
    syncError: error instanceof Error ? error.message : String(error),
    fallback: true,
  };
}

export function buildBuybackSummary(data, fxRateNumber, stockPriceValue) {
  const currentRows = Array.isArray(data?.current) ? data.current : [];
  const mandateRows = currentRows.filter(
    (row) => row?.Datum && row.Datum >= BUYBACK_MANDATE_START_DATE && Number(row?.Antal_aktier) > 0
  );
  const sharesRepurchased = mandateRows.reduce((sum, row) => sum + (Number(row?.Antal_aktier) || 0), 0);
  const usedSek = mandateRows.reduce((sum, row) => sum + (Number(row?.Transaktionsvärde) || 0), 0);
  const budgetSek = Number.isFinite(fxRateNumber) ? BUYBACK_CASH_EUR * fxRateNumber : null;
  const remainingSek = Number.isFinite(budgetSek) ? Math.max(budgetSek - usedSek, 0) : null;
  const remainingEur = Number.isFinite(fxRateNumber) ? Math.max(BUYBACK_CASH_EUR - usedSek / fxRateNumber, 0) : null;
  const estimatedTotalSharesAtCurrentPrice =
    Number.isFinite(stockPriceValue) && stockPriceValue > 0 && Number.isFinite(remainingSek)
      ? sharesRepurchased + remainingSek / stockPriceValue
      : null;

  return {
    mandateStart: BUYBACK_MANDATE_START_DATE,
    mandateEur: BUYBACK_CASH_EUR,
    usedSek,
    usedEur: Number.isFinite(fxRateNumber) ? usedSek / fxRateNumber : null,
    remainingSek,
    remainingEur,
    sharesRepurchased,
    estimatedTotalSharesAtCurrentPrice,
    updatedAt: data?.updatedAt || new Date().toISOString(),
    syncError: data?.syncError || null,
    fallback: Boolean(data?.fallback),
  };
}

export function useLiveHeaderRemoteData({ fxRateNumber, stockPriceValue }) {
  const [activityItems, setActivityItems] = useState([]);
  const {
    data: buybackData,
    error: buybackError,
    reload: reloadBuybacks,
  } = useBuybackData({ refreshIntervalMs: 30 * 60 * 1000 });
  const buybackSummary = useMemo(() => {
    if (buybackData) return buildBuybackSummary(buybackData, fxRateNumber, stockPriceValue);
    if (buybackError) return buildBuybackFallbackSummary(fxRateNumber, buybackError);
    return null;
  }, [buybackData, buybackError, fxRateNumber, stockPriceValue]);
  const weeklyBuybackEstimate = useMemo(
    () => buildHeaderWeeklyBuybackEstimate(buybackData, activityItems),
    [activityItems, buybackData]
  );

  useEffect(() => {
    if (!buybackData) return undefined;
    let isActive = true;

    fetchShortActivityShared(BUYBACK_VOLUME_LOOKBACK_DAYS)
      .then((data) => {
        if (isActive) setActivityItems(Array.isArray(data?.items) ? data.items : []);
      })
      .catch(() => {
        if (isActive) setActivityItems([]);
      });

    return () => {
      isActive = false;
    };
  }, [buybackData]);

  useEffect(() => {
    const handleFocus = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      reloadBuybacks().catch(() => {});
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("visibilitychange", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("visibilitychange", handleFocus);
    };
  }, [reloadBuybacks]);

  return {
    buybackSummary: buybackSummary ? { ...buybackSummary, weeklyBuybackEstimate } : null,
  };
}
