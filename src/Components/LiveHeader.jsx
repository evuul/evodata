"use client";

// Top-level live dashboard header and navigation for the casino score views.

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  Typography,
  Box,
  CircularProgress,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import FinancialOverviewPanel from "./FinancialOverviewCard";
import LiveHeaderTopBar from "./LiveHeaderTopBar";
import LiveHeaderOverviewSection from "./LiveHeaderOverviewSection";
import LiveHeaderPanelSwitcher from "./LiveHeaderPanelSwitcher";
import LiveHeaderPanelContent from "./LiveHeaderPanelContent";
import { useStockPriceContext } from "../context/StockPriceContext";
import { usePlayersLive } from "../context/PlayersLiveContext";
import { useAuth } from "../context/AuthContext";
import { COLORS as GAME_COLORS } from "@/config/games";
import { useLocale, useTranslate } from "@/context/LocaleContext";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@/lib/useMuiMediaQuery";

const EVO_LEI = "549300SUH6ZR1RF6TA88";
const LOBBY_SIM_MULTIPLIER = 1.1;
const LIVE_TOP3_ENDPOINT = process.env.NEXT_PUBLIC_LIVE_TOP3_ENDPOINT ?? "/api/live-top3";
const TOP_WIN_REFRESH_INTERVAL = 15 * 60 * 1000;
const SUPPORT_URL = "https://buymeacoffee.com/evuul";
const DONATION_NUDGE_STORAGE_KEY = "evodata_donation_nudge_dismissed_v1";
const DONATION_NUDGE_TTL_MS = 24 * 60 * 60 * 1000;
const LIVE_CACHE_MS = 10 * 60 * 1000;
const LOBBY_ATH_DAYS = 365; // hämta tillräckligt många dagar för att få ATH (använder snapshotens ATH oavsett)
const SHOW_MY_PAGE_NEW_BADGE = true;
const LIVE_TRACKER_OFFLINE = ["1", "true", "yes", "on"].includes(
  String(process.env.NEXT_PUBLIC_LIVE_TRACKER_OFFLINE || "").trim().toLowerCase()
);
const LIVE_TRACKER_OFFLINE_NOTE =
  process.env.NEXT_PUBLIC_LIVE_TRACKER_OFFLINE_NOTE ||
  "Live tracker is temporarily offline. A fix is in progress.";
const LOCAL_HOURLY_COMPARE_ENABLED = process.env.NEXT_PUBLIC_LOCAL_HOURLY_COMPARE === "1";

const liveCaches = {
  short: { ts: 0, percent: null },
  top3: { ts: 0, entries: null },
};

const parseTopWinTimestamp = (value) => {
  if (!value) return 0;
  const ts = Date.parse(value);
  return Number.isFinite(ts) ? ts : 0;
};

const prettifyGameShowName = (value) => {
  if (!value) return "";
  const stringValue = String(value);
  if (!stringValue.includes("_")) return stringValue;
  return stringValue
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const extractLatestTopWin = (entries) => {
  if (!Array.isArray(entries)) return null;
  const normalized = entries
    .map((entry) => {
      const totalAmount = Number(entry?.totalAmount ?? entry?.amount ?? entry?.total);
      const multiplier = Number(entry?.multiplier ?? entry?.multi ?? entry?.x);
      const settledAt = entry?.settledAt ?? entry?.startedAt ?? entry?.createdAt ?? null;
      const gameShow = entry?.gameShow ?? entry?.game ?? entry?.name ?? null;
      return {
        gameShow,
        totalAmount: Number.isFinite(totalAmount) ? totalAmount : null,
        multiplier: Number.isFinite(multiplier) ? multiplier : null,
        settledAt,
      };
    })
    .filter((item) => item.gameShow && item.totalAmount != null);

  if (!normalized.length) return null;
  normalized.sort((a, b) => parseTopWinTimestamp(b.settledAt) - parseTopWinTimestamp(a.settledAt));
  return normalized[0];
};

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

const LiveAiFairValuePanel = dynamic(() => import("./LiveAiFairValue"), { ssr: false, loading: PanelLoader });
const GameshowEarningsPanel = dynamic(() => import("./LiveShowIntelligence"), { ssr: false, loading: PanelLoader });
const ShortIntelligencePanel = dynamic(() => import("./ShortIntellegence"), { ssr: false, loading: PanelLoader });
const LivePlayersControlPanel = dynamic(() => import("./LivePlayersControlPanel"), { ssr: false, loading: PanelLoader });
const LiveMoneyCounterPanel = dynamic(() => import("./LiveMoneyCounter"), { ssr: false, loading: PanelLoader });
const LiveStockBuyBackInfoPanel = dynamic(() => import("./LiveStockBuyBackInfo"), { ssr: false, loading: PanelLoader });
const ReportViewPanel = dynamic(() => import("./ReportView"), { ssr: false, loading: PanelLoader });
const FaqPanel = dynamic(() => import("./FaqPanel"), { ssr: false, loading: PanelLoader });
const CashPositionPanel = dynamic(() => import("./CashPositionCard"), { ssr: false, loading: PanelLoader });
const CapitalAllocationPanel = dynamic(() => import("./CapitalAllocationCard"), { ssr: false, loading: PanelLoader });

export default function LiveHeader({ financialReports, averagePlayersData, dividendData, buybackData, sharesData }) {
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
    lobbyStats,
  } = usePlayersLive();

  const { isAuthenticated, user, token, logout } = useAuth();
  const isAdminView = Boolean(user?.isAdmin);
  const router = useRouter();
  const { locale, setLocale } = useLocale();
  const translate = useTranslate();
  const [cashView, setCashView] = useState("cash");

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
  const [latestTopWin, setLatestTopWin] = useState(null);
  const [loadingLatestTopWin, setLoadingLatestTopWin] = useState(false);
  const [lobbyAth, setLobbyAth] = useState(null);
  const [showDonationNudge, setShowDonationNudge] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const mobileCardsRef = useRef(null);
  const [mobileCardIndex, setMobileCardIndex] = useState(0);
  const scrollToCard = useCallback((index) => {
    const el = mobileCardsRef.current;
    if (!el) return;
    const width = el.clientWidth;
    if (!width) return;
    const step = width;
    el.scrollTo({ left: index * step, behavior: "smooth" });
  }, []);

  const lobbyAthLabel = useMemo(() => {
    const raw = lobbyAth?.value;
    const val =
      typeof raw === "number"
        ? raw
        : raw != null
        ? Number(String(raw).replace(/\u00A0/g, " ").replace(/\s/g, "").replace(/[^\d.-]/g, ""))
        : NaN;
    if (!Number.isFinite(val)) return null;
    const date = lobbyAth?.date ? lobbyAth.date : null;
    const num = val.toLocaleString("sv-SE");
    return date ? `${translate("Lobby ATH", "Lobby ATH")}: ${num} (${date})` : `${translate("Lobby ATH", "Lobby ATH")}: ${num}`;
  }, [lobbyAth, translate]);

  const lobbyAthLabelMobile = useMemo(() => {
    const raw = lobbyAth?.value;
    const val =
      typeof raw === "number"
        ? raw
        : raw != null
        ? Number(String(raw).replace(/\u00A0/g, " ").replace(/\s/g, "").replace(/[^\d.-]/g, ""))
        : NaN;
    if (!Number.isFinite(val)) return null;
    const num = val.toLocaleString("sv-SE");
    return `${translate("Lobby ATH", "Lobby ATH")}: ${num}`;
  }, [lobbyAth, translate]);

  const fetchShortFromHistory = useCallback(async () => {
    const now = Date.now();
    if (now - liveCaches.short.ts < LIVE_CACHE_MS && liveCaches.short.percent != null) {
      setShortPercent(liveCaches.short.percent);
      return;
    }
    try {
      setLoadingShort(true);
      const res = await fetch("/api/short/history");
      if (!res.ok) throw new Error("history failed");
      const data = await res.json();
      const items = Array.isArray(data.items) ? data.items : [];
      if (items.length) {
        const latest = items[items.length - 1];
        const percent = Number(latest.percent);
        if (Number.isFinite(percent)) {
          setShortPercent(percent);
          liveCaches.short = { ts: now, percent };
          return;
        }
      }
      throw new Error("missing");
    } catch {
      try {
        const res = await fetch(`/api/short?lei=${EVO_LEI}`);
        if (!res.ok) return;
        const json = await res.json();
        const percent = Number(json.totalPercent);
        if (Number.isFinite(percent)) {
          setShortPercent(percent);
          liveCaches.short = { ts: Date.now(), percent };
        }
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
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(DONATION_NUDGE_STORAGE_KEY) : null;
      if (raw) {
        const parsed = Number(raw);
        if (Number.isFinite(parsed) && Date.now() - parsed < DONATION_NUDGE_TTL_MS) return;
      }
    } catch {
      /* ignore storage errors */
    }
    const timerId = setTimeout(() => setShowDonationNudge(true), 3200);
    return () => clearTimeout(timerId);
  }, []);

  const handleDismissDonationNudge = useCallback(() => {
    setShowDonationNudge(false);
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(DONATION_NUDGE_STORAGE_KEY, String(Date.now()));
      }
    } catch {
      /* ignore storage errors */
    }
  }, []);

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

  useEffect(() => {
    let isActive = true;
    let latestRequestId = 0;

    const loadLobbyOverview = async () => {
      try {
        const res = await fetch(`/api/casinoscores/lobby/overview?days=${LOBBY_ATH_DAYS}`);
        if (!res.ok) throw new Error(`overview failed: ${res.status}`);
        const data = await res.json();
        if (!isActive) return;
        setLobbyAth(data?.ath || null);
      } catch (error) {
        if (!isActive) return;
        console.warn("[LiveHeader] Failed to fetch lobby overview:", error);
        setLobbyAth(null);
      }
    };

    const loadLatestTopWin = async () => {
      const now = Date.now();
      if (now - liveCaches.top3.ts < LIVE_CACHE_MS && Array.isArray(liveCaches.top3.entries)) {
        setLatestTopWin(extractLatestTopWin(liveCaches.top3.entries));
        return;
      }
      if (!isActive) return;
      latestRequestId += 1;
      const requestId = latestRequestId;
      setLoadingLatestTopWin(true);
      try {
        const res = await fetch(LIVE_TOP3_ENDPOINT);
        if (!res.ok) throw new Error(`live top3 failed: ${res.status}`);
        const data = await res.json();
        if (!isActive || requestId !== latestRequestId) return;
        const entries = data?.entries ?? [];
        liveCaches.top3 = { ts: Date.now(), entries };
        setLatestTopWin(extractLatestTopWin(entries));
      } catch (error) {
        if (!isActive || requestId !== latestRequestId) return;
        console.warn("[LiveHeader] Failed to fetch latest top win:", error);
        setLatestTopWin(null);
      } finally {
        if (!isActive || requestId !== latestRequestId) return;
        setLoadingLatestTopWin(false);
      }
    };

    const handleFocus = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      loadLatestTopWin();
      loadLobbyOverview();
    };

    loadLatestTopWin();
    loadLobbyOverview();
    const intervalId = setInterval(loadLatestTopWin, TOP_WIN_REFRESH_INTERVAL);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("visibilitychange", handleFocus);

    return () => {
      isActive = false;
      clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("visibilitychange", handleFocus);
    };
  }, []);

  useEffect(() => {
    if (!isMobileMenu) return () => {};
    const el = mobileCardsRef.current;
    if (!el) return () => {};

    let rafId = 0;
    const updateIndex = () => {
      const width = el.clientWidth;
      if (!width) return;
      const step = width;
      const nextIndex = Math.max(0, Math.min(2, Math.round(el.scrollLeft / step)));
      setMobileCardIndex(nextIndex);
    };

    const onScroll = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateIndex);
    };

    updateIndex();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", updateIndex);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", updateIndex);
    };
  }, [isMobileMenu]);

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

  const zeroPlayerGames = useMemo(() => {
    const games = Array.isArray(playerGames) ? playerGames : [];
    return games
      .map((game) => {
        const entry = liveGames?.[game.id] || {};
        return {
          id: game.id,
          label: game.label || game.id,
          players: entry.players,
          stale: Boolean(entry.stale),
        };
      })
      .filter((game) => Number(game.players) === 0 && !game.stale);
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
  const venueChipLabelMobile = stockSymbol;
  const marketDotColor = isMarketOpen() ? "#22c55e" : "#f87171";

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
  const donationNudgeText = useMemo(
    () =>
      translate(
        "Serverkostnaden ökar när fler hittar hit. Jag är student och varje kaffe täcker databas + drift.",
        "Traffic keeps growing and hosting costs climb. I build this as a student—each coffee keeps the DB and hosting alive."
      ),
    [translate]
  );
  const donationNudgeClickLabel = useMemo(
    () => translate("Tryck på stötta-badgen →", "Tap the support badge →"),
    [translate]
  );

  const playersUpdatedLabel = playersLastUpdated ? formatTime(playersLastUpdated) : null;
  const hourlyComparisonMeta = useMemo(() => {
    if (!isAdminView && !LOCAL_HOURLY_COMPARE_ENABLED) return null;
    const cmp = lobbyStats?.hourlyComparison;
    if (!cmp) return null;
    const baseline = cmp?.baselineAvg;
    const samples = cmp?.samples;
    const hour = String(cmp?.hour || "").trim();
    const currentLive = Number.isFinite(playersValue) ? Number(playersValue) : Number(cmp?.currentTotal);
    const delta =
      Number.isFinite(currentLive) && Number.isFinite(baseline) && baseline > 0
        ? ((currentLive - baseline) / baseline) * 100
        : Number(cmp?.deltaPct);
    if (
      !Number.isFinite(delta) ||
      !Number.isFinite(baseline) ||
      baseline <= 0 ||
      !Number.isFinite(samples) ||
      samples <= 0 ||
      !hour
    ) {
      return null;
    }
    const sign = delta > 0 ? "+" : "";
    const text = translate(
      `${hour}:00 vs 60d snitt: ${sign}${delta.toFixed(1)}% (bas ${Math.round(baseline).toLocaleString("sv-SE")})`,
      `${hour}:00 vs 60d avg: ${sign}${delta.toFixed(1)}% (base ${Math.round(baseline).toLocaleString("sv-SE")})`
    );
    const color =
      delta > 0 ? "#86efac" : delta < 0 ? "#fca5a5" : "rgba(148,163,184,0.72)";
    return { text, color };
  }, [isAdminView, lobbyStats?.hourlyComparison, playersValue, translate]);
  const stockUpdatedLabel = stockLastUpdated ? formatTime(stockLastUpdated) : null;

  const blankningChipLabel = loadingShort
    ? translate("Blankning: hämtar…", "Short interest: loading…")
    : Number.isFinite(shortPercent)
    ? translate(
        `Blankning: ${shortPercent.toFixed(2)}%`,
        `Short interest: ${shortPercent.toFixed(2)}%`
      )
    : translate("Blankning: –", "Short interest: –");

  const blankningChipLabelMobile = loadingShort
    ? translate("Blankning…", "Short…")
    : Number.isFinite(shortPercent)
    ? translate(`Blankning ${shortPercent.toFixed(2)}%`, `Short ${shortPercent.toFixed(2)}%`)
    : translate("Blankning –", "Short –");
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

  const maintenanceWarningLabel = useMemo(() => {
    if (!zeroPlayerGames.length) return null;
    const labels = zeroPlayerGames.map((game) => String(game.label || game.id));
    const shown = labels.slice(0, 4).join(", ");
    const moreCount = labels.length > 4 ? labels.length - 4 : 0;
    const suffix = moreCount > 0 ? ` +${moreCount}` : "";
    return translate(
      `Möjlig maintenance (0 spelare): ${shown}${suffix}`,
      `Possible maintenance (0 players): ${shown}${suffix}`
    );
  }, [zeroPlayerGames, translate]);

  const playerDataAttentionLabel = useMemo(() => {
    return translate(
      "Attention: några spelardata ligger efter EVOs lobby och kan visa lägre siffror än verkligheten just nu. Vi jobbar på en fix.",
      "Attention: some player data is lagging EVO's lobby and may show lower numbers than reality right now. We're working on a fix."
    );
  }, [translate]);

  const [activePanel, setActivePanel] = useState("live");
  const PANEL_VALUES = useMemo(
    () =>
      new Set([
        "live",
        "financial",
        "cash",
        "gameshow",
        "fairvalue",
        "report",
        "money",
        "buybacks",
        "short",
        "faq",
      ]),
    []
  );
  const latestWinTimeFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "sv-SE", { hour: "2-digit", minute: "2-digit" }),
    [locale]
  );
  const formatLatestWinTime = useCallback(
    (value) => {
      if (!value) return null;
      const date = new Date(value);
      if (!Number.isFinite(date.getTime())) return null;
      return latestWinTimeFormatter.format(date);
    },
    [latestWinTimeFormatter]
  );
  const formatLatestWinAmount = useCallback(
    (value) => {
      if (!Number.isFinite(value)) return null;
      const localeKey = locale === "en" ? "en-US" : "sv-SE";
      const options =
        value >= 10_000
          ? { minimumFractionDigits: 0, maximumFractionDigits: 0 }
          : { minimumFractionDigits: 1, maximumFractionDigits: 1 };
      return `${value.toLocaleString(localeKey, options)} €`;
    },
    [locale]
  );
  const latestTopWinLabel = useMemo(() => {
    if (loadingLatestTopWin) {
      return translate("Storvinst: hämtar…", "Top win: loading…");
    }
    if (!latestTopWin) {
      return translate("Storvinst: saknas", "Top win: unavailable");
    }
    const amountLabel = formatLatestWinAmount(latestTopWin.totalAmount);
    const timeLabel = formatLatestWinTime(latestTopWin.settledAt);
    const multiplierLabel = Number.isFinite(latestTopWin.multiplier) ? `x${latestTopWin.multiplier}` : null;
    const parts = [
      prettifyGameShowName(latestTopWin.gameShow),
      amountLabel,
      multiplierLabel,
      timeLabel,
    ].filter(Boolean);
    return `${translate("Storvinst", "Top win")}: ${parts.join(" · ")}`;
  }, [formatLatestWinAmount, formatLatestWinTime, latestTopWin, loadingLatestTopWin, translate]);
  const latestTopWinLabelWithEmoji = useMemo(() => {
    if (!latestTopWinLabel) return latestTopWinLabel;
    return `🏆 ${latestTopWinLabel}`;
  }, [latestTopWinLabel]);
  const panelOptions = useMemo(
    () => [
      { value: "live", label: translate("Gameshows", "Gameshows") },
      { value: "financial", label: translate("Finansiell översikt", "Financial overview") },
      { value: "cash", label: translate("Kassa", "Cash position") },
      { value: "gameshow", label: translate("Forecast Earnings", "Forecast earnings") },
      { value: "fairvalue", label: translate("AI Fair Value", "AI Fair Value") },
      { value: "report", label: translate("Rapportanalys", "Report analysis") },
      { value: "money", label: translate("Live Money", "Live money") },
      { value: "buybacks", label: translate("Återköp", "Buybacks") },
      { value: "short", label: translate("Blankning", "Short interest") },
      { value: "faq", label: translate("FAQ", "FAQ") },
    ],
    [translate]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const panelParam = params.get("panel");
    if (panelParam && PANEL_VALUES.has(panelParam)) {
      setActivePanel(panelParam);
    }
  }, [PANEL_VALUES]);

  const handlePanelChange = useCallback((_, value) => {
    if (!value) return;
    setActivePanel(value);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (value === "live") {
      url.searchParams.delete("panel");
    } else {
      url.searchParams.set("panel", value);
    }
    window.history.replaceState(null, "", url.toString());
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    router.replace("/");
  }, [logout, router]);

  const userNameLabel = useMemo(() => {
    const first = String(user?.firstName || "").trim();
    if (first) return first;
    const email = String(user?.email || "").trim();
    if (!email) return null;
    const localPart = email.split("@")[0] || "";
    const maybeFirst = localPart.split(/[._-]/)[0] || localPart;
    if (!maybeFirst) return null;
    return maybeFirst.charAt(0).toUpperCase() + maybeFirst.slice(1);
  }, [user?.email, user?.firstName]);
  const isLiveMoneyPanel = activePanel === "money";
  const isLivePanel = activePanel === "live";

  useEffect(() => {
    if (!isAuthenticated || !token) return;
    let cancelled = false;
    const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000;
    const sendHeartbeat = async () => {
      if (cancelled || typeof window === "undefined") return;
      if (document.visibilityState !== "visible") return;
      try {
        await fetch("/api/admin/activity/heartbeat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            path: window.location.pathname,
            panel: activePanel,
            locale,
          }),
        });
      } catch {
        // silent
      }
    };

    sendHeartbeat();
    const id = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [activePanel, isAuthenticated, locale, token]);
  const panelContent = (
    <LiveHeaderPanelContent
      activePanel={activePanel}
      translate={translate}
      financialReports={financialReports}
      averagePlayersData={averagePlayersData}
      dividendData={dividendData}
      buybackData={buybackData}
      sharesData={sharesData}
      cashView={cashView}
      setCashView={setCashView}
      panels={{
        LivePlayersControlPanel,
        FinancialOverviewPanel,
        CashPositionPanel,
        LiveAiFairValuePanel,
        GameshowEarningsPanel,
        ReportViewPanel,
        FaqPanel,
        LiveMoneyCounterPanel,
        LiveStockBuyBackInfoPanel,
        ShortIntelligencePanel,
        CapitalAllocationPanel,
      }}
    />
  );
  const isUserMenuOpen = Boolean(userMenuAnchor);

  return (
    <Box
      sx={{
        background: "linear-gradient(135deg, #0f172a, #111c2f)",
        borderRadius: 0,
        border: "1px solid rgba(148,163,184,0.18)",
        boxShadow: "0 24px 50px rgba(15,23,42,0.45)",
        px: { xs: 2, sm: 3, md: 4 },
        py: { xs: 2.2, sm: 3 },
        width: "100%",
      }}
    >
      <Stack spacing={{ xs: 1.8, sm: 2.5, md: 3 }}>
          <LiveHeaderTopBar
            translate={translate}
            isMobileMenu={isMobileMenu}
            venueChipLabel={venueChipLabel}
            venueChipLabelMobile={venueChipLabelMobile}
            marketDotColor={marketDotColor}
            blankningChipLabel={blankningChipLabel}
            blankningChipLabelMobile={blankningChipLabelMobile}
            lobbyAthLabel={lobbyAthLabel}
            lobbyAthLabelMobile={lobbyAthLabelMobile}
            showDonationNudge={showDonationNudge}
            donationNudgeText={donationNudgeText}
            donationNudgeClickLabel={donationNudgeClickLabel}
            handleDismissDonationNudge={handleDismissDonationNudge}
            supportUrl={SUPPORT_URL}
            isAuthenticated={isAuthenticated}
            userNameLabel={userNameLabel}
            isUserMenuOpen={isUserMenuOpen}
            userMenuAnchor={userMenuAnchor}
            setUserMenuAnchor={setUserMenuAnchor}
            handleLogout={handleLogout}
            locale={locale}
            setLocale={setLocale}
            showMyPageNewBadge={SHOW_MY_PAGE_NEW_BADGE}
          />

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
            {!isMobileMenu && (
              <>
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
              </>
            )}
          </Stack>

          <LiveHeaderOverviewSection
            translate={translate}
            isMobileMenu={isMobileMenu}
            playerDataAttentionLabel={playerDataAttentionLabel}
            mobileCardsRef={mobileCardsRef}
            mobileCardIndex={mobileCardIndex}
            scrollToCard={scrollToCard}
            playersValue={playersValue}
            playersUpdatedLabel={playersUpdatedLabel}
            loadingPlayers={loadingPlayers}
            hourlyComparisonMeta={hourlyComparisonMeta}
            maintenanceWarningLabel={maintenanceWarningLabel}
            simulateLobby={simulateLobby}
            setSimulateLobby={setSimulateLobby}
            simulateButtonLabel={simulateButtonLabel}
            liveTrackerOffline={LIVE_TRACKER_OFFLINE}
            liveTrackerOfflineNote={LIVE_TRACKER_OFFLINE_NOTE}
            priceDisplay={priceDisplay}
            loadingPrice={loadingPrice}
            changeColor={changeColor}
            changeDisplay={changeDisplay}
            ytdLabel={ytdLabel}
            gainsLossLabel={gainsLossLabel}
            stockUpdatedLabel={stockUpdatedLabel}
            fmtCap={fmtCap}
            marketCap={marketCap}
            marketStatusChip={marketStatusChip}
            latestTopWinLabelWithEmoji={latestTopWinLabelWithEmoji}
            top3={top3}
            formatTime={formatTime}
          />

          <Stack spacing={{ xs: 1.6, sm: 1.9 }} alignItems="stretch">
            <LiveHeaderPanelSwitcher
              activePanel={activePanel}
              isMobileMenu={isMobileMenu}
              panelOptions={panelOptions}
              handlePanelChange={handlePanelChange}
              panelContent={panelContent}
              isLiveMoneyPanel={isLiveMoneyPanel}
              isLivePanel={isLivePanel}
            />
          </Stack>
      </Stack>
    </Box>
  );
}
