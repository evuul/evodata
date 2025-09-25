"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export function useCasinoScoresPlayers(slug, { pollMs = 60_000, variant } = {}) {
  const [players, setPlayers] = useState(null);
  const [fetchedAt, setFetchedAt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setErr] = useState("");
  const timerRef = useRef(null);

  const fetchNow = useCallback(async (force = false) => {
    if (!slug) return;
    try {
      setLoading(true);
      setErr("");
      const params = new URLSearchParams();
      if (variant) params.set("variant", variant);
      if (force) params.set("force", "1");
      const qs = params.toString();
      const res = await fetch(`/api/casinoscores/players/${slug}${qs ? `?${qs}` : ""}`, { cache: "no-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      const n = Number(j?.players);
      if (Number.isFinite(n)) setPlayers(n);
      setFetchedAt(j?.fetchedAt || new Date().toISOString());
    } catch (e) {
      setErr("Kunde inte hämta");
    } finally {
      setLoading(false);
    }
  }, [slug, variant]);

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
