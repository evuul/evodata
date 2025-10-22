"use client";
import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { GAMES as GAME_CONFIG } from "@/config/games";

export const GAMES = GAME_CONFIG;

// 🔁 Gemensam cooldown / intervall
export const PLAYERS_POLL_INTERVAL_MS = 10 * 60 * 1000; // 10 minuter
const MIN_COOLDOWN_MS = PLAYERS_POLL_INTERVAL_MS;

const PlayersLiveContext = createContext(undefined);
const INITIAL_FETCH_DELAY_MS = 4000;

export function PlayersLiveProvider({ children, enabled = true }) {
  const [data, setData] = useState({}); // { [id]: { players, updated, error? } }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const lastFetchRef = useRef(0);

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
      const res = await fetch(`/api/casinoscores/players/all${qs}`, { cache: "no-store" });
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
        setLastUpdated(Number.isFinite(parsed) ? new Date(parsed) : new Date());
      } else {
        setLastUpdated(new Date());
      }
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  const hydrateFromCache = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await fetch("/api/casinoscores/players/latest", { cache: "no-store" });
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
    } catch {
      // ignorerar cachefel
    }
  }, [enabled]);

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
    if (!enabled) {
      setLoading(false);
      return () => {};
    }
    const initialId = setTimeout(() => {
      fetchAll(true);
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
