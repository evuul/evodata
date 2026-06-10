"use client";

// Current short-interest value and refresh cadence for the live header.

import { useCallback, useEffect, useState } from "react";
import { fetchLatestShortPercent } from "@/lib/shortSnapshotClient";

const LIVE_CACHE_MS = 2 * 60 * 1000;
const REFRESH_INTERVAL_MS = 30 * 60 * 1000;

const shortCache = { ts: 0, percent: null };

export function useLiveHeaderShortInterest() {
  const [shortPercent, setShortPercent] = useState(null);
  const [loadingShort, setLoadingShort] = useState(false);

  const refreshShortInterest = useCallback(async () => {
    const now = Date.now();
    if (now - shortCache.ts < LIVE_CACHE_MS && shortCache.percent != null) {
      setShortPercent(shortCache.percent);
      return;
    }

    try {
      setLoadingShort(true);
      const latest = await fetchLatestShortPercent();
      if (!latest) return;
      setShortPercent(latest.percent);
      shortCache.ts = now;
      shortCache.percent = latest.percent;
    } catch {
      /* keep the previous header value if the short APIs are unavailable */
    } finally {
      setLoadingShort(false);
    }
  }, []);

  useEffect(() => {
    refreshShortInterest();
  }, [refreshShortInterest]);

  useEffect(() => {
    const handleFocus = () => refreshShortInterest();
    window.addEventListener("focus", handleFocus);
    window.addEventListener("visibilitychange", handleFocus);
    const id = setInterval(refreshShortInterest, REFRESH_INTERVAL_MS);
    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("visibilitychange", handleFocus);
      clearInterval(id);
    };
  }, [refreshShortInterest]);

  return {
    shortPercent,
    loadingShort,
    refreshShortInterest,
  };
}
