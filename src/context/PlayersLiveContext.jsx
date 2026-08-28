"use client";

// Provides shared live player counts and lobby statistics to authenticated dashboard views.

import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { GAMES as GAME_CONFIG } from "@/config/games";
import { useAuth } from "@/context/AuthContext";
import {
  fetchAllPlayersShared,
  fetchLatestPlayersShared,
  fetchLobbyStatsShared,
} from "@/lib/casinoScoresClient";
import { fetchHourlyLobbyBaseline } from "@/lib/hourlyLobbyClient";
import { subscribeLiveDataSource } from "@/lib/liveDataCoordinator";
import { finiteNumberOrNull } from "@/lib/livePlayerSnapshot";

export const GAMES = GAME_CONFIG;

// 🔁 Gemensam cooldown / intervall
export const PLAYERS_POLL_INTERVAL_MS = 20 * 60 * 1000; // 20 minuter
const MIN_COOLDOWN_MS = PLAYERS_POLL_INTERVAL_MS;

const PlayersLiveContext = createContext(undefined);

export function PlayersLiveProvider({ children, enabled = true }) {
  const { token, user } = useAuth();
  const hasHourlyAccess = Boolean(user?.isAdmin || user?.isFounder || user?.isSubscriber);
  const hourlyAccessKey = hasHourlyAccess ? String(user?.email || "").trim().toLowerCase() : null;
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
    hourlyCoverage: null,
    hourlyLiveUpdatedAt: null,
    updatedAt: null,
  });
  const [hourlyLoading, setHourlyLoading] = useState(false);
  const [hourlyError, setHourlyError] = useState("");
  const lastFetchRef = useRef(0);
  const lastLobbyStatsFetchRef = useRef(0);
  const lastHourlyStatsFetchRef = useRef({ accessKey: null, at: 0 });
  const activeHourlyAccessKeyRef = useRef(null);

  const fetchLobbyStats = useCallback(
    async (force = false) => {
      if (!enabled) return;
      const now = Date.now();
      if (!force && now - lastLobbyStatsFetchRef.current < MIN_COOLDOWN_MS) {
        return;
      }
      lastLobbyStatsFetchRef.current = now;
      try {
        const json = await fetchLobbyStatsShared({ force });
        if (!json?.ok) return;
        setLobbyStats((current) => ({
          ...current,
          todayPeak: json.todayPeak ?? null,
          yesterdayPeak: json.yesterdayPeak ?? null,
          lobbyAth: json.lobbyAth ?? null,
          updatedAt: json.updatedAt ?? null,
        }));
      } catch {
        lastLobbyStatsFetchRef.current = 0;
      }
    },
    [enabled]
  );

  const fetchHourlyStats = useCallback(async (force = false) => {
    if (!enabled || !hourlyAccessKey) return null;
    const now = Date.now();
    const previous = lastHourlyStatsFetchRef.current;
    if (!force && previous.accessKey === hourlyAccessKey && now - previous.at < MIN_COOLDOWN_MS) {
      return null;
    }

    lastHourlyStatsFetchRef.current = { accessKey: hourlyAccessKey, at: now };
    setHourlyLoading(true);
    setHourlyError("");
    try {
      const json = await fetchHourlyLobbyBaseline(token);
      if (activeHourlyAccessKeyRef.current !== hourlyAccessKey) return null;
      setLobbyStats((current) => ({
        ...current,
        hourlyComparison: json?.hourlyComparison ?? null,
        hourlyByHour: Array.isArray(json?.hourlyByHour) ? json.hourlyByHour : [],
        hourlyCoverage: json?.coverage ?? null,
        hourlyLiveUpdatedAt: json?.liveUpdatedAt ?? null,
      }));
      return json;
    } catch (error) {
      if (activeHourlyAccessKeyRef.current !== hourlyAccessKey) return null;
      lastHourlyStatsFetchRef.current = { accessKey: null, at: 0 };
      setHourlyError(error instanceof Error ? error.message : String(error));
      return null;
    } finally {
      if (activeHourlyAccessKeyRef.current === hourlyAccessKey) {
        setHourlyLoading(false);
      }
    }
  }, [enabled, hourlyAccessKey, token]);

  useEffect(() => {
    if (activeHourlyAccessKeyRef.current === hourlyAccessKey) return;
    activeHourlyAccessKeyRef.current = hourlyAccessKey;
    lastHourlyStatsFetchRef.current = { accessKey: null, at: 0 };
    setHourlyLoading(false);
    setHourlyError("");
    setLobbyStats((current) => ({
      ...current,
      hourlyComparison: null,
      hourlyByHour: [],
      hourlyCoverage: null,
      hourlyLiveUpdatedAt: null,
    }));
  }, [hourlyAccessKey]);

  const fetchAll = useCallback(async (force = false) => {
    if (!enabled) return null;
    const now = Date.now();
    const visible = typeof document === "undefined" ? true : document.visibilityState === "visible";

    if (!force && (!visible || now - lastFetchRef.current < MIN_COOLDOWN_MS)) {
      return null; // respektera cooldown + endast när flik är synlig
    }
    lastFetchRef.current = now;

    setLoading(true);
    setError("");

    try {
      const json = await fetchAllPlayersShared({ force });

      if (!json?.ok) {
        throw new Error(json?.error || "Live player data is unavailable");
      }

      const map = {};
      if (Array.isArray(json.items)) {
          json.items.forEach((item) => {
            const id = item?.id;
            if (!id) return;
            const players = finiteNumberOrNull(item?.players);
            map[id] = {
              players,
              updated: item?.fetchedAt ?? null,
              stale: item?.stale ?? false,
              stuck: item?.stuck ?? false,
              stuckDays: Number.isFinite(Number(item?.stuckDays)) ? Math.round(Number(item.stuckDays)) : null,
              stuckSince: item?.stuckSince ?? null,
              stuckLatestAt: item?.stuckLatestAt ?? null,
              stuckValue: Number.isFinite(Number(item?.stuckValue)) ? Math.round(Number(item.stuckValue)) : null,
              stuckRunLength: Number.isFinite(Number(item?.stuckRunLength))
                ? Math.round(Number(item.stuckRunLength))
                : null,
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
      return true;
    } catch (e) {
      lastFetchRef.current = 0;
      setError(String(e?.message || e));
      return false;
    } finally {
      setLoading(false);
    }
  }, [enabled, fetchLobbyStats]);

  const hydrateFromCache = useCallback(async () => {
    if (!enabled) return;
    try {
      const json = await fetchLatestPlayersShared();
      if (!json?.ok || !Array.isArray(json.items)) return;

      const hydrated = {};
      for (const item of json.items) {
        if (!item || typeof item.id !== "string") continue;
        const playersVal = finiteNumberOrNull(item.players);
        hydrated[item.id] = {
          players: playersVal,
          updated: item.fetchedAt || null,
          stale: item?.stale ?? false,
          stuck: item?.stuck ?? false,
          stuckDays: Number.isFinite(Number(item?.stuckDays)) ? Math.round(Number(item.stuckDays)) : null,
          stuckSince: item?.stuckSince || null,
          stuckLatestAt: item?.stuckLatestAt || null,
          stuckValue: Number.isFinite(Number(item?.stuckValue)) ? Math.round(Number(item.stuckValue)) : null,
          stuckRunLength: Number.isFinite(Number(item?.stuckRunLength))
            ? Math.round(Number(item.stuckRunLength))
            : null,
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
    fetchLobbyStats(true);
  }, [fetchLobbyStats]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return () => {};
    }
    let active = true;
    fetchAll(false).then((loaded) => {
      if (active && loaded === false) hydrateFromCache();
    });
    const onFocus = () => fetchAll(false);
    const onVis = () => fetchAll(false);
    window.addEventListener("focus", onFocus);
    window.addEventListener("visibilitychange", onVis);
    const unsubscribe = subscribeLiveDataSource("players", () => fetchAll(false), PLAYERS_POLL_INTERVAL_MS);
    return () => {
      active = false;
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("visibilitychange", onVis);
      unsubscribe();
    };
  }, [enabled, fetchAll, hydrateFromCache]);

  const value = useMemo(
    () => ({
      data,
      loading,
      error,
      lastUpdated,
      refresh: (force = false) => fetchAll(force),
      GAMES,
      lobbyStats,
      hourlyLoading,
      hourlyError,
      refreshHourlyStats: fetchHourlyStats,
    }),
    [data, loading, error, lastUpdated, fetchAll, lobbyStats, hourlyLoading, hourlyError, fetchHourlyStats]
  );

  return <PlayersLiveContext.Provider value={value}>{children}</PlayersLiveContext.Provider>;
}

export function usePlayersLive() {
  const ctx = useContext(PlayersLiveContext);
  if (!ctx) throw new Error("usePlayersLive must be used within PlayersLiveProvider");
  return ctx;
}
