"use client";
import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { GAMES as GAME_CONFIG } from "@/config/games";
import { useAuth } from "@/context/AuthContext";

export const GAMES = GAME_CONFIG;

// 🔁 Gemensam cooldown / intervall
export const PLAYERS_POLL_INTERVAL_MS = 20 * 60 * 1000; // 20 minuter
const MIN_COOLDOWN_MS = PLAYERS_POLL_INTERVAL_MS;

const PlayersLiveContext = createContext(undefined);
const INITIAL_FETCH_DELAY_MS = 4000;
const INCLUDE_HOURLY_LOCAL =
  process.env.NEXT_PUBLIC_LOCAL_HOURLY_COMPARE === "1";

export function PlayersLiveProvider({ children, enabled = true }) {
  const { user } = useAuth();
  const isAdmin = Boolean(user?.isAdmin);
  const [data, setData] = useState({}); // { [id]: { players, updated, error? } }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [lobbyStats, setLobbyStats] = useState({
    todayPeak: null,
    yesterdayPeak: null,
    lobbyAth: null,
    hourlyComparison: null,
    hourlyByHour: [],
    updatedAt: null,
  });
  const lastFetchRef = useRef(0);
  const lastLobbyStatsFetchRef = useRef(0);

  const fetchLobbyStats = useCallback(
    async (force = false) => {
      if (!enabled) return;
      const now = Date.now();
      if (!force && now - lastLobbyStatsFetchRef.current < MIN_COOLDOWN_MS) {
        return;
      }
      lastLobbyStatsFetchRef.current = now;
      try {
        const includeHourly = isAdmin || INCLUDE_HOURLY_LOCAL;
        const qp = includeHourly ? "?includeHourly=1" : "";
        const res = await fetch(`/api/casinoscores/lobby/stats${qp}`);
        if (!res.ok) return;
        const json = await res.json();
        if (!json?.ok) return;
        setLobbyStats({
          todayPeak: json.todayPeak ?? null,
          yesterdayPeak: json.yesterdayPeak ?? null,
          lobbyAth: json.lobbyAth ?? null,
          hourlyComparison: includeHourly ? json.hourlyComparison ?? null : null,
          hourlyByHour: includeHourly && Array.isArray(json.hourlyByHour) ? json.hourlyByHour : [],
          updatedAt: json.updatedAt ?? null,
        });
      } catch {
        // ignorerar statsfel
      }
    },
    [enabled, isAdmin]
  );

  const fetchAll = useCallback(async (force = false) => {
    if (!enabled) return;
    const now = Date.now();
    const visible = typeof document === "undefined" ? true : document.visibilityState === "visible";

    if (!force && (!visible || now - lastFetchRef.current < MIN_COOLDOWN_MS)) {
      return; // respektera cooldown + endast när flik är synlig
    }
    lastFetchRef.current = now;

    setLoading(true);
    setError("");

    const params = new URLSearchParams();
    if (force) params.set("force", "1");
    const qs = params.toString() ? `?${params.toString()}` : "";

    try {
      const res = await fetch(`/api/casinoscores/players/all${qs}`);
      const json = await res.json();

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `HTTP ${res.status}`);
      }

      const map = {};
      if (Array.isArray(json.items)) {
        json.items.forEach((item) => {
          const id = item?.id;
          if (!id) return;
          const players = Number(item?.players);
          map[id] = {
            players: Number.isFinite(players) ? players : null,
            updated: item?.fetchedAt ?? null,
            stale: item?.stale ?? false,
          };
        });
      }

      setData((prev) => {
        const merged = {};
        for (const g of GAMES) {
          const next = map[g.id] ?? { players: null, updated: null };
          const prevEntry = prev?.[g.id];
          if (Number.isFinite(next.players)) {
            merged[g.id] = next;
          } else if (prevEntry && Number.isFinite(prevEntry.players)) {
            merged[g.id] = { ...prevEntry, stale: true };
          } else {
            merged[g.id] = next;
          }
        }
        return merged;
      });

      if (json.fetchedAt) {
        const parsed = Date.parse(json.fetchedAt);
        if (Number.isFinite(parsed)) {
          setLastUpdated(new Date(parsed));
        }
      }

      fetchLobbyStats(force);
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }, [enabled, fetchLobbyStats]);

  const hydrateFromCache = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await fetch("/api/casinoscores/players/latest");
      if (!res.ok) return;
      const json = await res.json();
      if (!json?.ok || !Array.isArray(json.items)) return;

      const hydrated = {};
      for (const item of json.items) {
        if (!item || typeof item.id !== "string") continue;
        const playersVal = Number(item.players);
        hydrated[item.id] = {
          players: Number.isFinite(playersVal) ? playersVal : null,
          updated: item.fetchedAt || null,
        };
      }

      setData((prev) => (Object.keys(prev).length ? prev : hydrated));
      if (json.updatedAt) {
        setLastUpdated((prev) => (prev ? prev : new Date(json.updatedAt)));
      }
      fetchLobbyStats(true);
    } catch {
      // ignorerar cachefel
    }
  }, [enabled, fetchLobbyStats]);

  // initial + events
  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return () => {};
    }
    const id = setTimeout(() => {
      hydrateFromCache();
    }, 0);
    return () => clearTimeout(id);
  }, [hydrateFromCache, enabled]);

  useEffect(() => {
    fetchLobbyStats(true);
  }, [fetchLobbyStats]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return () => {};
    }
    const initialId = setTimeout(() => {
      fetchAll(false);
    }, INITIAL_FETCH_DELAY_MS);
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
  }, [enabled, fetchAll]);

  const value = useMemo(
    () => ({
      data,
      loading,
      error,
      lastUpdated,
      refresh: (force = false) => fetchAll(force),
      GAMES,
      lobbyStats,
    }),
    [data, loading, error, lastUpdated, fetchAll, lobbyStats]
  );

  return <PlayersLiveContext.Provider value={value}>{children}</PlayersLiveContext.Provider>;
}

export function usePlayersLive() {
  const ctx = useContext(PlayersLiveContext);
  if (!ctx) throw new Error("usePlayersLive must be used within PlayersLiveProvider");
  return ctx;
}
