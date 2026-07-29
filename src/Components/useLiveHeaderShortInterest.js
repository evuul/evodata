"use client";

// Current short-interest value and refresh cadence for the live header.

import { useCallback, useEffect, useState } from "react";
import { fetchLatestShortPercent } from "@/lib/shortSnapshotClient";

const REFRESH_INTERVAL_MS = 30 * 60 * 1000;

export function useLiveHeaderShortInterest() {
  const [shortPercent, setShortPercent] = useState(null);
  const [loadingShort, setLoadingShort] = useState(false);

  const refreshShortInterest = useCallback(async (force = false) => {
    try {
      setLoadingShort(true);
      const latest = await fetchLatestShortPercent({ force: force === true });
      if (!latest) return;
      setShortPercent(latest.percent);
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
    const id = setInterval(() => refreshShortInterest(true), REFRESH_INTERVAL_MS);
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
