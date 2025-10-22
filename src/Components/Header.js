"use client";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import NextLink from "next/link";
import { Typography, Box, Chip, Tooltip, CircularProgress, Button, Grid, Paper } from "@mui/material";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import { useStockPriceContext } from "../context/StockPriceContext";
import StockPrice from "./StockPrice";
import { usePlayersLive, PLAYERS_POLL_INTERVAL_MS } from "../context/PlayersLiveContext";
import { useAuth } from "../context/AuthContext";

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
const LOBBY_SIM_MULTIPLIER = 1.1;

export default function Header() {
  const { stockPrice, loading: loadingPrice, error: priceError, marketCap } = useStockPriceContext();
  const { isAuthenticated, user, logout, authDisabled } = useAuth();

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

  const totalPlayers = useMemo(() => {
    const sourceGames = playerGames ?? [];
    let sum = 0;
    let hasData = false;

    sourceGames.forEach((g) => {
      const value = liveGames?.[g.id]?.players;
      if (Number.isFinite(value)) {
        sum += value;
        hasData = true;
      }
    });

    return hasData ? sum : null;
  }, [playerGames, liveGames]);

  const currentPrice = stockPrice?.price?.regularMarketPrice?.raw ?? "N/A";
  const changePercent = stockPrice?.price?.regularMarketChangePercent?.raw ?? 0;
  const changeColor = changePercent > 0 ? "#00e676" : changePercent < 0 ? "#ff1744" : "#ccc";
  const [simulateLobby, setSimulateLobby] = useState(false);
  const simulatedTotalPlayers = useMemo(() => {
    if (!Number.isFinite(totalPlayers)) return null;
    return Math.round(totalPlayers * LOBBY_SIM_MULTIPLIER);
  }, [totalPlayers]);

  if (!isAuthenticated) {
  const highlightCards = [
    {
      key: "price",
      title: "Aktiekurs",
      value: "1 234,56 SEK",
      accent: "#4cafef",
      subtitle: "Senaste kurs från Nasdaq Stockholm",
    },
    {
      key: "players",
      title: "Live-spelare",
      value: "89 750",
      accent: "#66ffa6",
      subtitle: "Uppdateras var 10:e minut",
    },
    {
      key: "short",
      title: "Blankning (FI)",
      value: "5,12%",
      accent: "#ffb74d",
      subtitle: "Totala blankade andelen enligt FI",
    },
    {
      key: "dividend-2025",
      title: "Totalt utdelat 2025",
      value: "6,4 Mdkr",
      accent: "#d4a5ff",
      subtitle: "Ackumulerad utdelning under året",
    },
  ];

    return (
      <Box
        sx={{
          background: "linear-gradient(135deg, #1e1e1e, #2e2e2e)",
          borderRadius: "16px",
          border: "1px solid rgba(255,255,255,0.05)",
          boxShadow: "0 16px 32px rgba(0,0,0,0.35)",
          maxWidth: "1100px",
          mx: "auto",
          mt: { xs: 1.5, sm: 2.5 },
          px: { xs: 2.5, sm: 4, md: 6 },
          py: { xs: 3, sm: 4, md: 5 },
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: { xs: 1.4, sm: 1.9 },
          textAlign: "center",
        }}
      >
        <Typography
          variant="h2"
          component="h1"
          sx={{
            fontWeight: 700,
            fontSize: { xs: "1.55rem", sm: "2.3rem", md: "2.8rem" },
            color: "#ffffff",
            letterSpacing: 1.5,
            textTransform: "uppercase",
            fontFamily: "'TT Norms', 'Manrope', 'Inter', sans-serif",
            mb: { xs: 0.2, sm: 0.4 },
          }}
        >
          Evolution Tracker
        </Typography>

        <Box sx={{ maxWidth: 720 }}>
          <Typography
            variant="overline"
            sx={{
              color: "#82c1ff",
              letterSpacing: 3,
              fontSize: { xs: "0.95rem", sm: "1.05rem" },
              fontWeight: 700,
              textTransform: "uppercase",
              mb: { xs: 0.45, sm: 0.6 },
            }}
          >
            Allt du behöver om Evolution
          </Typography>
        </Box>

        <Box sx={{ position: "relative", width: "100%" }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "repeat(2, minmax(0, 1fr))",
                sm: "repeat(2, minmax(0, 1fr))",
                md: "repeat(4, minmax(0, 1fr))",
              },
              gap: { xs: 1.5, sm: 2.5, md: 3 },
              width: "100%",
            }}
          >
            {highlightCards.map((card) => (
              <Paper
                key={card.key}
                sx={{
                  background: "rgba(18,18,18,0.85)",
                  border: "1px solid rgba(255,255,255,0.04)",
                  borderRadius: 3,
                  px: { xs: 1.7, sm: 2.6 },
                  py: { xs: 1.7, sm: 2.4 },
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                  boxShadow: "0 12px 24px rgba(0,0,0,0.35)",
                  minWidth: 0,
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.6)",
                    letterSpacing: 1,
                    fontWeight: 600,
                    fontSize: { xs: "0.68rem", sm: "0.75rem" },
                  }}
                >
                  {card.title}
                </Typography>
                <Typography
                  variant="h5"
                  sx={{
                    color: card.accent,
                    fontWeight: 700,
                    letterSpacing: 0.6,
                    fontSize: { xs: "1.35rem", sm: "1.5rem" },
                  }}
                >
                  {card.value}
                </Typography>
                <Typography component="span" sx={{ display: "none" }}>
                  {card.subtitle}
                </Typography>
              </Paper>
            ))}
          </Box>
        </Box>

        <Box sx={{ maxWidth: 720, mt: { xs: 1.5, sm: 2.2 } }}>
          <Typography
            variant="h4"
            sx={{
              color: "#ffffff",
              fontWeight: 700,
              letterSpacing: 0.8,
              textTransform: "uppercase",
              fontFamily: "'TT Norms', 'Manrope', 'Inter', sans-serif",
            }}
          >
            Live-data, analyser och dashboards på ett ställe
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: "rgba(255,255,255,0.72)",
              mt: 1,
              lineHeight: 1.7,
            }}
          >
            Följ återköp, lobbytrender, insideraffärer och kursdata i realtid. Skapa ett konto eller logga in för att låsa
            upp alla dashboards och automatiska uppdateringar.
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            alignItems: "center",
            gap: 2,
            mt: 1,
          }}
        >
          <Button
            component={NextLink}
            href="/login"
            variant="contained"
            size="large"
            sx={{
              minWidth: 180,
              fontWeight: 600,
              fontSize: "1rem",
              textTransform: "none",
              background: "linear-gradient(135deg, #4a90e2, #0077ff)",
              boxShadow: "0 12px 30px rgba(0,122,255,0.35)",
              "&:hover": {
                background: "linear-gradient(135deg, #3a74c2, #005fcc)",
              },
            }}
          >
            Logga in
          </Button>
          <Button
            component={NextLink}
            href="/register"
            variant="outlined"
            size="large"
            sx={{
              minWidth: 180,
              fontWeight: 600,
              fontSize: "1rem",
              textTransform: "none",
              color: "#ffffff",
              borderColor: "rgba(255,255,255,0.4)",
              "&:hover": {
                borderColor: "#ffffff",
              },
            }}
          >
            Skapa konto
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <>
      <Box
        sx={{
          textAlign: "center",
          padding: { xs: "8px 10px", sm: "12px 18px" },
          background: "linear-gradient(135deg, #1e1e1e, #2e2e2e)",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
          border: "1px solid rgba(255, 255, 255, 0.05)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: { xs: "100%", sm: "100%" },
          maxWidth: "1200px",
          margin: { xs: "6px auto", sm: "12px auto" },
          rowGap: { xs: 0.75, sm: 1.1 },
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
            mb: { xs: 0.35, sm: 0.75 },
            gap: 0.75,
            columnGap: { sm: 0.75 },
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

          {/* Mitten: live-statistik */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: { xs: 0.75, sm: 1 },
              px: { xs: 0.5, sm: 1 },
              width: "100%",
              textAlign: "center",
              minHeight: 32,
              justifyContent: "center",
            }}
          >
            {/* TOP3-spelare */}
            {loadingPlayers ? (
              <Chip
                size="small"
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <CircularProgress size={12} sx={{ color: "#ffffff" }} /> <span>Spelare…</span>
                  </Box>
                }
                sx={{ backgroundColor: "#2a2a2a", color: "#ffffff", border: "1px solid #3a3a3a" }}
              />
            ) : (
              top3.map((item) => {
                const label = `${item.label}: ${Number.isFinite(item.players) ? item.players.toLocaleString("sv-SE") : "—"}`;
                const fallbackTime = item.updated
                  ? new Date(item.updated).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })
                  : null;
                const tooltipText = countdownLabel
                  ? countdownLabel === "00:00"
                    ? "Uppdateras nu"
                    : `Uppdateras om ${countdownLabel}`
                  : fallbackTime
                    ? `Senast uppdaterad ${fallbackTime}`
                    : item.label;
                return (
                  <Tooltip key={item.id} title={tooltipText}>
                    <Chip
                      size="small"
                      label={label}
                      sx={{
                        backgroundColor: "#2a2a2a",
                        color: item.color,
                        border: `1px solid ${item.color}30`,
                        cursor: "default",
                        "& .MuiChip-label": {
                          display: "flex",
                          alignItems: "center",
                          gap: 0.5,
                          whiteSpace: "nowrap",
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
                  loadingShort ? (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <CircularProgress size={12} sx={{ color: "#FFCA28" }} /> <span>Blankning…</span>
                    </Box>
                  ) : (
                    `Blankning: ${Number(shortPercent ?? NaN).toLocaleString("sv-SE", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}%`
                  )
                }
                size="small"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.open("https://www.fi.se/sv/vara-register/blankningsregistret/emittent/?id=549300SUH6ZR1RF6TA88", "_blank", "noopener");
                  }
                }}
                sx={{ backgroundColor: "#2a2a2a", color: "#FFCA28", border: "1px solid #3a3a3a", cursor: "pointer" }}
              />
            </Tooltip>

            {/* Marknadsstatus */}
            <Chip
              label={isMarketOpen() ? "Börs: Öppen" : "Börs: Stängd"}
              size="small"
              sx={{ backgroundColor: isMarketOpen() ? "#1b402a" : "#402a2a", color: isMarketOpen() ? "#00e676" : "#ff6f6f" }}
            />
          </Box>

          {!authDisabled && (
            <Box
              sx={{
                display: "flex",
                justifyContent: { xs: "center", sm: "flex-end" },
                alignItems: "center",
                width: "100%",
                gap: 1,
              }}
            >
              {isAuthenticated ? (
                <>
                  {user?.email && (
                    <Chip
                      label={user.email}
                      size="small"
                      sx={{
                        backgroundColor: "#2a2a2a",
                        color: "#ffffff",
                        border: "1px solid rgba(255,255,255,0.1)",
                      }}
                    />
                  )}
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={logout}
                    sx={{
                      borderColor: "rgba(255,255,255,0.3)",
                      color: "#ffffff",
                      "&:hover": { borderColor: "#ffffff" },
                    }}
                  >
                    Logga ut
                  </Button>
                </>
              ) : (
                <Button
                  size="small"
                  variant="contained"
                  component={NextLink}
                  href="/login"
                  sx={{
                    textTransform: "none",
                    fontWeight: 600,
                    background: "linear-gradient(135deg, #4a90e2, #0077ff)",
                    "&:hover": {
                      background: "linear-gradient(135deg, #3a74c2, #005fcc)",
                    },
                  }}
                >
                  Logga in
                </Button>
              )}
            </Box>
          )}
        </Box>

        <Typography
          variant="h2"
          component="h1"
          sx={{
            fontWeight: 700,
            fontSize: { xs: "1.45rem", sm: "2.35rem", md: "3.3rem" },
            color: "#ffffff",
            marginBottom: { xs: "4px", sm: "8px" },
            letterSpacing: "0.4px",
            textTransform: "uppercase",
          }}
        >
          Evolution Tracker
        </Typography>

        <Typography
          variant="body1"
          sx={{
            color: "#b0b0b0",
            fontSize: { xs: "0.82rem", sm: "0.95rem" },
            opacity: 0.9,
            marginBottom: { xs: "4px", sm: "6px" },
            display: { xs: "none", sm: "block" },
            fontWeight: 500,
          }}
        >
          Spåra utvecklingen och statistiken över tid
        </Typography>

        <Typography
          variant="h6"
          component="div"
          sx={{
            color: "#f2f2f2",
            fontSize: { xs: "1rem", sm: "1.16rem" },
            fontWeight: 600,
            letterSpacing: 0.25,
            marginBottom: { xs: "2px", sm: "6px" },
          }}
        >
          <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
            <FiberManualRecordIcon
              sx={{
                fontSize: "0.95rem",
                color: loadingPlayers ? "#b0b0b0" : "#00e676",
              }}
            />
            {loadingPlayers ? (
              "Laddar totala antalet spelare…"
            ) : totalPlayers != null ? (
              <>
                <Box component="span" sx={{ color: "#ffffff", ml: 0.75 }}>
                  {totalPlayers.toLocaleString("sv-SE")}
                </Box>
                {simulateLobby && simulatedTotalPlayers != null && (
                  <Box
                    component="span"
                    sx={{
                      color: "#ffb74d",
                      fontWeight: 600,
                      ml: 1,
                      mr: 0.75,
                    }}
                  >
                    SIM {simulatedTotalPlayers.toLocaleString("sv-SE")}
                  </Box>
                )}
                spelare just nu
              </>
            ) : (
              "Totalt antal spelare saknas för tillfället"
            )}
          </Box>
        </Typography>
        {!loadingPlayers && totalPlayers != null && (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.6, mb: { xs: "4px", sm: "6px" } }}>
            <Button
              size="small"
              onClick={() => setSimulateLobby((prev) => !prev)}
              variant={simulateLobby ? "contained" : "outlined"}
              sx={{
                minWidth: 210,
                background: simulateLobby ? "rgba(255,183,77,0.2)" : "transparent",
                borderColor: simulateLobby ? "rgba(255,183,77,0.7)" : "rgba(255,255,255,0.2)",
                color: simulateLobby ? "#fff" : "rgba(255,255,255,0.85)",
                fontSize: "0.75rem",
                fontWeight: 600,
                "&:hover": {
                  borderColor: "rgba(255,183,77,0.9)",
                  background: simulateLobby ? "rgba(255,183,77,0.28)" : "rgba(255,255,255,0.08)",
                },
              }}
            >
              {simulateLobby ? "Simulering aktiv (+10%)" : "Aktivera lobby-simulering (+10%)"}
            </Button>
            <Typography
              variant="caption"
              sx={{
                color: "#b0b0b0",
                textAlign: "center",
                px: 2,
              }}
            >
              Evos riktiga lobby brukar ligga runt 10% över våra spårade spel – simuleringen ger en uppskattning, inte ett exakt värde.
            </Typography>
          </Box>
        )}

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

          </>
        )}
      </Box>

      {/* Quick anchors */}
      {isAuthenticated && (
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
          <Chip
            component="a"
            href="#support"
            clickable
            size="small"
            label="Stötta"
            sx={{
              backgroundColor: '#2a2a2a',
              color: '#66bb6a',
              border: '1px solid #66bb6a55',
            }}
          />
        </Box>
      )}
    </>
  );
}
