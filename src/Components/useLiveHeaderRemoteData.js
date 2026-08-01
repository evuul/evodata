"use client";

// Remote header data loaders for lobby ATH and buyback summary.

import { useEffect, useMemo, useState } from "react";
import { useBuybackData } from "./useBuybackData.js";
import { fetchOverviewShared } from "../lib/csOverviewClient.js";

const BUYBACK_CASH_EUR = 2_000_000_000;
const BUYBACK_MANDATE_START_DATE = "2026-05-18";
const LOBBY_ATH_DAYS = 365;

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
  const [lobbyAth, setLobbyAth] = useState(null);
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

  useEffect(() => {
    let isActive = true;
    const loadLobbyOverview = async () => {
      try {
        const data = await fetchOverviewShared(LOBBY_ATH_DAYS);
        if (!isActive) return;
        setLobbyAth(data?.ath || null);
      } catch (error) {
        if (!isActive) return;
        console.warn("[LiveHeader] Failed to fetch lobby overview:", error);
        setLobbyAth(null);
      }
    };

    const handleFocus = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      loadLobbyOverview();
      reloadBuybacks().catch(() => {});
    };

    loadLobbyOverview();
    window.addEventListener("focus", handleFocus);
    window.addEventListener("visibilitychange", handleFocus);

    return () => {
      isActive = false;
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("visibilitychange", handleFocus);
    };
  }, [reloadBuybacks]);

  return {
    lobbyAth,
    buybackSummary,
  };
}
