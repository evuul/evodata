'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const DEFAULT_META = { base: "EUR", quote: "SEK", source: "fallback" };
const STORAGE_KEY = "evodata:fx:eursek";

const FxRateContext = createContext({
  rate: 11.02,
  loading: true,
  error: null,
  lastUpdated: null,
  refresh: () => {},
  meta: DEFAULT_META,
});

export const FxRateProvider = ({
  children,
  fallbackRate = 11.02,
  refreshInterval = 60 * 60 * 1000, // varje timme
} = {}) => {
  const [rate, setRate] = useState(fallbackRate);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [meta, setMeta] = useState(DEFAULT_META);

  const persistToStorage = useCallback((payload) => {
    if (typeof window === "undefined") return;
    try {
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
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/fx", { cache: "no-store" });
        if (!res.ok) {
          throw new Error(`FX request failed with status ${res.status}`);
        }
        const payload = await res.json();
        const fx = Number(payload?.rate);
        if (!Number.isFinite(fx) || fx <= 0) {
          throw new Error("Invalid FX payload");
        }
        const metaPayload = {
          base: payload?.base ?? DEFAULT_META.base,
          quote: payload?.quote ?? DEFAULT_META.quote,
          source: payload?.source ?? "unknown",
        };
        const timestamp = payload?.updatedAt ? new Date(payload.updatedAt).getTime() : Date.now();

        setRate(fx);
        setMeta(metaPayload);
        setLastUpdated(new Date(timestamp));

        persistToStorage({ rate: fx, meta: metaPayload, timestamp });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Kunde inte hämta växelkurs");
        setRate((prev) => prev ?? fallbackRate);
        setMeta((prev) => ({ ...prev, source: "fallback" }));
        setLastUpdated(new Date());

        persistToStorage({
          rate: fallbackRate,
          meta: { ...DEFAULT_META, source: "fallback" },
          timestamp: Date.now(),
        });
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [fallbackRate, persistToStorage]
  );

  useEffect(() => {
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

    let id;
    if (refreshInterval > 0) {
      id = setInterval(() => fetchRate({ silent: true }), refreshInterval);
    }
    return () => {
      if (id) clearInterval(id);
    };
  }, [fetchRate, refreshInterval]);

  const value = useMemo(
    () => ({
      rate,
      loading,
      error,
      lastUpdated,
      refresh: fetchRate,
      meta,
    }),
    [rate, loading, error, lastUpdated, fetchRate, meta]
  );

  return <FxRateContext.Provider value={value}>{children}</FxRateContext.Provider>;
};

export const useFxRateContext = () => useContext(FxRateContext);
