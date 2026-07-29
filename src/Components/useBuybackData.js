"use client";

// React adapter for the shared buyback data resource.

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { buybackDataResource } from "../lib/buybackDataClient.js";

export function useBuybackData({ enabled = true, refreshIntervalMs = 0 } = {}) {
  const snapshot = useSyncExternalStore(
    buybackDataResource.subscribe,
    buybackDataResource.getSnapshot,
    buybackDataResource.getServerSnapshot
  );

  const refresh = useCallback(
    () => (enabled ? buybackDataResource.refresh() : Promise.resolve(null)),
    [enabled]
  );
  const reload = useCallback(
    () => (enabled ? buybackDataResource.load() : Promise.resolve(null)),
    [enabled]
  );

  useEffect(() => {
    if (!enabled) return undefined;

    buybackDataResource.load().catch(() => {});
    if (!Number.isFinite(refreshIntervalMs) || refreshIntervalMs <= 0) return undefined;

    const intervalId = window.setInterval(() => {
      buybackDataResource.refresh().catch(() => {});
    }, refreshIntervalMs);

    return () => window.clearInterval(intervalId);
  }, [enabled, refreshIntervalMs]);

  return {
    ...snapshot,
    loading: snapshot.status === "loading",
    reload,
    refresh,
  };
}
