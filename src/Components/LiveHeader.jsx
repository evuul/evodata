"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  Typography,
  Box,
  Chip,
  CircularProgress,
  Button,
  Stack,
  Grid,
  ToggleButton,
  ToggleButtonGroup,
  FormControl,
  Select,
  MenuItem,
} from "@mui/material";
import LocalCafeRounded from "@mui/icons-material/LocalCafeRounded";
import { useStockPriceContext } from "../context/StockPriceContext";
import { usePlayersLive } from "../context/PlayersLiveContext";
import { useAuth } from "../context/AuthContext";
import { COLORS as GAME_COLORS } from "@/config/games";
import { useLocale, useTranslate, LOCALE_OPTIONS } from "@/context/LocaleContext";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@/lib/useMuiMediaQuery";

const EVO_LEI = "549300SUH6ZR1RF6TA88";
const LOBBY_SIM_MULTIPLIER = 1.1;

const PanelLoader = () => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: 280,
      width: "100%",
    }}
  >
    <CircularProgress size={28} sx={{ color: "#38bdf8" }} />
  </Box>
);

const FinancialOverviewPanel = dynamic(() => import("./FinancialOverviewCard"), { ssr: false, loading: PanelLoader });
const LiveAiFairValuePanel = dynamic(() => import("./LiveAiFairValue"), { ssr: false, loading: PanelLoader });
const GameshowEarningsPanel = dynamic(() => import("./LiveShowIntelligence"), { ssr: false, loading: PanelLoader });
const ShortIntelligencePanel = dynamic(() => import("./ShortIntellegence"), { ssr: false, loading: PanelLoader });
const LivePlayersControlPanel = dynamic(() => import("./LivePlayersControlPanel"), { ssr: false, loading: PanelLoader });
const LiveMoneyCounterPanel = dynamic(() => import("./LiveMoneyCounter"), { ssr: false, loading: PanelLoader });
const LiveStockBuyBackInfoPanel = dynamic(() => import("./LiveStockBuyBackInfo"), { ssr: false, loading: PanelLoader });
const LiveInvestmentCalculatorPanel = dynamic(() => import("./LiveInvestmentCalculator"), {
  ssr: false,
  loading: PanelLoader,
});

export default function LiveHeader({ financialReports, averagePlayersData, dividendData }) {
  const theme = useTheme();
  const isMobileMenu = useMediaQuery(theme.breakpoints.down("sm"));
  const {
    stockPrice,
    marketCap,
    loading: loadingPrice,
    ytdChangePercent,
    daysWithGains,
    daysWithLosses,
    lastUpdated: stockLastUpdated,
  } = useStockPriceContext();

  const {
    data: liveGames,
    loading: loadingPlayers,
    GAMES: playerGames,
    lastUpdated: playersLastUpdated,
  } = usePlayersLive();

  const { isAuthenticated, user, logout } = useAuth();
  const { locale, setLocale } = useLocale();
  const translate = useTranslate();

  const fmtCap = useCallback(
    (value) => {
      if (!Number.isFinite(value)) return translate("Saknas", "N/A");
      const billions = value / 1_000_000_000;
      return `${billions.toLocaleString("sv-SE", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })} B SEK`;
    },
    [translate]
  );

  const isMarketOpen = useCallback(() => {
    const now = new Date();
    const day = now.getDay();
    if (day === 0 || day === 6) return false;
    const hour = now.getHours();
    const minute = now.getMinutes();
    const afterOpen = hour > 9 || (hour === 9 && minute >= 0);
    const beforeClose = hour < 17 || (hour === 17 && minute <= 30);
    return afterOpen && beforeClose;
  }, []);

  const timeFormatter = useMemo(
    () => new Intl.DateTimeFormat("sv-SE", { hour: "2-digit", minute: "2-digit" }),
    []
  );

  const formatTime = useCallback(
    (value) => {
      if (!value) return null;
      const date = new Date(value);
      if (!Number.isFinite(date.getTime())) return null;
      return timeFormatter.format(date);
    },
    [timeFormatter]
  );

  const [shortPercent, setShortPercent] = useState(null);
  const [loadingShort, setLoadingShort] = useState(false);

  const fetchShortFromHistory = useCallback(async () => {
    try {
      setLoadingShort(true);
      const res = await fetch("/api/short/history", { cache: "no-store" });
      if (!res.ok) throw new Error("history failed");
      const data = await res.json();
      const items = Array.isArray(data.items) ? data.items : [];
      if (items.length) {
        const latest = items[items.length - 1];
        const percent = Number(latest.percent);
        if (Number.isFinite(percent)) {
          setShortPercent(percent);
          return;
        }
      }
      throw new Error("missing");
    } catch {
      try {
        const res = await fetch(`/api/short?lei=${EVO_LEI}`, { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        const percent = Number(json.totalPercent);
        if (Number.isFinite(percent)) setShortPercent(percent);
      } catch {
        /* ignore fallback errors */
      }
    } finally {
      setLoadingShort(false);
    }
  }, []);

  useEffect(() => {
    fetchShortFromHistory();
  }, [fetchShortFromHistory]);

  useEffect(() => {
    const handleFocus = () => fetchShortFromHistory();
    window.addEventListener("focus", handleFocus);
    window.addEventListener("visibilitychange", handleFocus);
    const id = setInterval(fetchShortFromHistory, 30 * 60 * 1000);
    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("visibilitychange", handleFocus);
      clearInterval(id);
    };
  }, [fetchShortFromHistory]);

  const top3 = useMemo(() => {
    const games = playerGames ?? [];
    const rows = games.map((game) => {
      const entry = liveGames?.[game.id] || {};
      const players = typeof entry.players === "number" ? entry.players : null;
      return {
        ...game,
        players,
        updated: entry.updated ?? null,
        color: GAME_COLORS?.[game.id] || "#38bdf8",
      };
    });
    rows.sort((a, b) => {
      const av = a.players;
      const bv = b.players;
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return bv - av;
    });
    return rows.slice(0, 3);
  }, [playerGames, liveGames]);

  const totalPlayers = useMemo(() => {
    const games = playerGames ?? [];
    let sum = 0;
    let hasData = false;
    games.forEach((game) => {
      const value = liveGames?.[game.id]?.players;
      if (Number.isFinite(value)) {
        sum += value;
        hasData = true;
      }
    });
    return hasData ? sum : null;
  }, [playerGames, liveGames]);

  const [simulateLobby, setSimulateLobby] = useState(false);
  const simulatedTotalPlayers = useMemo(() => {
    if (!Number.isFinite(totalPlayers)) return null;
    return Math.round(totalPlayers * LOBBY_SIM_MULTIPLIER);
  }, [totalPlayers]);
  const playersValue = simulateLobby && simulatedTotalPlayers != null ? simulatedTotalPlayers : totalPlayers;

  const stockPriceValue = stockPrice?.price?.regularMarketPrice?.raw;
  const stockChangeValue = stockPrice?.price?.regularMarketChangePercent?.raw;
  const stockSymbol = stockPrice?.price?.symbol ?? "EVO.ST";
  const exchangeName =
    stockPrice?.price?.fullExchangeName ?? stockPrice?.price?.exchangeName ?? "Nasdaq Stockholm";
  const venueChipLabel = `${stockSymbol} · ${exchangeName}`;

  const priceDisplay = Number.isFinite(stockPriceValue)
    ? `${stockPriceValue.toLocaleString("sv-SE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} SEK`
    : translate("Saknas", "N/A");
  const changeDisplay = Number.isFinite(stockChangeValue)
    ? `${stockChangeValue >= 0 ? "+" : ""}${stockChangeValue.toFixed(2)}%`
    : "—";
  const changeColor = Number.isFinite(stockChangeValue)
    ? stockChangeValue > 0
      ? "#34d399"
      : stockChangeValue < 0
      ? "#f87171"
      : "rgba(148,163,184,0.75)"
    : "rgba(148,163,184,0.75)";

  const ytdLabel = Number.isFinite(ytdChangePercent)
    ? translate(
        `YTD ${ytdChangePercent >= 0 ? "+" : ""}${ytdChangePercent.toFixed(2)}%`,
        `YTD ${ytdChangePercent >= 0 ? "+" : ""}${ytdChangePercent.toFixed(2)}%`
      )
    : null;
  const gainsLossLabel =
    Number.isFinite(daysWithGains) && Number.isFinite(daysWithLosses)
      ? translate(`${daysWithGains} upp · ${daysWithLosses} ned`, `${daysWithGains} up · ${daysWithLosses} down`)
      : null;

  const playersUpdatedLabel = playersLastUpdated ? formatTime(playersLastUpdated) : null;
  const stockUpdatedLabel = stockLastUpdated ? formatTime(stockLastUpdated) : null;

  const blankningChipLabel = loadingShort
    ? translate("Blankning: hämtar…", "Short interest: loading…")
    : Number.isFinite(shortPercent)
    ? translate(
        `Blankning: ${shortPercent.toFixed(2)}%`,
        `Short interest: ${shortPercent.toFixed(2)}%`
      )
    : translate("Blankning: –", "Short interest: –");
  const marketStatusChip = isMarketOpen()
    ? {
        label: translate("Marknaden öppen", "Market open"),
        bg: "rgba(16,185,129,0.18)",
        color: "#86efac",
        border: "1px solid rgba(134,239,172,0.35)",
      }
    : {
        label: translate("Marknaden stängd", "Market closed"),
        bg: "rgba(239,68,68,0.18)",
        color: "#fecaca",
        border: "1px solid rgba(252,165,165,0.35)",
      };

  const simulateButtonLabel = simulateLobby
    ? translate("Stäng av simulering", "Disable simulation")
    : translate("Simulera lobby (+10%)", "Simulate lobby (+10%)");

  const [activePanel, setActivePanel] = useState("live");
  const panelOptions = useMemo(
    () => [
      { value: "live", label: translate("Live Intelligence", "Live Intelligence") },
      { value: "financial", label: translate("Finansiell översikt", "Financial overview") },
      { value: "fairvalue", label: translate("AI Fair Value", "AI Fair Value") },
      { value: "gameshow", label: translate("Gameshow Earnings", "Gameshow earnings") },
      { value: "money", label: translate("Live Money", "Live money") },
      { value: "buybacks", label: translate("Återköp (live)", "Buybacks (live)") },
      { value: "short", label: translate("Blankning & handel", "Short interest & trading") },
      { value: "investment", label: translate("Live Investment", "Live investment") },
    ],
    [translate]
  );

  const handlePanelChange = useCallback((_, value) => {
    if (value) setActivePanel(value);
  }, []);

  const renderActivePanel = useCallback(() => {
    if (activePanel === "live") return <LivePlayersControlPanel />;

    if (activePanel === "financial") {
      if (!financialReports || !dividendData) {
        return (
          <Box sx={{ color: "rgba(148,163,184,0.75)", p: 3 }}>
            {translate("Finansiella rapporter saknas för denna vy.", "Financial reports are missing for this view.")}
          </Box>
        );
      }
      return <FinancialOverviewPanel financialReports={financialReports} dividendData={dividendData} />;
    }

    if (activePanel === "fairvalue") {
      const reports = financialReports?.financialReports ?? [];
      if (!reports.length) {
        return (
          <Box sx={{ color: "rgba(148,163,184,0.75)", p: 3 }}>
            {translate("Kräver kvartalsdata för att visa AI Fair Value.", "Quarterly data is required to show AI Fair Value.")}
          </Box>
        );
      }
      return <LiveAiFairValuePanel reports={reports} />;
    }

    if (activePanel === "gameshow") {
      if (!financialReports || !averagePlayersData) {
        return (
          <Box sx={{ color: "rgba(148,163,184,0.75)", p: 3 }}>
            {translate("Kräver finansiella rapporter och spelardata.", "Requires financial reports and player data.")}
          </Box>
        );
      }
      return (
        <GameshowEarningsPanel
          financialReports={financialReports}
          averagePlayersData={averagePlayersData}
        />
      );
    }

    if (activePanel === "money") return <LiveMoneyCounterPanel />;

    if (activePanel === "buybacks")
      return <LiveStockBuyBackInfoPanel dividendData={dividendData} buybackCash={500_000_000} />;

    if (activePanel === "short") return <ShortIntelligencePanel />;

    if (activePanel === "investment")
      return <LiveInvestmentCalculatorPanel dividendData={dividendData} />;

    return <ShortIntelligencePanel />;
  }, [activePanel, averagePlayersData, dividendData, financialReports, translate]);

  const userEmail = user?.email ?? null;
  const isLiveMoneyPanel = activePanel === "money";
  const panelContent = renderActivePanel();

  return (
    <Box sx={{ width: "100%", display: "flex", justifyContent: "center" }}>
      <Box
        sx={{
          background: "linear-gradient(135deg, #0f172a, #111c2f)",
          borderRadius: "24px",
          border: "1px solid rgba(148,163,184,0.18)",
          boxShadow: "0 24px 50px rgba(15,23,42,0.45)",
          px: { xs: 2.8, sm: 4.5, md: 5.5 },
          py: { xs: 2.4, sm: 3.2 },
          maxWidth: { xs: "100%", lg: "1400px" },
          width: "100%",
        }}
      >
        <Stack spacing={{ xs: 1.8, sm: 2.5, md: 3 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: { xs: "flex-start", md: "center" },
              flexDirection: { xs: "column", md: "row" },
              gap: { xs: 1.5, md: 2.5 },
              flexWrap: "wrap",
            }}
          >
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.2 }}>
              <Chip
                size="small"
                label={venueChipLabel}
                sx={{
                  backgroundColor: "rgba(15,23,42,0.55)",
                  color: "#cbd5f5",
                  borderRadius: "999px",
                }}
              />
              <Chip
                size="small"
                label={marketStatusChip.label}
                sx={{
                  backgroundColor: marketStatusChip.bg,
                  color: marketStatusChip.color,
                  borderRadius: "999px",
                  border: marketStatusChip.border,
                }}
              />
              <Chip
                size="small"
                label={blankningChipLabel}
                sx={{
                  backgroundColor: "rgba(250,204,21,0.18)",
                  color: "#facc15",
                  borderRadius: "999px",
                  border: "1px solid rgba(250,204,21,0.35)",
                }}
              />
              <Chip
                component="a"
                href="https://buymeacoffee.com/evuul"
                target="_blank"
                rel="noopener noreferrer"
                clickable
                size="small"
                icon={<LocalCafeRounded sx={{ color: "#f9a8d4" }} />}
                label={translate("Stötta sidan", "Support the site")}
                sx={{
                  background: "linear-gradient(135deg, rgba(236,72,153,0.15), rgba(14,165,233,0.15))",
                  color: "#f8fafc",
                  borderRadius: "999px",
                  border: "1px solid rgba(236,72,153,0.35)",
                  transition: "transform 120ms ease",
                  "&:hover": {
                    transform: "translateY(-1px)",
                    background: "linear-gradient(135deg, rgba(236,72,153,0.25), rgba(14,165,233,0.25))",
                  },
                }}
              />
            </Box>

            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              justifyContent="flex-end"
              flexWrap="wrap"
            >
              <ToggleButtonGroup
                exclusive
                size="small"
                value={locale}
                onChange={(_, value) => value && setLocale(value)}
                sx={{
                  backgroundColor: "rgba(15,23,42,0.35)",
                  borderRadius: "999px",
                  p: 0.3,
                }}
              >
                {LOCALE_OPTIONS.map((option) => (
                  <ToggleButton
                    key={option.value}
                    value={option.value}
                    sx={{
                      textTransform: "none",
                      border: 0,
                      borderRadius: "999px!important",
                      color: "rgba(226,232,240,0.75)",
                      "&.Mui-selected": {
                        color: "#0f172a",
                        backgroundColor: "#f8fafc",
                        fontWeight: 700,
                      },
                    }}
                  >
                    {option.label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>

              {isAuthenticated && userEmail && (
                <Chip
                  size="small"
                  label={userEmail}
                  sx={{ backgroundColor: "rgba(15,23,42,0.55)", color: "#cbd5f5", borderRadius: "999px" }}
                />
              )}
              {isAuthenticated && (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={logout}
                  sx={{
                    textTransform: "none",
                    borderColor: "rgba(148,163,184,0.35)",
                    color: "#e2e8f0",
                    "&:hover": {
                      borderColor: "rgba(148,163,184,0.55)",
                      backgroundColor: "rgba(148,163,184,0.12)",
                    },
                  }}
                >
                  {translate("Logga ut", "Log out")}
                </Button>
              )}
            </Stack>
          </Box>

          <Stack spacing={{ xs: 1.4, sm: 1.6 }} alignItems="center" textAlign="center">
            <Typography
              variant="overline"
              sx={{
                letterSpacing: { xs: 5, sm: 7.5 },
                color: "rgba(148,163,184,0.78)",
                fontWeight: 700,
                fontSize: { xs: "0.82rem", sm: "1rem", md: "1.12rem" },
                textTransform: "uppercase",
              }}
            >
              {translate("Evolution Control Center", "Evolution Control Center")}
            </Typography>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 800,
                fontSize: { xs: "1.9rem", sm: "2.4rem", md: "2.9rem" },
                color: "#f8fafc",
              }}
            >
              {translate(
                "Spårning i realtid för kurs, lobby och blankning",
                "Real-time tracking for price, lobby, and short interest"
              )}
            </Typography>
            <Typography
              variant="body1"
              sx={{
                maxWidth: 720,
                color: "rgba(226,232,240,0.75)",
                lineHeight: 1.6,
              }}
            >
              {translate(
                "Växla mellan finansiella dashboards utan att lämna kontrollrummet. Aktiekurs, live-spelare och marknadsvärde visas alltid längst upp.",
                "Switch between financial dashboards without leaving the control room. Stock price, live players, and market cap stay pinned to the top."
              )}
            </Typography>
          </Stack>

          <Box
            sx={{
              width: "100%",
              maxWidth: { xs: "100%", lg: "1400px" },
              mx: "auto",
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              alignItems: { xs: "stretch", md: "stretch" },
              justifyContent: { xs: "center", md: "space-between" },
              gap: { xs: 1.2, sm: 1.4, md: 2.8 },
              mt: { xs: 0.2, sm: 0.6 },
              px: { xs: 0, md: 0 },
            }}
          >
            <Box
              sx={{
                flex: { xs: "1 1 auto", md: "0 1 320px" },
                display: "flex",
                justifyContent: "center",
              }}
            >
              <Box
                sx={{
                  background: "rgba(15,23,42,0.35)",
                  borderRadius: "18px",
                  p: { xs: 1.6, sm: 1.9 },
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 0.9,
                  width: "100%",
                  maxWidth: 320,
                }}
              >
                <Stack direction="row" spacing={0.8} alignItems="center">
                  <Typography variant="overline" sx={{ color: "rgba(226,232,240,0.85)", letterSpacing: 1.4, fontWeight: 600 }}>
                    {translate("Live · spelare", "Live · players")}
                  </Typography>
                  <Box sx={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#22c55e" }} />
                </Stack>
                <Typography
                  variant="h2"
                  sx={{
                    fontWeight: 800,
                    fontSize: { xs: "2.1rem", md: "2.5rem" },
                    color: "#f8fafc",
                  }}
                >
                  {Number.isFinite(playersValue) ? playersValue.toLocaleString("sv-SE") : "—"}
                </Typography>
                <Typography variant="body2" sx={{ color: "rgba(148,163,184,0.75)" }}>
                  {playersUpdatedLabel
                    ? translate(`Senast ${playersUpdatedLabel}`, `Latest ${playersUpdatedLabel}`)
                    : loadingPlayers
                    ? translate("Hämtar live-data…", "Fetching live data…")
                    : translate("Ingen uppdatering ännu", "No update yet")}
                </Typography>
                <Button
                  size="small"
                  variant={simulateLobby ? "contained" : "outlined"}
                  onClick={() => setSimulateLobby((prev) => !prev)}
                  sx={{
                    alignSelf: "center",
                    textTransform: "none",
                    borderColor: simulateLobby ? "rgba(56,189,248,0.55)" : "rgba(148,163,184,0.35)",
                    backgroundColor: simulateLobby ? "rgba(56,189,248,0.25)" : "transparent",
                    color: "#e2e8f0",
                    fontWeight: 600,
                    "&:hover": {
                      borderColor: simulateLobby ? "rgba(56,189,248,0.75)" : "rgba(148,163,184,0.55)",
                      backgroundColor: simulateLobby ? "rgba(56,189,248,0.35)" : "rgba(148,163,184,0.12)",
                    },
                  }}
                >
                {simulateButtonLabel}
              </Button>
              {simulateLobby && Number.isFinite(playersValue) && (
                <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.6)" }}>
                  {translate("EVOs riktiga lobby ligger ca 10% över min.", "EVO's real lobby is about 10% above mine.")}
                </Typography>
              )}
            </Box>
          </Box>

          <Box
            sx={{
              flex: { xs: "1 1 auto", md: "0 1 320px" },
              display: "flex",
              justifyContent: "center",
            }}
          >
              <Box
                sx={{
                  background: "rgba(15,23,42,0.35)",
                  borderRadius: "18px",
                  p: { xs: 1.6, sm: 1.9 },
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 0.9,
                  width: "100%",
                  maxWidth: 320,
                }}
              >
                <Stack direction="row" spacing={0.8} alignItems="center">
                  <Typography variant="overline" sx={{ color: "rgba(226,232,240,0.85)", letterSpacing: 1.4, fontWeight: 600 }}>
                    {translate("Aktiekurs", "Stock price")}
                  </Typography>
                  <Box sx={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#38bdf8" }} />
                </Stack>
                <Typography
                  variant="h2"
                  sx={{
                    fontWeight: 800,
                    fontSize: { xs: "2.1rem", md: "2.5rem" },
                    color: "#f8fafc",
                    whiteSpace: "nowrap",
                  }}
                >
                  {loadingPrice ? "—" : priceDisplay}
                </Typography>
                <Typography sx={{ color: changeColor, fontWeight: 700 }}>{changeDisplay}</Typography>
                <Typography variant="body2" sx={{ color: "rgba(148,163,184,0.75)" }}>
                  {ytdLabel || translate("YTD saknas", "YTD missing")}
                  {gainsLossLabel ? ` · ${gainsLossLabel}` : ""}
                </Typography>
                <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.6)" }}>
                  {stockUpdatedLabel
                    ? translate(`Uppdaterad ${stockUpdatedLabel}`, `Updated ${stockUpdatedLabel}`)
                    : translate("Senaste kurs saknas", "Latest quote missing")}
                </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              flex: { xs: "1 1 auto", md: "0 1 320px" },
              display: { xs: "none", md: "flex" },
              justifyContent: "center",
            }}
          >
              <Box
                sx={{
                  background: "rgba(15,23,42,0.35)",
                  borderRadius: "18px",
                  p: { xs: 1.6, sm: 1.9 },
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 0.9,
                  width: "100%",
                  maxWidth: 320,
                }}
              >
                <Stack direction="row" spacing={0.8} alignItems="center">
                  <Typography variant="overline" sx={{ color: "rgba(226,232,240,0.85)", letterSpacing: 1.4, fontWeight: 600 }}>
                    {translate("Marknadsvärde", "Market cap")}
                  </Typography>
                  <Box sx={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#c084fc" }} />
                </Stack>
                <Typography
                  variant="h2"
                  sx={{
                    fontWeight: 800,
                    fontSize: { xs: "2.1rem", md: "2.5rem" },
                    color: "#f8fafc",
                    whiteSpace: "nowrap",
                  }}
                >
                  {fmtCap(marketCap)}
                </Typography>
                <Typography sx={{ color: marketStatusChip.color, fontWeight: 700 }}>
                  {marketStatusChip.label}
                </Typography>
                <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.6)" }}>
                  {translate("Uppdateras tillsammans med kursdata.", "Updates alongside price data.")}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Box
            sx={{
              background: "rgba(15,23,42,0.45)",
              borderRadius: "20px",
              p: { xs: 1.4, sm: 1.7 },
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: { xs: 0.8, sm: 1 },
              mt: { xs: -0.6, sm: -1, md: -1.3 },
            }}
          >
            <Typography
              variant="h3"
              sx={{
                fontWeight: 800,
                fontSize: { xs: "1.8rem", sm: "2rem" },
                color: "#f8fafc",
                textAlign: "center",
              }}
            >
              {translate("Topp 3 liveshower just nu", "Top 3 live shows right now")}
            </Typography>
            {top3.length ? (
              isMobileMenu ? (
                <Stack
                  direction="row"
                  spacing={1}
                  justifyContent="center"
                  alignItems="center"
                  flexWrap="wrap"
                  sx={{ width: "100%", maxWidth: 640, mx: "auto" }}
                >
                  {top3.map((item, index) => {
                    const playersLabel = Number.isFinite(item.players)
                      ? item.players.toLocaleString("sv-SE")
                      : "—";
                    const displayLabel = item.label === "Monopoly Big Baller" ? "Big Baller" : item.label;
                    return (
                      <Chip
                        key={item.id ?? index}
                        label={`#${index + 1} ${displayLabel} · ${playersLabel}`}
                        sx={{
                          backgroundColor: "rgba(15,23,42,0.55)",
                          color: item.color,
                          border: `1px solid ${item.color}44`,
                          borderRadius: "999px",
                          fontWeight: 600,
                          px: 1.4,
                          py: 1,
                        }}
                      />
                    );
                  })}
                </Stack>
              ) : (
                <Grid
                  container
                  spacing={{ xs: 1.2, sm: 1.8 }}
                  sx={{ width: "100%", maxWidth: { xs: "100%", md: 960 }, mx: "auto" }}
                  justifyContent="center"
                  alignItems="stretch"
                >
                  {top3.map((item, index) => {
                    const playersLabel = Number.isFinite(item.players)
                      ? item.players.toLocaleString("sv-SE")
                      : "—";
                    const updatedLabel = item.updated ? formatTime(item.updated) : null;
                    const displayLabel = item.label === "Monopoly Big Baller" ? "Big Baller" : item.label;
                    return (
                      <Grid
                        key={item.id ?? index}
                        item
                        xs={12}
                        sm="auto"
                        sx={{ display: "flex", justifyContent: "center", px: { md: 1 }, maxWidth: 320 }}
                      >
                        <Box
                          sx={{
                            height: "100%",
                            borderRadius: "18px",
                            p: { xs: 2.4, sm: 2.8 },
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 0.9,
                            width: "100%",
                            maxWidth: 320,
                          }}
                        >
                          <Stack spacing={0.6} alignItems="center">
                            <Typography
                              variant="overline"
                              sx={{
                                color: "rgba(226,232,240,0.85)",
                                letterSpacing: 1.5,
                                fontWeight: 600,
                              }}
                            >
                              #{index + 1}
                            </Typography>
                            <Typography
                              variant="h6"
                              sx={{ color: "#f8fafc", fontWeight: 700, textAlign: "center" }}
                            >
                              {displayLabel}
                            </Typography>
                            <Typography
                              variant="h3"
                              sx={{ color: item.color, fontWeight: 700, textAlign: "center" }}
                            >
                              {playersLabel}
                            </Typography>
                          </Stack>
                          <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.7)" }}>
                            {updatedLabel
                              ? translate(`Senast ${updatedLabel}`, `Latest ${updatedLabel}`)
                              : translate("Ingen tidsstämpel", "No timestamp")}
                          </Typography>
                        </Box>
                      </Grid>
                    );
                  })}
                </Grid>
              )
            ) : (
              <Typography sx={{ color: "rgba(148,163,184,0.75)", textAlign: "center" }}>
                {translate("Ingen live-data tillgänglig just nu.", "No live data available right now.")}
              </Typography>
            )}
          </Box>

          <Stack spacing={{ xs: 1.6, sm: 1.9 }} alignItems="stretch">
            <Box sx={{ display: "flex", justifyContent: "center" }}>
              {isMobileMenu ? (
                <FormControl fullWidth size="small" sx={{ maxWidth: 260 }}>
                  <Select
                    value={activePanel}
                    onChange={(event) => setActivePanel(event.target.value)}
                    sx={{
                      borderRadius: "999px",
                      color: "#f8fafc",
                      backgroundColor: "rgba(148,163,184,0.12)",
                      border: "1px solid rgba(148,163,184,0.2)",
                      "& .MuiSelect-select": { py: 1.1, pl: 2.2 },
                    }}
                  >
                    {panelOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : (
                <ToggleButtonGroup
                  value={activePanel}
                  exclusive
                  onChange={handlePanelChange}
                  sx={{
                    backgroundColor: "rgba(148,163,184,0.12)",
                    borderRadius: "999px",
                    p: 0.5,
                    flexWrap: "wrap",
                  }}
                >
                  {panelOptions.map((option) => (
                    <ToggleButton
                      key={option.value}
                      value={option.value}
                      sx={{
                        textTransform: "none",
                        color: "rgba(226,232,240,0.8)",
                        border: 0,
                        borderRadius: "999px!important",
                        px: { xs: 1.5, md: 2.5 },
                        py: 0.75,
                        "&.Mui-selected": {
                          color: "#f8fafc",
                          backgroundColor:
                            option.value === "buybacks"
                              ? "rgba(134,239,172,0.22)"
                              : option.value === "short"
                              ? "rgba(248,113,113,0.22)"
                              : "rgba(56,189,248,0.25)",
                        },
                      }}
                    >
                      {option.label}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              )}
            </Box>

            <Box
              sx={{
                width: "100%",
                mt: { xs: 1, sm: 1.5 },
                mx: isLiveMoneyPanel ? "auto" : { xs: -3, sm: -5, md: -6 },
                maxWidth: isLiveMoneyPanel ? "min(1700px, 100%)" : "none",
                display: isLiveMoneyPanel ? "flex" : "block",
                justifyContent: isLiveMoneyPanel ? "center" : "flex-start",
                "& > *": {
                  background: "transparent!important",
                  border: "none!important",
                  boxShadow: "none!important",
                },
              }}
            >
              {panelContent}
            </Box>
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
}
