'use client';
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Typography, Box, Chip, Tooltip, CircularProgress } from "@mui/material";
import { useStockPriceContext } from '../context/StockPriceContext';
import StockPrice from './StockPrice';
import { usePlayersLive, PLAYERS_POLL_INTERVAL_MS } from "../context/PlayersLiveContext";

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
  const { stockPrice, loading: loadingPrice, error: priceError, marketCap } = useStockPriceContext();

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

  const {
    data: liveGames,
    loading: loadingPlayers,
    refresh: refreshPlayers,
    GAMES: playerGames,
    lastUpdated: playersLastUpdated,
  } = usePlayersLive();

  const [countdownLabel, setCountdownLabel] = useState(null);

  useEffect(() => {
    if (!playersLastUpdated) {
      setCountdownLabel(null);
      return;
    }

    const updateCountdown = () => {
      const updatedTs = new Date(playersLastUpdated).getTime();
      if (!Number.isFinite(updatedTs)) {
        setCountdownLabel(null);
        return;
      }
      const remaining = PLAYERS_POLL_INTERVAL_MS - (Date.now() - updatedTs);
      if (remaining <= 0) {
        setCountdownLabel("00:00");
        return;
      }
      const totalSeconds = Math.ceil(remaining / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      setCountdownLabel(`${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`);
    };

    updateCountdown();
    const id = setInterval(updateCountdown, 1000);
    return () => clearInterval(id);
  }, [playersLastUpdated]);

  const top3 = useMemo(() => {
    const sourceGames = playerGames ?? [];
    const rows = sourceGames.map((g) => {
      const entry = liveGames?.[g.id] || {};
      const players = typeof entry.players === "number" ? entry.players : null;
      return {
        ...g,
        players,
        updated: entry.updated ?? null,
        color: COLORS[g.id] || '#fff',
      };
    });
    rows.sort((a, b) => {
      const av = a.players, bv = b.players;
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return bv - av;
    });
    return rows.slice(0, 3);
  }, [playerGames, liveGames]);

  const currentPrice = stockPrice?.price?.regularMarketPrice?.raw ?? "N/A";
  const changePercent = stockPrice?.price?.regularMarketChangePercent?.raw ?? 0;
  const changeColor = changePercent > 0 ? "#00e676" : changePercent < 0 ? "#ff1744" : "#ccc";

  return (
    <>
      <Box
        sx={{
          textAlign: "center",
          padding: { xs: "10px 12px", sm: "16px" },
          background: "linear-gradient(135deg, #1e1e1e, #2e2e2e)",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
          border: "1px solid rgba(255, 255, 255, 0.05)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: { xs: "92%", sm: "100%" },
          maxWidth: "1200px",
          margin: { xs: "10px auto", sm: "16px auto" },
          rowGap: { xs: 1, sm: 1.5 },
          transition: "all 0.3s ease",
        }}
      >
        {/* Top bar – oförändrat på mobil, centrerad på desktop */}
        <Box
          sx={{
            // Mobil: behåll flex/kolumn
            display: { xs: 'flex', sm: 'grid' },
            flexDirection: { xs: 'column', sm: 'initial' },
            justifyContent: { xs: 'center', sm: 'initial' },
            alignItems: 'center',

            // Desktop: 3-kolumns grid (vänster EVO, mitten chips, höger spacer)
            gridTemplateColumns: { sm: 'auto 1fr auto' },
            width: '100%',
            mb: { xs: 0.5, sm: 1 },
            gap: 1,
            columnGap: { sm: 1 },
          }}
        >
          {/* Vänster: EVO.ST */}
          <Box sx={{ display: 'flex', alignItems: 'center', alignSelf: { xs: 'center', sm: 'auto' } }}>
            <Chip
              label="EVO.ST • Nasdaq Stockholm"
              size="small"
              sx={{
                backgroundColor: '#2a2a2a',
                color: '#b0b0b0',
                alignSelf: { xs: 'center', sm: 'flex-start' }, // center på mobil, vänster på desktop
              }}
            />
          </Box>

          {/* Mitten: ALLA chips – mobil: som innan, desktop: centrerade */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: { xs: 0.75, sm: 1 },
              px: { xs: 0.5, sm: 1 },
              width: '100%',
              textAlign: 'center',
              minHeight: 32,
              justifyContent: 'center',
            }}
          >
            {/* TOP3-spelare */}
            {loadingPlayers ? (
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
                const fallbackTime = item.updated
                  ? new Date(item.updated).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
                  : null;
                const tooltipText = countdownLabel
                  ? (countdownLabel === '00:00' ? 'Uppdateras nu' : `Uppdateras om ${countdownLabel}`)
                  : (fallbackTime ? `Senast uppdaterad ${fallbackTime}` : item.label);
                return (
                  <Tooltip key={item.id} title={tooltipText}>
                    <Chip
                      size="small"
                      label={label}
                      sx={{
                        backgroundColor: '#2a2a2a',
                        color: item.color,
                        border: `1px solid ${item.color}30`,
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

            {/* Marknadsstatus */}
            <Chip
              label={isMarketOpen() ? 'Börs: Öppen' : 'Börs: Stängd'}
              size="small"
              sx={{ backgroundColor: isMarketOpen() ? '#1b402a' : '#402a2a', color: isMarketOpen() ? '#00e676' : '#ff6f6f' }}
            />

            {/* Countdown borttagen på begäran */}
          </Box>

          {/* Höger: tom “spacer” för perfekt centrering av mittenkolumnen (desktop) */}
          <Box sx={{ display: { xs: 'none', sm: 'block' } }} />
        </Box>

        <Typography
          variant="h2"
          component="h1"
          sx={{
            fontWeight: 700,
            fontSize: { xs: "1.55rem", sm: "2.5rem", md: "3.5rem" },
            color: "#ffffff",
            marginBottom: { xs: "6px", sm: "12px" },
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
            fontSize: { xs: "0.85rem", sm: "1rem" },
            opacity: 0.9,
            marginBottom: { xs: "6px", sm: "12px" },
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
            <Box sx={{ display: { xs: "flex", sm: "none" }, flexDirection: "column", alignItems: "center", gap: "4px", marginBottom: "6px" }}>
              <Typography variant="h6" sx={{ color: "#ffffff", fontSize: "1rem", fontWeight: 600 }}>
                {currentPrice !== "N/A"
                  ? `${currentPrice.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SEK`
                  : "N/A"}
              </Typography>
              <Typography variant="body2" sx={{ color: changeColor, fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "4px", fontWeight: 500 }}>
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
        <Chip component="a" href="#live-games" clickable size="small" label="Live-spelare" sx={{ backgroundColor: '#2a2a2a', color: '#b0b0b0' }} />
        <Chip component="a" href="#money-counter" clickable size="small" label="Omsättning" sx={{ backgroundColor: '#2a2a2a', color: '#b0b0b0' }} />
        <Chip component="a" href="#overview" clickable size="small" label="Översikt" sx={{ backgroundColor: '#2a2a2a', color: '#b0b0b0' }} />
        <Chip component="a" href="#news" clickable size="small" label="Nyheter" sx={{ backgroundColor: '#2a2a2a', color: '#b0b0b0' }} />
        <Chip component="a" href="#blankning" clickable size="small" label="Blankning" sx={{ backgroundColor: '#2a2a2a', color: '#b0b0b0' }} />
        <Chip component="a" href="#insider" clickable size="small" label="Insyn" sx={{ backgroundColor: '#2a2a2a', color: '#b0b0b0' }} />
        <Chip component="a" href="#buybacks" clickable size="small" label="Återköp" sx={{ backgroundColor: '#2a2a2a', color: '#b0b0b0' }} />
        <Chip component="a" href="#calculator" clickable size="small" label="Kalkylator" sx={{ backgroundColor: '#2a2a2a', color: '#b0b0b0' }} />
        <Chip component="a" href="#faq" clickable size="small" label="FAQ" sx={{ backgroundColor: '#2a2a2a', color: '#b0b0b0' }} />
      </Box>
    </>
  );
}
