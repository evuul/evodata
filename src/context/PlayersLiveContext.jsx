"use client";
import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { GAMES as BASE_GAMES } from "@/config/games";

// Samma speldefinition som du använder i listan/header
export const GAMES = BASE_GAMES;

// Gemensam cooldown / intervall
export const PLAYERS_POLL_INTERVAL_MS = 10 * 60 * 1000; // 10 minuter
const MIN_COOLDOWN_MS = PLAYERS_POLL_INTERVAL_MS;

const PlayersLiveContext = createContext(undefined);

export function PlayersLiveProvider({ children }) {
  const [data, setData] = useState({}); // { [id]: { players, updated, error? } }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const lastFetchRef = useRef(0);

  const mapSnapshotToState = useCallback((json) => {
    if (!json?.items) return {};
    const mapped = {};
    for (const item of json.items) {
      if (!item || typeof item.id !== "string") continue;
      const playersVal = Number(item.players);
      mapped[item.id] = {
        players: Number.isFinite(playersVal) ? playersVal : null,
        updated: item.fetchedAt || null,
        error: item.error || null,
      };
    }
    return mapped;
  }, []);

  const fetchAll = useCallback(async (force = false) => {
    const now = Date.now();
    const visible = typeof document === "undefined" ? true : document.visibilityState === "visible";

    if (!force && (!visible || now - lastFetchRef.current < MIN_COOLDOWN_MS)) {
      return; // respektera cooldown + endast när flik är synlig
    }
    lastFetchRef.current = now;

    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (force) params.set("refresh", "1");
      const qs = params.toString() ? `?${params.toString()}` : "";
      const res = await fetch(`/api/casinoscores/players/latest${qs}`, { cache: "no-store" });
      const json = await res.json();

      if (!res.ok || json?.ok !== true) {
        throw new Error(json?.error || `HTTP ${res.status}`);
      }

      const mapped = mapSnapshotToState(json);
      setData(mapped);
      setLastUpdated(json.updatedAt ? new Date(json.updatedAt) : new Date());
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }, [mapSnapshotToState]);

  const hydrateFromCache = useCallback(async () => {
    try {
      const res = await fetch("/api/casinoscores/players/latest", { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      if (!json?.ok || !Array.isArray(json.items)) return;

      const hydrated = mapSnapshotToState(json);
      setData((prev) => (Object.keys(prev).length ? prev : hydrated));
      if (json.updatedAt) {
        setLastUpdated((prev) => (prev ? prev : new Date(json.updatedAt)));
      }
    } catch {
      // ignorerar cachefel
    }
  }, [mapSnapshotToState]);

  // initial + events
  useEffect(() => {
    const id = setTimeout(() => {
      hydrateFromCache();
    }, 0);
    return () => clearTimeout(id);
  }, [hydrateFromCache]);

  useEffect(() => {
    const initialId = setTimeout(() => {
      fetchAll(false); // använd cron-cachen vid första laddningen
    }, 0);
    const onFocus = () => fetchAll(false);
    const onVis = () => fetchAll(false);
    window.addEventListener("focus", onFocus);
    window.addEventListener("visibilitychange", onVis);
    const id = setInterval(() => {
      if (document.visibilityState === "visible" && navigator.onLine) fetchAll(false);
    }, PLAYERS_POLL_INTERVAL_MS);
    return () => {
      clearTimeout(initialId);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("visibilitychange", onVis);
      clearInterval(id);
    };
  }, [fetchAll]);

  const value = useMemo(
    () => ({
      data,       // objekt per id
      loading,
      error,
      lastUpdated,
      refresh: (force = false) => fetchAll(force),
      GAMES,      // exportera listan så alla komponenter använder samma
    }),
    [data, loading, error, lastUpdated, fetchAll]
  );

  return <PlayersLiveContext.Provider value={value}>{children}</PlayersLiveContext.Provider>;
}

export function usePlayersLive() {
  const ctx = useContext(PlayersLiveContext);
  if (!ctx) throw new Error("usePlayersLive must be used within PlayersLiveProvider");
  return ctx;
}
