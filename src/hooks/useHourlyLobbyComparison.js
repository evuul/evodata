"use client";

// Keeps Hourly comparisons in sync with shared live data and the local clock.

import { useEffect, useMemo, useState } from "react";
import { buildHourlyLobbyComparison } from "@/lib/hourlyLobbyComparison";

export function useHourlyLobbyComparison({ baseline, liveGames, enabled, refreshBaseline }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    const update = () => {
      if (document.visibilityState !== "visible") return;
      setNow(Date.now());
      // The provider deduplicates reads for an hour and refreshes across midnight.
      refreshBaseline();
    };
    update();
    const timer = window.setInterval(update, 60 * 1000);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [enabled, refreshBaseline]);

  return useMemo(() => buildHourlyLobbyComparison({
    baseline: enabled ? baseline : null,
    items: Object.entries(liveGames ?? {}).map(([id, item]) => ({
      ...item, id, fetchedAt: item.updated,
    })),
    now,
  }), [baseline, liveGames, now, enabled]);
}
