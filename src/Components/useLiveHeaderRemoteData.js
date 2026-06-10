"use client";

// Remote header data loaders for top wins, lobby ATH and buyback summary.

import { useCallback, useEffect, useState } from "react";
import { extractLatestTopWin } from "../lib/liveHeader.js";

const LIVE_TOP3_ENDPOINT = process.env.NEXT_PUBLIC_LIVE_TOP3_ENDPOINT ?? "/api/live-top3";
const TOP_WIN_REFRESH_INTERVAL = 15 * 60 * 1000;
const LIVE_CACHE_MS = 2 * 60 * 1000;
const BUYBACK_CASH_EUR = 2_000_000_000;
const BUYBACK_MANDATE_START_DATE = "2026-05-18";
const LOBBY_ATH_DAYS = 365;

const remoteCaches = {
  top3: { ts: 0, entries: null },
  buybackSummary: { ts: 0, summary: null },
};

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

export function buildBuybackSummary(data, fxRateNumber) {
  const currentRows = Array.isArray(data?.current) ? data.current : [];
  const mandateRows = currentRows.filter(
    (row) => row?.Datum && row.Datum >= BUYBACK_MANDATE_START_DATE && Number(row?.Antal_aktier) > 0
  );
  const sharesRepurchased = mandateRows.reduce((sum, row) => sum + (Number(row?.Antal_aktier) || 0), 0);
  const usedSek = mandateRows.reduce((sum, row) => sum + (Number(row?.Transaktionsvärde) || 0), 0);
  const budgetSek = Number.isFinite(fxRateNumber) ? BUYBACK_CASH_EUR * fxRateNumber : null;
  const remainingSek = Number.isFinite(budgetSek) ? Math.max(budgetSek - usedSek, 0) : null;
  const remainingEur = Number.isFinite(fxRateNumber) ? Math.max(BUYBACK_CASH_EUR - usedSek / fxRateNumber, 0) : null;

  return {
    mandateStart: BUYBACK_MANDATE_START_DATE,
    mandateEur: BUYBACK_CASH_EUR,
    usedSek,
    usedEur: Number.isFinite(fxRateNumber) ? usedSek / fxRateNumber : null,
    remainingSek,
    remainingEur,
    sharesRepurchased,
    updatedAt: data?.updatedAt || new Date().toISOString(),
    syncError: data?.syncError || null,
    fallback: Boolean(data?.fallback),
  };
}

export function useLiveHeaderRemoteData({ fxRateNumber }) {
  const [latestTopWin, setLatestTopWin] = useState(null);
  const [loadingLatestTopWin, setLoadingLatestTopWin] = useState(false);
  const [buybackSummary, setBuybackSummary] = useState(null);
  const [lobbyAth, setLobbyAth] = useState(null);

  const fetchBuybackSummary = useCallback(async () => {
    const now = Date.now();
    if (now - remoteCaches.buybackSummary.ts < LIVE_CACHE_MS && remoteCaches.buybackSummary.summary) {
      setBuybackSummary(remoteCaches.buybackSummary.summary);
      return;
    }

    try {
      const res = await fetch("/api/buybacks/data", { cache: "no-store" });
      if (!res.ok) throw new Error(`buybacks failed: ${res.status}`);
      const data = await res.json();
      const summary = buildBuybackSummary(data, fxRateNumber);
      remoteCaches.buybackSummary = { ts: now, summary };
      setBuybackSummary(summary);
    } catch (error) {
      console.warn("[LiveHeader] Failed to fetch buyback summary:", error);
      const fallbackSummary = buildBuybackFallbackSummary(fxRateNumber, error);
      remoteCaches.buybackSummary = { ts: now, summary: fallbackSummary };
      setBuybackSummary(fallbackSummary);
    }
  }, [fxRateNumber]);

  useEffect(() => {
    let isActive = true;
    let latestRequestId = 0;

    const loadLobbyOverview = async () => {
      try {
        const res = await fetch(`/api/casinoscores/lobby/overview?days=${LOBBY_ATH_DAYS}`);
        if (!res.ok) throw new Error(`overview failed: ${res.status}`);
        const data = await res.json();
        if (!isActive) return;
        setLobbyAth(data?.ath || null);
      } catch (error) {
        if (!isActive) return;
        console.warn("[LiveHeader] Failed to fetch lobby overview:", error);
        setLobbyAth(null);
      }
    };

    const loadLatestTopWin = async () => {
      const now = Date.now();
      if (now - remoteCaches.top3.ts < LIVE_CACHE_MS && Array.isArray(remoteCaches.top3.entries)) {
        setLatestTopWin(extractLatestTopWin(remoteCaches.top3.entries));
        return;
      }
      if (!isActive) return;
      latestRequestId += 1;
      const requestId = latestRequestId;
      setLoadingLatestTopWin(true);
      try {
        const res = await fetch(LIVE_TOP3_ENDPOINT);
        if (!res.ok) throw new Error(`live top3 failed: ${res.status}`);
        const data = await res.json();
        if (!isActive || requestId !== latestRequestId) return;
        const entries = data?.entries ?? [];
        remoteCaches.top3 = { ts: Date.now(), entries };
        setLatestTopWin(extractLatestTopWin(entries));
      } catch (error) {
        if (!isActive || requestId !== latestRequestId) return;
        console.warn("[LiveHeader] Failed to fetch latest top win:", error);
        setLatestTopWin(null);
      } finally {
        if (!isActive || requestId !== latestRequestId) return;
        setLoadingLatestTopWin(false);
      }
    };

    const handleFocus = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      loadLatestTopWin();
      loadLobbyOverview();
      fetchBuybackSummary();
    };

    loadLatestTopWin();
    loadLobbyOverview();
    fetchBuybackSummary();
    const intervalId = setInterval(loadLatestTopWin, TOP_WIN_REFRESH_INTERVAL);
    const buybackIntervalId = setInterval(fetchBuybackSummary, 30 * 60 * 1000);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("visibilitychange", handleFocus);

    return () => {
      isActive = false;
      clearInterval(intervalId);
      clearInterval(buybackIntervalId);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("visibilitychange", handleFocus);
    };
  }, [fetchBuybackSummary]);

  return {
    latestTopWin,
    loadingLatestTopWin,
    lobbyAth,
    buybackSummary,
  };
}
