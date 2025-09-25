'use client';
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Typography, Box, Chip, IconButton, Tooltip, CircularProgress } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useStockPriceContext } from '../context/StockPriceContext';
import StockPrice from './StockPrice';

// ---- Spel (samma som i GamePlayersLiveList) ----
const GAMES = [
  { slug: "crazy-time",                  label: "Crazy Time" },
  { slug: "monopoly-big-baller",         label: "Big Baller" },
  { slug: "funky-time",                  label: "Funky Time" },
  { slug: "lightning-storm",             label: "Lightning Storm" },
  { slug: "crazy-balls",                 label: "Crazy Balls" },
  { slug: "ice-fishing",                 label: "Ice Fishing" },
  { slug: "xxxtreme-lightning-roulette", label: "XXXtreme Lightning Roulette" },
  { slug: "monopoly-live",               label: "Monopoly Live" },
  { slug: "red-door-roulette",           label: "Red Door Roulette" },
  { slug: "auto-roulette",               label: "Auto Roulette" },
];

// Delad färgpalett
export const COLORS = {
  "crazy-time": "#C21807",              // Rubinröd
  "crazy-time:a": "#26A69A",            // Teal (oförändrad)
  "monopoly-big-baller": "#00e676",
  "funky-time": "#BA68C8",
  "lightning-storm": "#1976D2",         // Stark blå (Royal Blue)
  "crazy-balls": "#E57373",             // Ljusare röd
  "ice-fishing": "#AB47BC",
  "xxxtreme-lightning-roulette": "#FF7043",
  "monopoly-live": "#66BB6A",
  "red-door-roulette": "#EC407A",
  "auto-roulette": "#26C6DA",
  "speed-baccarat-a": "#4DB6AC",
  "super-andar-bahar": "#F06292",
  "lightning-dice": "#FFD54F",
  "lightning-roulette": "#29B6F6",
  "bac-bo": "#FF8A65",
};

const EVO_LEI = '549300SUH6ZR1RF6TA88';

export default function Header() {
  const { stockPrice, loading: loadingPrice, error: priceError, marketCap, lastUpdated, refresh } = useStockPriceContext();

  const fmtTime = (d) =>
    d ? new Date(d).toLocaleTimeString("sv-SE", { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Europe/Stockholm' }) : '';

  const fmtCap = (v) => {
    if (!v) return 'N/A';
    const b = v / 1_000_000_000;
    return `${b.toLocaleString('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}B SEK`;
  };

  const isMarketOpen = () => {
    const now = new Date();
    const day = now.getDay(); if (day === 0 || day === 6) return false;
    const h = now.getHours(), m = now.getMinutes();
    const afterOpen = h > 9 || (h === 9 && m >= 0);
    const beforeClose = h < 17 || (h === 17 && m <= 30);
    return afterOpen && beforeClose;
  };

  // ---- Blankning ----
  const [shortPercent, setShortPercent] = useState(null);
  const [loadingShort, setLoadingShort] = useState(false);

  const fetchShortFromHistory = useCallback(async () => {
    try {
      setLoadingShort(true);
      const res = await fetch('/api/short/history', { cache: 'no-store' });
      if (!res.ok) throw new Error('history failed');
      const data = await res.json();
      const arr = Array.isArray(data.items) ? data.items : [];
      if (arr.length) {
        const last = arr[arr.length - 1];
        const v = Number(last.percent);
        if (Number.isFinite(v)) setShortPercent(v);
      }
    } catch {
      try {
        const res = await fetch(`/api/short?lei=${EVO_LEI}`, { cache: 'no-store' });
        if (res.ok) {
          const j = await res.json();
          if (Number.isFinite(j.totalPercent)) setShortPercent(Number(j.totalPercent));
        }
      } catch {}
    } finally {
      setLoadingShort(false);
    }
  }, []);

  useEffect(() => { fetchShortFromHistory(); }, [fetchShortFromHistory]);
  useEffect(() => {
    const onFocus = () => fetchShortFromHistory();
    window.addEventListener('focus', onFocus);
    window.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('visibilitychange', onFocus);
    };
  }, [fetchShortFromHistory]);
  useEffect(() => {
    const id = setInterval(fetchShortFromHistory, 30 * 60 * 1000);
    return () => clearInterval(id);
  }, [fetchShortFromHistory]);

  // ---- Top 3 spel-chips (dynamiskt) ----
  const [liveGames, setLiveGames] = useState({}); // {slug: {players, updated}}
  const [loadingGames, setLoadingGames] = useState(false);

  const fetchAllGames = useCallback(async (force = false) => {
    setLoadingGames(true);
    const out = {};
    await Promise.all(
      GAMES.map(async (g) => {
        try {
          const res = await fetch(`/api/casinoscores/players/${g.slug}${force ? "?force=1" : ""}`, { cache: 'no-store' });
          const j = await res.json();
          if (j?.ok) {
            out[g.slug] = { players: Number(j.players), updated: j.fetchedAt };
          } else {
            out[g.slug] = { players: null, updated: null };
          }
        } catch {
          out[g.slug] = { players: null, updated: null };
        }
      })
    );
    setLiveGames(out);
    setLoadingGames(false);
  }, []);

  useEffect(() => { fetchAllGames(); }, [fetchAllGames]);
  useEffect(() => {
    const onFocus = () => fetchAllGames();
    window.addEventListener('focus', onFocus);
    window.addEventListener('visibilitychange', onFocus);
    const id = setInterval(() => {
      if (document.visibilityState === 'visible' && navigator.onLine) fetchAllGames();
    }, 10 * 60 * 1000); // samma 10-min intervall
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('visibilitychange', onFocus);
      clearInterval(id);
    };
  }, [fetchAllGames]);

  const top3 = useMemo(() => {
    const rows = GAMES.map(g => ({
      ...g,
      players: liveGames[g.slug]?.players ?? null,
      updated: liveGames[g.slug]?.updated ?? null,
      color: COLORS[g.slug] || '#fff',
    }));
    rows.sort((a, b) => {
      const av = a.players, bv = b.players;
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return bv - av;
    });
    return rows.slice(0, 3);
  }, [liveGames]);

  const currentPrice = stockPrice?.price?.regularMarketPrice?.raw ?? "N/A";
  const changePercent = stockPrice?.price?.regularMarketChangePercent?.raw ?? 0;
  const changeColor = changePercent > 0 ? "#00e676" : changePercent < 0 ? "#ff1744" : "#ccc";

  return (
    <>
      <Box
        sx={{
          textAlign: "center",
          padding: { xs: "12px", sm: "16px" },
          background: "linear-gradient(135deg, #1e1e1e, #2e2e2e)",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
          border: "1px solid rgba(255, 255, 255, 0.05)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: { xs: "92%", sm: "85%", md: "75%" },
          margin: "16px auto",
          transition: "all 0.3s ease",
        }}
      >
        {/* Top bar */}
        <Box sx={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', mb: 1, gap: 1, flexWrap: 'wrap' }}>
          <Chip label="EVO.ST • Nasdaq Stockholm" size="small" sx={{ backgroundColor: '#2a2a2a', color: '#b0b0b0' }} />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            {/* Dynamisk Top 3 av spel */}
            {loadingGames ? (
              <Chip
                size="small"
                label={
                  <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
                    <CircularProgress size={12} sx={{ color:'#ffffff' }} /> <span>Spelare…</span>
                  </Box>
                }
                sx={{ backgroundColor: '#2a2a2a', color: '#ffffff', border: '1px solid #3a3a3a' }}
              />
            ) : (
              top3.map(item => {
                const label =
                  `${item.label}: ${Number.isFinite(item.players) ? item.players.toLocaleString('sv-SE') : "—"}`;
                const time = item.updated
                  ? new Date(item.updated).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
                  : null;
                return (
                  <Tooltip key={item.slug} title={time ? `Uppdaterad ${time}` : item.label}>
                    <Chip
                      size="small"
                      label={label}
                      sx={{
                        backgroundColor: '#2a2a2a',
                        color: item.color,
                        border: `1px solid ${item.color}30`, // tunn kant i spel-färgen
                        cursor: 'default',
                        '& .MuiChip-label': {
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                          whiteSpace: 'nowrap',
                          fontWeight: 700,
                        },
                      }}
                    />
                  </Tooltip>
                );
              })
            )}

            {/* Blankning */}
            <Tooltip title="Blankning (FI)">
              <Chip
                label={
                  loadingShort
                    ? <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
                        <CircularProgress size={12} sx={{ color:'#FFCA28' }} /> <span>Blankning…</span>
                      </Box>
                    : `Blankning: ${Number(shortPercent ?? NaN).toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
                }
                size="small"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.open('https://www.fi.se/sv/vara-register/blankningsregistret/emittent/?id=549300SUH6ZR1RF6TA88', '_blank', 'noopener');
                  }
                }}
                sx={{ backgroundColor: '#2a2a2a', color: '#FFCA28', border: '1px solid #3a3a3a', cursor: 'pointer' }}
              />
            </Tooltip>

            <Chip
              label={isMarketOpen() ? 'Börs: Öppen' : 'Börs: Stängd'}
              size="small"
              sx={{ backgroundColor: isMarketOpen() ? '#1b402a' : '#402a2a', color: isMarketOpen() ? '#00e676' : '#ff6f6f' }}
            />

            {lastUpdated && (
              <Chip
                label={`Uppdaterad ${fmtTime(lastUpdated)}`}
                size="small"
                sx={{ backgroundColor: '#2a2a2a', color: '#b0b0b0', display: { xs: 'none', sm: 'inline-flex' } }}
              />
            )}

            {/* Gemensam uppdatera-knapp */}
            <Tooltip title="Uppdatera alla badges">
              <IconButton
                onClick={() => {
                  refresh();               // aktiedata
                  fetchShortFromHistory(); // blankning
                  fetchAllGames(true);     // top3-spel (tvinga scrape vid klick)
                }}
                sx={{ color: '#00e676', display: { xs: 'none', sm: 'inline-flex' } }}
                aria-label="Uppdatera data"
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Typography
          variant="h2"
          component="h1"
          sx={{
            fontWeight: 700,
            fontSize: { xs: "1.8rem", sm: "2.5rem", md: "3.5rem" },
            color: "#ffffff",
            marginBottom: { xs: "8px", sm: "12px" },
            letterSpacing: "0.5px",
            textTransform: "uppercase",
          }}
        >
          Evolution Tracker
        </Typography>

        <Typography
          variant="body1"
          sx={{
            color: "#b0b0b0",
            fontSize: { xs: "0.9rem", sm: "1rem" },
            opacity: 0.9,
            marginBottom: { xs: "8px", sm: "12px" },
            display: { xs: "none", sm: "block" },
            fontWeight: 500,
          }}
        >
          Spåra utvecklingen och statistik för 2025
        </Typography>

        {/* Aktiepris */}
        {loadingPrice ? (
          <Typography variant="body2" sx={{ color: "#b0b0b0", fontSize: { xs: "0.85rem", sm: "0.95rem" }, fontWeight: 500 }}>
            Laddar aktiepris...
          </Typography>
        ) : priceError ? (
          <Typography variant="body2" sx={{ color: "#ff1744", fontSize: { xs: "0.85rem", sm: "0.95rem" }, fontWeight: 500 }}>
            Kunde inte hämta aktiepris
          </Typography>
        ) : (
          <>
            {/* Mobil: pris + % */}
            <Box sx={{ display: { xs: "flex", sm: "none" }, flexDirection: "column", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
              <Typography variant="h6" sx={{ color: "#ffffff", fontSize: "1.1rem", fontWeight: 600 }}>
                {currentPrice !== "N/A"
                  ? `${currentPrice.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SEK`
                  : "N/A"}
              </Typography>
              <Typography variant="body2" sx={{ color: changeColor, fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "4px", fontWeight: 500 }}>
                {changePercent !== 0 ? `${changePercent > 0 ? "+" : ""}${changePercent.toFixed(2)}%` : "0.00%"}
                {changePercent > 0 && <span style={{ fontSize: "0.9rem" }}>↑</span>}
                {changePercent < 0 && <span style={{ fontSize: "0.9rem" }}>↓</span>}
              </Typography>
            </Box>

            {/* Desktop: full komponent */}
            <Box sx={{ display: { xs: "none", sm: "block" }, marginBottom: 0 }}>
              <StockPrice />
            </Box>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center', mt: 1 }}>
              <Chip label={`Market Cap: ${fmtCap(marketCap)}`} size="small" sx={{ backgroundColor: '#2a2a2a', color: '#b0b0b0' }} />
            </Box>
          </>
        )}
      </Box>

      {/* Quick anchors */}
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap', mb: 2 }}>
        <Chip component="a" href="#overview" clickable size="small" label="Översikt" sx={{ backgroundColor: '#2a2a2a', color: '#b0b0b0' }} />
        <Chip component="a" href="#news" clickable size="small" label="Nyheter" sx={{ backgroundColor: '#2a2a2a', color: '#b0b0b0' }} />
        <Chip component="a" href="#buybacks" clickable size="small" label="Återköp" sx={{ backgroundColor: '#2a2a2a', color: '#b0b0b0' }} />
        <Chip component="a" href="#calculator" clickable size="small" label="Kalkylator" sx={{ backgroundColor: '#2a2a2a', color: '#b0b0b0' }} />
        <Chip component="a" href="#faq" clickable size="small" label="FAQ" sx={{ backgroundColor: '#2a2a2a', color: '#b0b0b0' }} />
      </Box>
    </>
  );
}