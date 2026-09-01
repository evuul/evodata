"use client";

// Lazily loads and caches the static datasets required by the active dashboard panel.

import { useCallback, useEffect, useMemo, useState } from "react";
import { combineBuybackSnapshots } from "@/lib/buybackSnapshots";
import { getDashboardPanelDataKeys } from "@/lib/dashboardPanelData";

const loaderPromises = new Map();

async function readDefault(modulePromise) {
  const resolvedModule = await modulePromise;
  return resolvedModule.default;
}

const DATA_LOADERS = Object.freeze({
  financialReports: () => readDefault(import("@/app/data/financialReports.json")),
  averagePlayersData: () => readDefault(import("@/app/data/averagePlayers.json")),
  dividendData: () => readDefault(import("@/app/data/dividendData.json")),
  sharesData: () => readDefault(import("@/app/data/amountOfShares.json")),
  buybackData: async () => {
    const [historicalBuybacks, currentBuybacks] = await Promise.all([
      readDefault(import("@/app/data/oldBuybackData.json")),
      readDefault(import("@/app/data/buybackData.json")),
    ]);
    return combineBuybackSnapshots(historicalBuybacks, currentBuybacks);
  },
});

function loadDataKey(key) {
  if (loaderPromises.has(key)) return loaderPromises.get(key);
  const loader = DATA_LOADERS[key];
  if (!loader) return Promise.reject(new Error(`Unknown dashboard data key: ${key}`));

  const promise = loader().catch((error) => {
    loaderPromises.delete(key);
    throw error;
  });
  loaderPromises.set(key, promise);
  return promise;
}

export default function useDashboardPanelData({ activePanel, cashView }) {
  const requiredKeys = useMemo(
    () => getDashboardPanelDataKeys(activePanel, cashView),
    [activePanel, cashView]
  );
  const requirementKey = requiredKeys.join("|");
  const [data, setData] = useState({});
  const [state, setState] = useState({ status: "idle", error: null, requestKey: "", retryKey: 0 });

  useEffect(() => {
    let cancelled = false;
    if (!requiredKeys.length) {
      setState((current) => ({ ...current, status: "success", error: null, requestKey: requirementKey }));
      return () => {
        cancelled = true;
      };
    }

    setState((current) => ({ ...current, status: "loading", error: null, requestKey: requirementKey }));
    Promise.all(requiredKeys.map(async (key) => [key, await loadDataKey(key)]))
      .then((entries) => {
        if (cancelled) return;
        setData((current) => ({ ...current, ...Object.fromEntries(entries) }));
        setState((current) => ({ ...current, status: "success", error: null, requestKey: requirementKey }));
      })
      .catch((error) => {
        if (cancelled) return;
        setState((current) => ({ ...current, status: "error", error, requestKey: requirementKey }));
      });

    return () => {
      cancelled = true;
    };
  }, [requiredKeys, requirementKey, state.retryKey]);

  const retry = useCallback(() => {
    requiredKeys.forEach((key) => loaderPromises.delete(key));
    setState((current) => ({ ...current, retryKey: current.retryKey + 1 }));
  }, [requiredKeys]);

  const hasRequiredData = requiredKeys.every((key) => Object.hasOwn(data, key));
  const stateMatchesPanel = state.requestKey === requirementKey;

  return {
    data,
    loading:
      requiredKeys.length > 0 &&
      !hasRequiredData &&
      (!stateMatchesPanel || state.status !== "error"),
    error: stateMatchesPanel && state.status === "error" ? state.error : null,
    retry,
  };
}
