'use client';
import React, { useEffect, useState, useCallback } from "react";
import { Typography, Box, Chip, IconButton, Tooltip, CircularProgress } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useStockPriceContext } from '../context/StockPriceContext';
import StockPrice from './StockPrice';

const EVO_LEI = '549300SUH6ZR1RF6TA88';

export default function Header() {
  const { stockPrice, loading: loadingPrice, error: priceError, marketCap, lastUpdated, refresh } = useStockPriceContext();

  const fmtTime = (d) => d ? new Date(d).toLocaleTimeString("sv-SE", { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';
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

  // ---- Blankning i headern ----
  const [shortPercent, setShortPercent] = useState(null);
  const [loadingShort, setLoadingShort] = useState(false);

  // 1) Läs senaste datapunkt från historik (samma källa som grafen)
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
      // fall back to live endpoint if you keep it
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

  // 2) Första hämtning
  useEffect(() => { fetchShortFromHistory(); }, [fetchShortFromHistory]);

  // 3) Lyssna på snapshot-event från ShortTrend/schemat
  useEffect(() => {
    const handler = () => fetchShortFromHistory();
    try { window.addEventListener('shortSnapshot', handler); } catch {}
    return () => { try { window.removeEventListener('shortSnapshot', handler); } catch {} };
  }, [fetchShortFromHistory]);

  // 4) Re-fetcha vid fokus / synlighet
  useEffect(() => {
    const onFocus = () => fetchShortFromHistory();
    window.addEventListener('focus', onFocus);
    window.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('visibilitychange', onFocus);
    };
  }, [fetchShortFromHistory]);

  // 5) Intervall (var 30:e min)
  useEffect(() => {
    const id = setInterval(fetchShortFromHistory, 30 * 60 * 1000);
    return () => clearInterval(id);
  }, [fetchShortFromHistory]);

  const fmtSEK = (v) => {
    if (v == null) return 'N/A';
    if (v >= 1_000_000_000) return `${(v/1_000_000_000).toLocaleString('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Mdkr`;
    if (v >= 1_000_000) return `${(v/1_000_000).toLocaleString('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Mkr`;
    return `${v.toLocaleString('sv-SE')} SEK`;
  };

  const openFiPage = () => {
    if (typeof window !== 'undefined') {
      window.open('https://www.fi.se/sv/vara-register/blankningsregistret/emittent/?id=549300SUH6ZR1RF6TA88', '_blank', 'noopener');
    }
  };

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
        {/* Top bar: source + updated + refresh */}
        <Box sx={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Chip label="EVO.ST • Nasdaq Stockholm" size="small" sx={{ backgroundColor: '#2a2a2a', color: '#b0b0b0' }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="Källa: FI. Klick öppnar FI-sidan">
              <Chip
                label={
                  loadingShort
                    ? <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
                        <CircularProgress size={12} sx={{ color:'#FFCA28' }} /> <span>Blankning…</span>
                      </Box>
                    : `Blankning: ${
                        Number(shortPercent ?? NaN).toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                      }%`
                }
                size="small"
                onClick={openFiPage}
                sx={{ backgroundColor: '#2a2a2a', color: '#FFCA28', border: '1px solid #3a3a3a', cursor: 'pointer' }}
              />
            </Tooltip>
            <Chip
              label={isMarketOpen() ? 'Börs: Öppen' : 'Börs: Stängd'}
              size="small"
              sx={{ backgroundColor: isMarketOpen() ? '#1b402a' : '#402a2a', color: isMarketOpen() ? '#00e676' : '#ff6f6f' }}
            />
            {lastUpdated && (
              <Chip label={`Uppdaterad ${fmtTime(lastUpdated)}`} size="small" sx={{ backgroundColor: '#2a2a2a', color: '#b0b0b0', display: { xs: 'none', sm: 'inline-flex' } }} />
            )}
<Tooltip title="Uppdatera aktie- och blankningsdata">
  <IconButton
    onClick={() => {
      refresh();              // uppdatera aktiedata
      fetchShortFromHistory(); // uppdatera blankning
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