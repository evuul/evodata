// "use client";
// import { useCallback, useEffect, useRef, useState } from "react";

// export function useCrazyTimePlayers(options = {}) {
//   const url = options.url || "/api/crazytime/players";
//   const pollMs = options.pollMs || 10 * 60 * 1000; // 10 min

//   const [players, setPlayers] = useState(null);
//   const [fetchedAt, setFetchedAt] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setErr] = useState("");

//   const abortRef = useRef(null);
//   const pollRef = useRef(null);

//   const fetchNow = useCallback(async () => {
//     abortRef.current?.abort();
//     const controller = new AbortController();
//     abortRef.current = controller;

//     try {
//       setLoading(true);
//       setErr("");

//       const res = await fetch(url, {
//         cache: "no-store",
//         signal: controller.signal,
//         headers: { accept: "application/json" },
//       });

//       if (res.status === 304) {
//         // inget nytt
//       } else if (!res.ok) {
//         throw new Error(`HTTP ${res.status}`);
//       } else {
//         const data = await res.json().catch(() => ({}));
//         const p = Number(data?.players);
//         if (Number.isFinite(p)) setPlayers(p);
//         setFetchedAt(data?.fetchedAt || new Date().toISOString());
//       }
//     } catch (e) {
//       if (e?.name !== "AbortError") {
//         setErr("Kunde inte hämta spelare just nu. Försök igen.");
//       }
//     } finally {
//       setLoading(false);
//     }
//   }, [url]);

//   const startPolling = useCallback(() => {
//     if (pollRef.current) clearTimeout(pollRef.current);
//     pollRef.current = setTimeout(async () => {
//       if (document.visibilityState === "visible" && navigator.onLine) {
//         await fetchNow();
//       }
//       startPolling();
//     }, pollMs);
//   }, [pollMs, fetchNow]);

//   useEffect(() => {
//     fetchNow();
//     startPolling();

//     const onVis = () => {
//       if (document.visibilityState === "visible") fetchNow();
//     };
//     const onOnline = () => fetchNow();

//     document.addEventListener("visibilitychange", onVis);
//     window.addEventListener("online", onOnline);

//     return () => {
//       document.removeEventListener("visibilitychange", onVis);
//       window.removeEventListener("online", onOnline);
//       if (pollRef.current) clearTimeout(pollRef.current);
//       abortRef.current?.abort();
//     };
//   }, [fetchNow, startPolling]);

//   return { players, fetchedAt, loading, error, refresh: fetchNow };
// }