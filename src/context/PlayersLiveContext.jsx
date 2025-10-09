"use client";
import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from "react";

// Samma speldefinition som du använder i listan/header
export const GAMES = [
  { id: "crazy-time",    label: "Crazy Time",    apiSlug: "crazy-time" },
  { id: "crazy-time:a",  label: "Crazy Time A",  apiSlug: "crazy-time", apiVariant: "a" },
  { id: "monopoly-big-baller", label: "Big Baller", apiSlug: "monopoly-big-baller" },
  { id: "funky-time",            label: "Funky Time", apiSlug: "funky-time" },
  { id: "lightning-storm",       label: "Lightning Storm", apiSlug: "lightning-storm" },
  { id: "crazy-balls",           label: "Crazy Balls", apiSlug: "crazy-balls" },
  { id: "ice-fishing",           label: "Ice Fishing", apiSlug: "ice-fishing" },
  { id: "xxxtreme-lightning-roulette", label: "XXXtreme Lightning Roulette", apiSlug: "xxxtreme-lightning-roulette" },
  { id: "monopoly-live",         label: "Monopoly Live", apiSlug: "monopoly-live" },
  { id: "red-door-roulette",     label: "Red Door Roulette", apiSlug: "red-door-roulette" },
  { id: "auto-roulette",         label: "Auto Roulette", apiSlug: "auto-roulette" },
  { id: "speed-baccarat-a",      label: "Speed Baccarat A", apiSlug: "speed-baccarat-a" },
  { id: "super-andar-bahar",     label: "Super Andar Bahar", apiSlug: "super-andar-bahar" },
  { id: "lightning-dice",        label: "Lightning Dice", apiSlug: "lightning-dice" },
  { id: "lightning-roulette",    label: "Lightning Roulette", apiSlug: "lightning-roulette" },
  { id: "bac-bo",                label: "Bac Bo", apiSlug: "bac-bo" },
];

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

  const fetchAll = useCallback(async (force = false) => {
    const now = Date.now();
    const visible = typeof document === "undefined" ? true : document.visibilityState === "visible";

    if (!force && (!visible || now - lastFetchRef.current < MIN_COOLDOWN_MS)) {
      return; // respektera cooldown + endast när flik är synlig
    }
    lastFetchRef.current = now;

    setLoading(true);
    setError("");
    const out = {};
    try {
      await Promise.all(
        GAMES.map(async (g) => {
          const params = new URLSearchParams();
          if (g.apiVariant) params.set("variant", g.apiVariant);
          if (force) params.set("force", "1");
          const qs = params.toString() ? `?${params.toString()}` : "";
          try {
            const res = await fetch(`/api/casinoscores/players/${g.apiSlug}${qs}`, { cache: "no-store" });
            const j = await res.json();
            out[g.id] = j.ok
              ? { players: Number(j.players), updated: j.fetchedAt }
              : { players: null, updated: null, error: j.error || "error" };
          } catch (e) {
            out[g.id] = { players: null, updated: null, error: String(e?.message || e) };
          }
        })
      );
      setData(out);
      setLastUpdated(new Date());
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }, []);

  const hydrateFromCache = useCallback(async () => {
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
  }, []);

  // initial + events
  useEffect(() => {
    const id = setTimeout(() => {
      hydrateFromCache();
    }, 0);
    return () => clearTimeout(id);
  }, [hydrateFromCache]);

  useEffect(() => {
    const initialId = setTimeout(() => {
      fetchAll(true);
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
