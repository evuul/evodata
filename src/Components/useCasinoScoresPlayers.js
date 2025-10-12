"use client";
import { useCallback, useEffect, useRef, useState } from "react";

const STALE_MS = 10 * 60 * 1000; // 10 minuter
const LOBBY_URL =
  "https://api.casinoscores.com/cg-neptune-notification-center/api/evolobby/playercount/latest";

const LOBBY_KEYS = {
  "crazy-time": { default: "crazyTime", a: "crazyTimeA" },
  "monopoly-live": "monopolyLive",
  "monopoly-big-baller": "monopolyBigBallerLive",
  "funky-time": "funkyTime",
  "lightning-roulette": "lightningRoulette",
  "lightning-baccarat": "lightningBaccarat",
  "xxxtreme-lightning-roulette": "xxxtremeLightningRoulette",
  "immersive-roulette": "immersiveRoulette",
  "cash-or-crash-live": "cashOrCrashLive",
  "fan-tan-live": "fanTanLive",
  "mega-ball": "megaBall",
  "free-bet-blackjack": "freeBetBlackjack",
  "dream-catcher": "dreamCatcher",
  "dead-or-alive-saloon": "deadOrAliveSaloon",
  "red-door-roulette": "redDoorRoulette",
  "lightning-dice": "lightningDice",
  "lightning-storm": "lightningStorm",
  "crazy-balls": "crazyBalls",
  "bac-bo": "bacBo",
  "super-andar-bahar": "superAndarBahar",
  "speed-baccarat-a": "speedBaccaratA",
  "lightning-bac-bo": "lightningBacBo",
  "auto-roulette": "autoRoulette",
  "super-sic-bo": "superSicBo",
  "fortune-roulette": "fortuneRoulette",
  "ice-fishing": "iceFishing",
};

export function useCasinoScoresPlayers(slug, { pollMs = 60_000, variant } = {}) {
  const [players, setPlayers] = useState(null);
  const [fetchedAt, setFetchedAt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setErr] = useState("");
  const timerRef = useRef(null);
  const playersRef = useRef(null);
  const lastLobbyFetchRef = useRef(0);

  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  const fetchLobbyFallback = useCallback(async () => {
    const entry = LOBBY_KEYS[slug];
    if (!entry) return null;

    const now = Date.now();
    if (now - lastLobbyFetchRef.current < 30_000) {
      return null; // throttle direkthämtning
    }
    lastLobbyFetchRef.current = now;

    const key =
      typeof entry === "string"
        ? entry
        : entry[variant === "a" ? "a" : "default"] || entry.default;
    if (!key) return null;

    try {
      const res = await fetch(`${LOBBY_URL}?ts=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) return null;
      const json = await res.json();
      const raw = json?.gameShowPlayerCounts?.[key];
      if (raw == null) return null;
      const numeric = parseInt(String(raw).replace(/[^\d]/g, ""), 10);
      if (!Number.isFinite(numeric) || numeric < 0) return null;
      const iso = json?.createdAt || new Date().toISOString();
      return { players: numeric, fetchedAt: iso };
    } catch {
      return null;
    }
  }, [slug, variant]);

  const fetchNow = useCallback(async (force = false) => {
    if (!slug) return;
    const previousPlayers = playersRef.current;
    try {
      setLoading(true);
      setErr("");
      const params = new URLSearchParams();
      if (variant) params.set("variant", variant);
      if (force) params.set("force", "1");
      const qs = params.toString();
      const res = await fetch(`/api/casinoscores/players/${slug}${qs ? `?${qs}` : ""}`, {
        cache: "no-cache",
      });
      let shouldTryLobby = false;
      if (!res.ok) {
        shouldTryLobby = true;
        throw new Error(`HTTP ${res.status}`);
      }
      const j = await res.json();
      const n = Number(j?.players);
      const fetchedIso = j?.fetchedAt || null;
      if (Number.isFinite(n)) {
        setPlayers(n);
      }
      if (fetchedIso) {
        setFetchedAt(fetchedIso);
      } else if (Number.isFinite(n)) {
        setFetchedAt(new Date().toISOString());
      }

      const ageMs = fetchedIso && Number.isFinite(Date.parse(fetchedIso))
        ? Date.now() - Date.parse(fetchedIso)
        : Infinity;
      if (!Number.isFinite(n) || j?.stale === true || ageMs > STALE_MS) {
        shouldTryLobby = true;
      }

      if (shouldTryLobby) {
        const lobbyData = await fetchLobbyFallback();
        if (lobbyData) {
          setPlayers(lobbyData.players);
          setFetchedAt(lobbyData.fetchedAt);
          setErr("");
        } else if (!Number.isFinite(previousPlayers)) {
          setErr("Kunde inte hämta färsk lobby-data");
        }
      }
    } catch (e) {
      const lobbyData = await fetchLobbyFallback();
      if (lobbyData) {
        setPlayers(lobbyData.players);
        setFetchedAt(lobbyData.fetchedAt);
        setErr("");
      } else if (!Number.isFinite(previousPlayers)) {
        setErr("Kunde inte hämta");
      }
    } finally {
      setLoading(false);
    }
  }, [slug, variant, fetchLobbyFallback]);

  useEffect(() => {
    if (!slug) return;
    fetchNow();
    const tick = async () => {
      if (document.visibilityState === "visible" && navigator.onLine) await fetchNow();
      const jitter = 500 + Math.floor(Math.random() * 1000);
      timerRef.current = setTimeout(tick, pollMs + jitter);
    };
    timerRef.current = setTimeout(tick, pollMs);
    const onFocus = () => fetchNow();
    window.addEventListener("focus", onFocus);
    window.addEventListener("visibilitychange", onFocus);
    return () => {
      clearTimeout(timerRef.current);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("visibilitychange", onFocus);
    };
  }, [slug, pollMs, variant, fetchNow]);

  return { players, fetchedAt, loading, error, refresh: fetchNow };
}
