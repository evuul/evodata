"use client";

// State, derived labels and refresh logic for the live header dashboard.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@/lib/useMuiMediaQuery";
import { useStockPriceContext } from "../context/StockPriceContext";
import { useFxRateContext } from "../context/FxRateContext";
import { usePlayersLive } from "../context/PlayersLiveContext";
import { useAuth } from "../context/AuthContext";
import { useLocale, useTranslate } from "@/context/LocaleContext";
import { useDonationNudge } from "./useDonationNudge";
import { useLiveHeaderNavigation } from "./useLiveHeaderNavigation";
import { useLiveHeaderRemoteData } from "./useLiveHeaderRemoteData";
import { useLiveHeaderShortInterest } from "./useLiveHeaderShortInterest";
import { COLORS as GAME_COLORS } from "@/config/games";
import { buildLiveHeaderPlayerMetrics, buildMaintenanceWarningParts } from "@/lib/liveHeaderPlayers";
import { getStockholmTodayYmd } from "@/lib/livePlayersControlPanel";
import { buildNextCalendarChip } from "@/lib/financialCalendar";
import financialCalendarEvents from "@/app/data/financialCalendar";
import {
  formatLatestWinAmount,
  formatLatestWinTime,
  formatLobbyAthLabel,
  prettifyGameShowName,
} from "@/lib/liveHeader";

const SUPPORT_URL = "https://buymeacoffee.com/evuul";
const SHOW_MY_PAGE_NEW_BADGE = true;
const LOCAL_HOURLY_COMPARE_ENABLED = process.env.NEXT_PUBLIC_LOCAL_HOURLY_COMPARE === "1";

export function useLiveHeaderModel() {
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
  const { rate: fxRate } = useFxRateContext();
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
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const { shortPercent, loadingShort } = useLiveHeaderShortInterest();
  const { showDonationNudge, setShowDonationNudge, handleDismissDonationNudge } = useDonationNudge();
  const {
    activePanel,
    setActivePanel,
    panelValues,
    panelGroups,
    panelOptions,
    handlePanelChange,
    isLiveMoneyPanel,
    isLivePanel,
    mobileCardsRef,
    mobileCardIndex,
    scrollToCard,
  } = useLiveHeaderNavigation({ isMobileMenu, translate });

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

  const fxRateNumber = useMemo(() => {
    const parsed = Number(fxRate);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [fxRate]);
  const {
    latestTopWin,
    loadingLatestTopWin,
    lobbyAth,
    buybackSummary,
  } = useLiveHeaderRemoteData({ fxRateNumber });

  const lobbyAthLabel = useMemo(() => formatLobbyAthLabel(lobbyAth, translate), [lobbyAth, translate]);

  const playerMetrics = useMemo(
    () =>
      buildLiveHeaderPlayerMetrics({
        playerGames,
        liveGames,
        gameColors: GAME_COLORS,
      }),
    [playerGames, liveGames]
  );
  const { top3, playersValue, zeroPlayerGames, stuckLiveGamesCount } = playerMetrics;

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
    const color = delta > 0 ? "#86efac" : delta < 0 ? "#fca5a5" : "rgba(148,163,184,0.72)";
    return { text, color };
  }, [isAdminView, lobbyStats?.hourlyComparison, playersValue, translate]);
  const stockUpdatedLabel = stockLastUpdated ? formatTime(stockLastUpdated) : null;

  const blankningChipLabel = loadingShort
    ? translate("Blankning: hämtar…", "Short interest: loading…")
    : Number.isFinite(shortPercent)
    ? translate(`Blankning: ${shortPercent.toFixed(2)}%`, `Short interest: ${shortPercent.toFixed(2)}%`)
    : translate("Blankning: –", "Short interest: –");

  const blankningChipLabelMobile = loadingShort
    ? translate("Blankning…", "Short interest…")
    : Number.isFinite(shortPercent)
    ? translate(`Blankning ${shortPercent.toFixed(2)}%`, `Short interest ${shortPercent.toFixed(2)}%`)
    : translate("Blankning –", "Short interest –");
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

  const maintenanceWarningLabel = useMemo(() => {
    const parts = buildMaintenanceWarningParts(zeroPlayerGames);
    if (!parts) return null;
    const { shown, moreCount } = parts;
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

  const latestTopWinLabel = useMemo(() => {
    if (loadingLatestTopWin) {
      return translate("Storvinst: hämtar…", "Top win: loading…");
    }
    if (!latestTopWin) {
      return translate("Storvinst: saknas", "Top win: unavailable");
    }
    const amountLabel = formatLatestWinAmount(latestTopWin.totalAmount, locale);
    const timeLabel = formatLatestWinTime(latestTopWin.settledAt, locale);
    const multiplierLabel = Number.isFinite(latestTopWin.multiplier) ? `x${latestTopWin.multiplier}` : null;
    const parts = [prettifyGameShowName(latestTopWin.gameShow), amountLabel, multiplierLabel, timeLabel].filter(Boolean);
    return `${translate("Storvinst", "Top win")}: ${parts.join(" · ")}`;
  }, [latestTopWin, loadingLatestTopWin, translate, locale]);
  const latestTopWinLabelWithEmoji = useMemo(() => {
    if (!latestTopWinLabel) return latestTopWinLabel;
    return `🏆 ${latestTopWinLabel}`;
  }, [latestTopWinLabel]);
  const buybackSummaryDisplay = useMemo(() => {
    if (!buybackSummary) return null;
    return {
      ...buybackSummary,
      mandateLabel: Number.isFinite(buybackSummary.mandateEur)
        ? `${(buybackSummary.mandateEur / 1_000_000).toLocaleString("sv-SE", { maximumFractionDigits: 0 })} M€`
        : "—",
      usedLabel:
        Number.isFinite(buybackSummary.usedSek)
          ? buybackSummary.usedSek >= 1_000_000_000
            ? `${(buybackSummary.usedSek / 1_000_000_000).toLocaleString("sv-SE", { maximumFractionDigits: 1 })} mdkr`
            : `${buybackSummary.usedSek.toLocaleString("sv-SE", { maximumFractionDigits: 0 })} kr`
          : "—",
      remainingLabel:
        Number.isFinite(buybackSummary.remainingSek)
          ? buybackSummary.remainingSek >= 1_000_000_000
            ? `${(buybackSummary.remainingSek / 1_000_000_000).toLocaleString("sv-SE", { maximumFractionDigits: 1 })} mdkr`
            : `${buybackSummary.remainingSek.toLocaleString("sv-SE", { maximumFractionDigits: 0 })} kr`
          : "—",
    };
  }, [buybackSummary]);
  const nextCalendarEventChip = useMemo(() => {
    const chip = buildNextCalendarChip(financialCalendarEvents, getStockholmTodayYmd());
    if (!chip) return null;
    return {
      label: translate(chip.labelSv, chip.labelEn),
      mobileLabel: translate(chip.mobileLabelSv, chip.mobileLabelEn),
      title: translate(chip.titleSv, chip.titleEn),
    };
  }, [translate]);

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

  return {
    isMobileMenu,
    stockPrice,
    marketCap,
    loadingPrice,
    ytdChangePercent,
    daysWithGains,
    daysWithLosses,
    stockLastUpdated,
    liveGames,
    loadingPlayers,
    playerGames,
    playersLastUpdated,
    lobbyStats,
    isAuthenticated,
    user,
    token,
    logout,
    router,
    locale,
    setLocale,
    translate,
    cashView,
    setCashView,
    fmtCap,
    isMarketOpen,
    formatTime,
    shortPercent,
    loadingShort,
    latestTopWin,
    loadingLatestTopWin,
    lobbyAth,
    showDonationNudge,
    setShowDonationNudge,
    handleDismissDonationNudge,
    mobileCardsRef,
    mobileCardIndex,
    scrollToCard,
    userMenuAnchor,
    setUserMenuAnchor,
    playersValue,
    venueChipLabel,
    venueChipLabelMobile,
    marketDotColor,
    priceDisplay,
    changeDisplay,
    changeColor,
    ytdLabel,
    gainsLossLabel,
    donationNudgeText,
    donationNudgeClickLabel,
    playersUpdatedLabel,
    hourlyComparisonMeta,
    stockUpdatedLabel,
    blankningChipLabel,
    blankningChipLabelMobile,
    nextCalendarEventChip,
    marketStatusChip,
    maintenanceWarningLabel,
    playerDataAttentionLabel,
    activePanel,
    setActivePanel,
    PANEL_VALUES: panelValues,
    panelOptions,
    panelGroups,
    handlePanelChange,
    handleLogout,
    userNameLabel,
    isLiveMoneyPanel,
    isLivePanel,
    latestTopWinLabelWithEmoji,
    top3,
    latestTopWinLabel,
    supportUrl: SUPPORT_URL,
    showMyPageNewBadge: SHOW_MY_PAGE_NEW_BADGE,
    stuckLiveGamesCount,
    buybackSummary: buybackSummaryDisplay,
  };
}
