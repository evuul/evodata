// Provides a resilient EUR/SEK rate while preserving the latest valid observation.

'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { fetchFxRateShared, shouldPersistFxPayload } from "@/lib/quoteFxClient";
import { subscribeLiveDataSource } from "@/lib/liveDataCoordinator";

const DEFAULT_META = { base: "EUR", quote: "SEK", source: "fallback" };
const STORAGE_KEY = "evodata:fx:eursek";

const FxRateContext = createContext({
  rate: 11.02,
  loading: true,
  error: null,
  lastUpdated: null,
  refresh: () => {},
  meta: DEFAULT_META,
  dataStatus: "idle",
});

export const FxRateProvider = ({
  children,
  fallbackRate = 11.02,
  refreshInterval = 60 * 60 * 1000, // varje timme
  enabled = true,
} = {}) => {
  const [rate, setRate] = useState(fallbackRate);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [meta, setMeta] = useState(DEFAULT_META);
  const [dataStatus, setDataStatus] = useState("idle");
  const lastGoodRateRef = useRef(null);

  const persistToStorage = useCallback((payload) => {
    if (typeof window === "undefined") return;
    try {
      if (!shouldPersistFxPayload(payload)) return;
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          rate: payload.rate,
          meta: payload.meta,
          timestamp: payload.timestamp,
        })
      );
    } catch {
      /* storage kanske är full eller blockad – ignoreras */
    }
  }, []);

  const fetchRate = useCallback(
    async ({ silent = false, force = false } = {}) => {
      if (!enabled) {
        setLoading(false);
        return;
      }
      if (!silent) setLoading(true);
      setError(null);
      try {
        const result = await fetchFxRateShared({ force });
        const payload = result.data;
        const fx = payload.rate;
        const metaPayload = {
          base: payload?.base ?? DEFAULT_META.base,
          quote: payload?.quote ?? DEFAULT_META.quote,
          source: payload?.source ?? "unknown",
          freshness: result.status,
        };
        const parsedTimestamp = payload?.updatedAt ? new Date(payload.updatedAt).getTime() : NaN;
        const timestamp = Number.isFinite(parsedTimestamp) ? parsedTimestamp : result.updatedAt || Date.now();

        if (result.status === "fallback" && lastGoodRateRef.current) {
          setError("Visar senast giltiga växelkurs");
          setDataStatus("stale");
          return;
        }

        setRate(fx);
        setMeta(metaPayload);
        setLastUpdated(new Date(timestamp));
        setDataStatus(result.status);
        if (result.status !== "fallback") lastGoodRateRef.current = fx;
        if (result.error) setError("Visar senast giltiga växelkurs");

        persistToStorage({ rate: fx, meta: metaPayload, timestamp });
      } catch {
        setError("Kunde inte hämta växelkurs");
        setDataStatus(lastGoodRateRef.current ? "stale" : "fallback");
        if (!lastGoodRateRef.current) {
          setRate(fallbackRate);
          setMeta({ ...DEFAULT_META, source: "fallback", freshness: "fallback" });
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [enabled, fallbackRate, persistToStorage]
  );

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return () => {};
    }

    let shouldFetch = true;
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const cached = JSON.parse(raw);
          const cachedRate = Number(cached?.rate);
          const cachedTimestamp = Number(cached?.timestamp);
          if (Number.isFinite(cachedRate) && cachedRate > 0 && Number.isFinite(cachedTimestamp)) {
            const age = Date.now() - cachedTimestamp;
            if (refreshInterval <= 0 || age < refreshInterval) {
              setRate(cachedRate);
              setMeta(cached?.meta ?? DEFAULT_META);
              setLastUpdated(new Date(cachedTimestamp));
              setDataStatus("cache");
              lastGoodRateRef.current = cachedRate;
              setLoading(false);
              shouldFetch = false;
            }
          }
        }
      } catch {
        /* ogiltig storage – ignoreras */
      }
    }

    if (shouldFetch) {
      fetchRate();
    }

    return subscribeLiveDataSource(
      "fx:eursek",
      () => fetchRate({ silent: true, force: true }),
      refreshInterval
    );
  }, [enabled, fetchRate, refreshInterval]);

  const value = useMemo(
    () => ({
      rate,
      loading,
      error,
      lastUpdated,
      refresh: () => fetchRate({ force: true }),
      meta,
      dataStatus,
    }),
    [rate, loading, error, lastUpdated, fetchRate, meta, dataStatus]
  );

  return <FxRateContext.Provider value={value}>{children}</FxRateContext.Provider>;
};

export const useFxRateContext = () => useContext(FxRateContext);
