"use client";

import { useEffect, useState } from "react";
import NextLink from "next/link";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import GroupsIcon from "@mui/icons-material/Groups";
import PaidIcon from "@mui/icons-material/Paid";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import PublicIcon from "@mui/icons-material/Public";
import HubIcon from "@mui/icons-material/Hub";
import LeaderboardIcon from "@mui/icons-material/Leaderboard";
import TimelineIcon from "@mui/icons-material/Timeline";
import PersonSearchIcon from "@mui/icons-material/PersonSearch";
import AutoGraphIcon from "@mui/icons-material/AutoGraph";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import SavingsIcon from "@mui/icons-material/Savings";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import EqualizerIcon from "@mui/icons-material/Equalizer";
import RequestQuoteIcon from "@mui/icons-material/RequestQuote";
import DonutLargeIcon from "@mui/icons-material/DonutLarge";
import InsightsIcon from "@mui/icons-material/Insights";
import BarChartIcon from "@mui/icons-material/BarChart";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import { useLocale, useTranslate, LOCALE_OPTIONS } from "@/context/LocaleContext";

const quarterOrder = { Q1: 1, Q2: 2, Q3: 3, Q4: 4 };

const NUMBER_LOCALE_MAP = {
  sv: "sv-SE",
  en: "en-US",
};

const resolveNumberLocale = (locale) => NUMBER_LOCALE_MAP[locale] ?? NUMBER_LOCALE_MAP.sv;

const formatCurrency = (value, locale = NUMBER_LOCALE_MAP.sv) =>
  `${Number(value ?? 0).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} MEUR`;

const formatPercent = (value, locale = NUMBER_LOCALE_MAP.sv) =>
  `${Number(value ?? 0).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

const pickLatestReports = (reports) => {
  if (!Array.isArray(reports) || reports.length === 0) return { latest: null, previous: null };
  const sorted = [...reports].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    const aRank = quarterOrder[a.quarter] ?? 0;
    const bRank = quarterOrder[b.quarter] ?? 0;
    return aRank - bRank;
  });
  const latest = sorted[sorted.length - 1];
  const previous = sorted.length > 1 ? sorted[sorted.length - 2] : null;
  return { latest, previous };
};

const computePlayersPreview = (rows) => {
  if (!Array.isArray(rows) || rows.length === 0) return { latestDay: null, weeklyAvg: null };
  const latestDay = rows[rows.length - 1];
  const window = rows.slice(-7);
  const weeklyAvg =
    window.reduce((acc, item) => (Number.isFinite(item?.Players) ? acc + item.Players : acc), 0) / window.length;
  return { latestDay, weeklyAvg };
};

const pickLatestDividend = (data) => {
  const history = Array.isArray(data?.historicalDividends) ? data.historicalDividends : [];
  if (!history.length) return null;
  return [...history]
    .filter((row) => row?.date)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-1)[0] ?? null;
};

const formatNumberCompact = (value, locale = NUMBER_LOCALE_MAP.sv, options = {}) =>
  Number(value ?? 0).toLocaleString(locale, { notation: "compact", maximumFractionDigits: 1, ...options });

const formatCurrencySek = (value, locale = NUMBER_LOCALE_MAP.sv) =>
  typeof value === "number"
    ? new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "SEK",
        maximumFractionDigits: value >= 1_000_000 ? 0 : 2,
      }).format(value)
    : null;

const SEK_UNIT_LABELS = {
  sv: { billion: "Mdkr", million: "MSEK" },
  en: { billion: "B SEK", million: "M SEK" },
};

const formatSekAbbrev = (value, locale = NUMBER_LOCALE_MAP.sv, language = "sv") => {
  if (!Number.isFinite(value)) return null;
  const labels = SEK_UNIT_LABELS[language] ?? SEK_UNIT_LABELS.sv;
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ${labels.billion}`;
  }
  return `${(value / 1_000_000).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ${labels.million}`;
};

const formatSignedPercent = (value, locale = NUMBER_LOCALE_MAP.sv) => {
  if (!Number.isFinite(value)) return null;
  if (value === 0) return "±0%";
  const abs = Math.abs(value).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return `${value > 0 ? "+" : "-"}${abs}%`;
};

const computeRevenueAth = (reports) => {
  const rows = Array.isArray(reports) ? reports : [];
  return rows.reduce((acc, report) => {
    const value = Number(report?.operatingRevenues);
    if (!Number.isFinite(value)) return acc;
    if (!acc || value > acc.value) {
      return {
        value,
        year: report.year,
        quarter: report.quarter,
        margin: Number(report?.adjustedOperatingMargin) ?? null,
      };
    }
    return acc;
  }, null);
};

const computeLobbyTrend = (rows, windowSize = 7) => {
  if (!Array.isArray(rows) || rows.length < windowSize * 2) return null;
  const sorted = [...rows]
    .map((item) => ({
      date: new Date(item.Datum ?? item.date ?? item.Date ?? Date.now()),
      players: Number(item.Players ?? item.players),
    }))
    .filter((item) => Number.isFinite(item.players) && !Number.isNaN(item.date.valueOf()))
    .sort((a, b) => a.date - b.date);
  if (sorted.length < windowSize * 2) return null;
  const latestWindow = sorted.slice(-windowSize);
  const prevWindow = sorted.slice(-windowSize * 2, -windowSize);
  const latestAvg = latestWindow.reduce((sum, item) => sum + item.players, 0) / latestWindow.length;
  const prevAvg = prevWindow.reduce((sum, item) => sum + item.players, 0) / prevWindow.length;
  const diff = latestAvg - prevAvg;
  const pct = prevAvg !== 0 ? (diff / prevAvg) * 100 : null;
  return { latestAvg, prevAvg, diff, pct };
};

const computeBuybackSummary = (rows, windowDays = 30) => {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const parsed = rows
    .map((item) => {
      const date = new Date(item.Datum ?? item.date ?? Date.now());
      const shares = Number(item.Antal_aktier ?? item.shares);
      const value = Number(item.Transaktionsvärde ?? item.value ?? item.valueSek);
      return { date, shares, value };
    })
    .filter((item) => Number.isFinite(item.shares) && Number.isFinite(item.value) && !Number.isNaN(item.date.valueOf()));
  if (!parsed.length) return null;
  const latestDate = parsed.reduce((latest, item) => (item.date > latest ? item.date : latest), parsed[0].date);
  const cutoff = new Date(latestDate.getTime() - windowDays * 24 * 60 * 60 * 1000);
  let shares = 0;
  let value = 0;
  parsed.forEach((item) => {
    if (item.date >= cutoff) {
      shares += item.shares;
      value += item.value;
    }
  });
  if (shares === 0 && value === 0) return null;
  const avgPrice = shares > 0 ? value / shares : null;
  return { shares, value, avgPrice, latestDate };
};

const computeShareholderReturn = (dividendData, buybackData) => {
  const dividends = Array.isArray(dividendData?.historicalDividends) ? dividendData.historicalDividends : [];
  const totalDividendPerShare = dividends.reduce((sum, entry) => sum + Number(entry?.dividendPerShare ?? 0), 0);
  const buybacks = Array.isArray(buybackData) ? buybackData : [];
  const totalBuybackValue = buybacks.reduce((sum, entry) => sum + Number(entry?.Transaktionsvärde ?? 0), 0);
  if (totalDividendPerShare === 0 && totalBuybackValue === 0) return null;
  return {
    totalDividendPerShare,
    totalBuybackValue,
  };
};

const computeTopGamesPreview = (gameShowsData) => {
  if (!Array.isArray(gameShowsData)) return [];
  const ranked = gameShowsData
    .map((item) => {
      const latest = Array.isArray(item.playerData) ? item.playerData[0] : null;
      const previous = Array.isArray(item.playerData) && item.playerData[1] ? item.playerData[1] : null;
      if (!latest) return null;
      const change = previous && Number.isFinite(previous.players) ? latest.players - previous.players : null;
      return {
        name: item.name,
        latestPlayers: latest.players,
        change,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (b.latestPlayers ?? 0) - (a.latestPlayers ?? 0));
  return ranked.slice(0, 3);
};

const computeShortTrendPreview = (rows, windowSize = 7) => {
  if (!Array.isArray(rows) || rows.length === 0) return { latest: null, delta: null };
  const sorted = [...rows].sort((a, b) => new Date(a.date) - new Date(b.date));
  const latest = sorted[sorted.length - 1] ?? null;
  const window = sorted.slice(-windowSize);
  const base = window[0] ?? sorted[0];
  const delta = latest && base ? latest.percent - base.percent : null;
  return { latest, delta, window };
};

const pickLatestInsiderBuy = (data) => {
  const items = Array.isArray(data?.items) ? data.items : [];
  return items.find((item) => item.direction === "buy") ?? null;
};

const formatPlayers = (value, locale = NUMBER_LOCALE_MAP.sv) => Number(value ?? 0).toLocaleString(locale);

const formatSignedNumber = (value, suffix = "", locale = NUMBER_LOCALE_MAP.sv) => {
  if (!Number.isFinite(value) || value === 0) return value === 0 ? `±0${suffix}` : null;
  const formatted = Math.abs(value).toLocaleString(locale);
  return `${value > 0 ? "+" : "-"}${formatted}${suffix}`;
};

const CARD_TONES = {
  live: {
    cardBg: "linear-gradient(145deg, rgba(4,30,52,0.96), rgba(7,69,64,0.86))",
    border: "1px solid rgba(45,212,191,0.34)",
    iconBg: "linear-gradient(135deg, rgba(45,212,191,0.24), rgba(16,185,129,0.42))",
    iconColor: "#2dd4bf",
    badgeBg: "rgba(45,212,191,0.2)",
    badgeColor: "#99f6e4",
    badgeBorder: "1px solid rgba(45,212,191,0.35)",
  },
  growth: {
    cardBg: "linear-gradient(145deg, rgba(6,22,60,0.95), rgba(16,74,98,0.86))",
    border: "1px solid rgba(56,189,248,0.34)",
    iconBg: "linear-gradient(135deg, rgba(56,189,248,0.24), rgba(14,165,233,0.42))",
    iconColor: "#38bdf8",
    badgeBg: "rgba(56,189,248,0.2)",
    badgeColor: "#bae6fd",
    badgeBorder: "1px solid rgba(56,189,248,0.35)",
  },
  forecast: {
    cardBg: "linear-gradient(145deg, rgba(41,30,7,0.95), rgba(80,52,12,0.86))",
    border: "1px solid rgba(245,158,11,0.34)",
    iconBg: "linear-gradient(135deg, rgba(251,191,36,0.24), rgba(245,158,11,0.42))",
    iconColor: "#fbbf24",
    badgeBg: "rgba(245,158,11,0.2)",
    badgeColor: "#fde68a",
    badgeBorder: "1px solid rgba(251,191,36,0.35)",
  },
  value: {
    cardBg: "linear-gradient(145deg, rgba(26,13,63,0.95), rgba(56,23,98,0.85))",
    border: "1px solid rgba(167,139,250,0.34)",
    iconBg: "linear-gradient(135deg, rgba(167,139,250,0.24), rgba(139,92,246,0.42))",
    iconColor: "#a78bfa",
    badgeBg: "rgba(139,92,246,0.2)",
    badgeColor: "#ddd6fe",
    badgeBorder: "1px solid rgba(167,139,250,0.35)",
  },
  report: {
    cardBg: "linear-gradient(145deg, rgba(52,13,33,0.95), rgba(92,26,63,0.85))",
    border: "1px solid rgba(244,114,182,0.34)",
    iconBg: "linear-gradient(135deg, rgba(244,114,182,0.24), rgba(236,72,153,0.42))",
    iconColor: "#f472b6",
    badgeBg: "rgba(236,72,153,0.2)",
    badgeColor: "#fbcfe8",
    badgeBorder: "1px solid rgba(244,114,182,0.35)",
  },
  base: {
    cardBg: "linear-gradient(145deg, rgba(14,26,47,0.95), rgba(26,43,69,0.9))",
    border: "1px solid rgba(148,163,184,0.26)",
    iconBg: "linear-gradient(135deg, rgba(96,165,250,0.24), rgba(59,130,246,0.4))",
    iconColor: "#93c5fd",
    badgeBg: "rgba(96,165,250,0.2)",
    badgeColor: "#bfdbfe",
    badgeBorder: "1px solid rgba(147,197,253,0.35)",
  },
};

const toneForCardKey = (key) => {
  if (!key) return "base";
  if (key.includes("live") || key.includes("lobby")) return "live";
  if (key.includes("forecast")) return "forecast";
  if (key.includes("fair") || key.includes("value")) return "value";
  if (key.includes("report")) return "report";
  if (key.includes("trend") || key.includes("leader") || key.includes("growth")) return "growth";
  return "base";
};

const StatCard = ({ icon, title, value, subtitle, badge, tone = "base" }) => {
  const palette = CARD_TONES[tone] ?? CARD_TONES.base;
  return (
    <Card
      sx={{
        height: "100%",
        background: palette.cardBg,
        border: palette.border,
        borderRadius: 3,
        boxShadow: "0 12px 35px rgba(0, 0, 0, 0.35)",
        minWidth: { xs: 260, sm: 280, md: 0 },
        scrollSnapAlign: { xs: "center", md: "unset" },
      }}
    >
      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 46,
              height: 46,
              borderRadius: "14px",
              background: palette.iconBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: palette.iconColor,
            }}
          >
            {icon}
          </Box>
          <Typography variant="h6" sx={{ color: "#fff", fontWeight: 600 }}>
            {title}
          </Typography>
        </Box>

        <Box>
          <Typography variant="h3" sx={{ color: "#fff", fontWeight: 700, letterSpacing: 1, mb: 0.5 }}>
            {value}
          </Typography>
          {badge && (
            <Chip
              label={badge}
              size="small"
              sx={{
                backgroundColor: palette.badgeBg,
                color: palette.badgeColor,
                border: palette.badgeBorder,
                fontWeight: 600,
              }}
            />
          )}
          {subtitle && (
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.72)", mt: 1.5, lineHeight: 1.5 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default function LiveLoggedOutPreview({
  financialReports,
  averagePlayersData,
  dividendData,
  gameShowsData,
  shortHistoryData,
  insiderTransactions,
  buybackData,
}) {
  const translate = useTranslate();
  const { locale, setLocale } = useLocale();
  const numberLocale = resolveNumberLocale(locale);
  const dateLocale = locale === "en" ? "en-GB" : "sv-SE";
  const formatDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.valueOf()) ? null : date.toLocaleDateString(dateLocale);
  };
  const { latest, previous } = pickLatestReports(financialReports?.financialReports ?? []);
  const { latestDay, weeklyAvg } = computePlayersPreview(averagePlayersData ?? []);
  const latestDividend = pickLatestDividend(dividendData);

  const ebitdaValue = latest?.adjustedEBITDA ?? null;
  const ebitdaMargin = latest?.adjustedEBITDAMargin ?? null;

  const totalProductRevenue = latest ? Number(latest.liveCasino ?? 0) + Number(latest.rng ?? 0) : 0;
  const liveShare = totalProductRevenue > 0 ? (Number(latest.liveCasino ?? 0) / totalProductRevenue) * 100 : null;
  const rngShare = totalProductRevenue > 0 ? 100 - liveShare : null;

  const regionEntries = latest
    ? [
        { label: translate("Europa", "Europe"), value: Number(latest.europe ?? 0) },
        { label: translate("Asien", "Asia"), value: Number(latest.asia ?? 0) },
        { label: translate("Nordamerika", "North America"), value: Number(latest.northAmerica ?? 0) },
        { label: translate("Latinamerika", "Latin America"), value: Number(latest.latAm ?? 0) },
        { label: translate("Övrigt", "Other"), value: Number(latest.other ?? 0) },
      ].filter((entry) => entry.value > 0)
    : [];
  regionEntries.sort((a, b) => b.value - a.value);
  const topRegion = regionEntries[0] ?? null;

  const regulatedShare = Number.isFinite(latest?.regulatedMarket) ? Number(latest.regulatedMarket) : null;
  const topCustomersShare = Number.isFinite(latest?.Top5Customers) ? Number(latest.Top5Customers) : null;

  const revenueGrowth =
    latest && previous && previous.operatingRevenues
      ? ((latest.operatingRevenues - previous.operatingRevenues) / previous.operatingRevenues) * 100
      : null;

  const dividendYield =
    latestDividend && latestDividend.sharePriceAtDividend
      ? (latestDividend.dividendPerShare / latestDividend.sharePriceAtDividend) * 100
      : null;

  const topGames = computeTopGamesPreview(gameShowsData);
  const shortTrend = computeShortTrendPreview(shortHistoryData);
  const latestInsiderBuy = pickLatestInsiderBuy(insiderTransactions);

  const shortWindowPercents = Array.isArray(shortTrend?.window)
    ? shortTrend.window.map((entry) => entry.percent).filter((value) => Number.isFinite(value))
    : [];
  const shortWindowRange =
    shortTrend && shortWindowPercents.length >= 2
      ? `${Math.min(...shortWindowPercents).toLocaleString(numberLocale, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}–${Math.max(...shortWindowPercents).toLocaleString(numberLocale, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}%`
      : null;
  const latestShortDate = shortTrend?.latest?.date ? formatDate(shortTrend.latest.date) : null;

  const topGameValue = topGames.length ? `#1 ${topGames[0].name}` : "—";
  const topGameBadge =
    topGames.length && topGames[0].change != null
      ? translate(
          `D/d ${formatSignedNumber(topGames[0].change, " spelare", numberLocale)}`,
          `D/d ${formatSignedNumber(topGames[0].change, " players", numberLocale)}`
        )
      : null;
  const topGamesSubtitle = topGames.length
    ? translate(
        topGames
          .map((game, index) => `#${index + 1} ${game.name} (${formatPlayers(game.latestPlayers, numberLocale)} spelare)`)
          .join(" • "),
        topGames
          .map((game, index) => `#${index + 1} ${game.name} (${formatPlayers(game.latestPlayers, numberLocale)} players)`)
          .join(" • ")
      )
    : translate("Live-ranking med realtidsdata per spel.", "Live ranking with real-time data per game.");

  const shortDeltaDisplay =
    shortTrend?.delta != null
      ? `${shortTrend.delta >= 0 ? "+" : ""}${Math.abs(shortTrend.delta).toLocaleString(numberLocale, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      : null;
  const shortBadge =
    shortDeltaDisplay != null
      ? translate(
          `${shortDeltaDisplay} %-enheter senaste ${shortTrend.window?.length ?? 0} dagarna`,
          `${shortDeltaDisplay} pp over the last ${shortTrend.window?.length ?? 0} days`
        )
      : null;
  const shortSubtitle =
    shortTrend?.latest && shortWindowRange
      ? translate(
          `Intervall ${shortWindowRange} under ${shortTrend.window?.length ?? 0} dagar • Senast ${latestShortDate}.`,
          `Range ${shortWindowRange} across ${shortTrend.window?.length ?? 0} days • Latest ${latestShortDate}.`
        )
      : shortTrend?.latest
        ? translate(`Senast rapporterad ${latestShortDate}.`, `Last reported ${latestShortDate}.`)
        : translate("Senaste FI-uppdateringar på blankningsdata.", "Latest FI updates on short data.");

  const insiderVolume =
    latestInsiderBuy?.volumeText ??
    (Number.isFinite(latestInsiderBuy?.volume) ? formatPlayers(latestInsiderBuy.volume, numberLocale) : null);
  const insiderUnit = (latestInsiderBuy?.volumeUnit ?? "st").toLowerCase();
  const insiderDate = latestInsiderBuy?.transactionDate ? formatDate(latestInsiderBuy.transactionDate) : null;
  const insiderValue = formatCurrencySek(latestInsiderBuy?.valueSek, numberLocale);

  const revenueAth = computeRevenueAth(financialReports?.financialReports ?? []);
  const lobbyTrend = computeLobbyTrend(averagePlayersData ?? []);
  const buybackSummary = computeBuybackSummary(buybackData);
  const shareholderReturn = computeShareholderReturn(dividendData, buybackData);

  const revenueAthMargin =
    revenueAth && Number.isFinite(revenueAth.margin) ? formatPercent(revenueAth.margin, numberLocale) : null;

  const playersChangeText = lobbyTrend?.pct != null ? formatSignedPercent(lobbyTrend.pct, numberLocale) : null;

  const lobbyValue = lobbyTrend
    ? translate(
        `${formatPlayers(Math.round(lobbyTrend.latestAvg), numberLocale)} spelare`,
        `${formatPlayers(Math.round(lobbyTrend.latestAvg), numberLocale)} players`
      )
    : null;
  const lobbyBadge = lobbyTrend
    ? translate(
        formatSignedNumber(Math.round(lobbyTrend.diff), " spelare", numberLocale),
        formatSignedNumber(Math.round(lobbyTrend.diff), " players", numberLocale)
      )
    : null;
  const lobbySubtitle = lobbyTrend
    ? translate(
        `Föregående: ${formatPlayers(Math.round(lobbyTrend.prevAvg), numberLocale)} • Förändring ${
          playersChangeText ?? "N/A"
        }.`,
        `Previous: ${formatPlayers(Math.round(lobbyTrend.prevAvg), numberLocale)} • Change ${
          playersChangeText ?? "N/A"
        }.`
      )
    : null;

  const buybackSharesDisplay = buybackSummary
    ? formatNumberCompact(buybackSummary.shares, numberLocale, { maximumFractionDigits: 1 })
    : null;
  const buybackValueDisplay = buybackSummary ? formatSekAbbrev(buybackSummary.value, numberLocale, locale) : null;
  const buybackAvgPriceDisplay =
    buybackSummary && Number.isFinite(buybackSummary.avgPrice)
      ? `${buybackSummary.avgPrice.toLocaleString(numberLocale, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${
          locale === "en" ? "SEK" : "kr"
        }`
      : null;
  const buybackLatestDate = buybackSummary?.latestDate ? formatDate(buybackSummary.latestDate) : null;

  const shareholderValueDisplay = shareholderReturn
    ? formatSekAbbrev(shareholderReturn.totalBuybackValue, numberLocale, locale)
    : null;
  const shareholderDividendValue =
    shareholderReturn && Number.isFinite(shareholderReturn.totalDividendPerShare)
      ? Number(shareholderReturn.totalDividendPerShare).toLocaleString(numberLocale, {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        })
      : null;
  const shareholderDividendCopy =
    shareholderDividendValue != null
      ? {
          sv: `${shareholderDividendValue} kr/aktie`,
          en: `${shareholderDividendValue} SEK/share`,
        }
      : null;

  const eps = Number(latest?.adjustedEarningsPerShare);
  const epsPrev = Number(previous?.adjustedEarningsPerShare);
  const epsChange = Number.isFinite(eps) && Number.isFinite(epsPrev) ? eps - epsPrev : null;

  const marginChange =
    Number.isFinite(latest?.adjustedOperatingMargin) && Number.isFinite(previous?.adjustedOperatingMargin)
      ? latest.adjustedOperatingMargin - previous.adjustedOperatingMargin
      : null;

  const prevLiveShare = previous
    ? (() => {
        const prevTotal = Number(previous.liveCasino ?? 0) + Number(previous.rng ?? 0);
        if (prevTotal <= 0) return null;
        return (Number(previous.liveCasino ?? 0) / prevTotal) * 100;
      })()
    : null;
  const liveShareChange = liveShare != null && prevLiveShare != null ? liveShare - prevLiveShare : null;

  const forecastRevenue =
    lobbyTrend && Number.isFinite(lobbyTrend?.pct) && Number.isFinite(latest?.operatingRevenues)
      ? latest.operatingRevenues * (1 + lobbyTrend.pct / 100)
      : null;

  const lobbyRecord = Array.isArray(averagePlayersData)
    ? averagePlayersData.reduce((best, item) => {
        const players = Number(item?.Players ?? item?.players);
        const dateStr = item?.Datum ?? item?.date ?? null;
        if (!Number.isFinite(players) || !dateStr) return best;
        if (!best || players > best.players) {
          return { players, date: dateStr };
        }
        return best;
      }, null)
    : null;

  const dividendPerShareFormatted =
    latestDividend != null && Number.isFinite(Number(latestDividend.dividendPerShare))
      ? Number(latestDividend.dividendPerShare).toLocaleString(numberLocale, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : null;
  const dividendDateDisplay = latestDividend?.date ? formatDate(latestDividend.date) : null;

  const cards = [];

  const revenueGrowthDisplay =
    revenueGrowth != null
      ? `${revenueGrowth >= 0 ? "+" : ""}${Math.abs(revenueGrowth).toLocaleString(numberLocale, {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        })}`
      : null;

  cards.push({
    key: "revenue",
    icon: <ShowChartIcon />,
    title: translate("Omsättning per kvartal", "Revenue per quarter"),
    value: latest ? formatCurrency(latest.operatingRevenues, numberLocale) : "—",
    subtitle: latest
      ? translate(
          `${latest.quarter} ${latest.year} med ${formatPercent(latest.adjustedOperatingMargin, numberLocale)} rörelsemarginal och full regionfördelning.`,
          `${latest.quarter} ${latest.year} with ${formatPercent(latest.adjustedOperatingMargin, numberLocale)} operating margin and complete regional split.`
        )
      : translate("Kvartalsvis omsättning och marginaler med historik.", "Quarterly revenue and margins with history."),
    badge:
      revenueGrowthDisplay != null
        ? translate(
            `${revenueGrowthDisplay}% vs föregående kvartal`,
            `${revenueGrowthDisplay}% vs prior quarter`
          )
        : null,
  });

  if (Number.isFinite(latest?.adjustedOperatingMargin)) {
    const marginBadgeCopy =
      marginChange != null
        ? {
            sv: formatSignedNumber(Number(marginChange.toFixed(1)), " %-enheter", numberLocale),
            en: formatSignedNumber(Number(marginChange.toFixed(1)), " pp", numberLocale),
          }
        : null;
    cards.push({
      key: "margin-trend",
      icon: <EqualizerIcon />, 
      title: translate("Rörelsemarginal", "Operating margin"),
      value: formatPercent(latest.adjustedOperatingMargin, numberLocale),
      subtitle: marginBadgeCopy
        ? translate(
            `Förändring ${marginBadgeCopy.sv} mot föregående kvartal.`,
            `Change ${marginBadgeCopy.en} vs previous quarter.`
          )
        : translate("Håller koll på marginaltrenden kvartalsvis.", "Track margin trend quarter by quarter."),
      badge: marginBadgeCopy ? (locale === "en" ? marginBadgeCopy.en : marginBadgeCopy.sv) : null,
    });
  }

  if (revenueAth) {
    cards.push({
      key: "revenue-ath",
      icon: <EmojiEventsIcon />,
      title: translate("All time high", "All-time high"),
      value: formatCurrency(revenueAth.value, numberLocale),
      subtitle: translate(
        `${revenueAth.quarter} ${revenueAth.year}${revenueAthMargin ? ` • Rörelsemarginal ${revenueAthMargin}` : ""}.`,
        `${revenueAth.quarter} ${revenueAth.year}${revenueAthMargin ? ` • Operating margin ${revenueAthMargin}` : ""}.`
      ),
      badge: translate("Historisk topp", "Historic peak"),
    });
  }

  if (lobbyTrend) {
    cards.push({
      key: "lobby-trend",
      icon: <AutoGraphIcon />,
      title: translate("Lobbytrend (7d)", "Lobby trend (7d)"),
      value: lobbyValue ?? "—",
      subtitle:
        lobbySubtitle ?? translate("Trend jämfört med föregående 7 dagar.", "Trend vs previous 7 days."),
      badge: lobbyBadge,
    });
  }

  if (forecastRevenue != null) {
    cards.push({
      key: "forecast",
      icon: <InsightsIcon />,
      title: translate("Intelligence-prognos", "Intelligence forecast"),
      value: formatCurrency(forecastRevenue, numberLocale),
      subtitle: playersChangeText
        ? translate(`Lobbytrenden ${playersChangeText} mot föregående 7 dagar.`, `Lobby trend ${playersChangeText} vs previous 7 days.`)
        : translate("Prognos baserad på senaste lobbytrenden.", "Forecast based on latest lobby trend."),
      badge: translate("Prognos", "Forecast"),
    });
  }

  cards.push({
    key: "live-players",
    icon: <GroupsIcon />,
    title: translate("Live-spelare", "Live players"),
    value: latestDay ? `${formatPlayers(latestDay.Players, numberLocale)}` : "—",
    subtitle: weeklyAvg
      ? translate(
          `Snitt senaste veckan: ${Math.round(weeklyAvg).toLocaleString(numberLocale)} samtidiga spelare över Evolution Live.`,
          `Weekly average: ${Math.round(weeklyAvg).toLocaleString(numberLocale)} concurrent players across Evolution Live.`
        )
      : translate("Följ daglig live-trafik per spel i realtid.", "Track daily live traffic per game in real time."),
    badge: latestDay
      ? translate(`Senaste uppdatering ${formatDate(latestDay.Datum)}`, `Updated ${formatDate(latestDay.Datum)}`)
      : null,
  });

  if (topGames.length) {
    cards.push({
      key: "leaderboard",
      icon: <LeaderboardIcon />,
      title: translate("Ranking av spel", "Game leaderboard"),
      value: topGameValue,
      subtitle: topGamesSubtitle,
      badge: topGameBadge,
    });
  }

  if (lobbyRecord) {
    const recordDate = formatDate(lobbyRecord.date);
    cards.push({
      key: "lobby-peak",
      icon: <BarChartIcon />,
      title: translate("Lobbytoppen", "Lobby peak"),
      value: translate(
        `${formatPlayers(lobbyRecord.players, numberLocale)} spelare`,
        `${formatPlayers(lobbyRecord.players, numberLocale)} players`
      ),
      subtitle: translate(`Rekordnotering ${recordDate}.`, `Record on ${recordDate}.`),
      badge: translate("All time high", "All-time high"),
    });
  }

  cards.push({
    key: "dividends",
    icon: <PaidIcon />,
    title: translate("Utdelningar", "Dividends"),
    value:
      dividendPerShareFormatted != null
        ? translate(`${dividendPerShareFormatted} kr`, `${dividendPerShareFormatted} SEK`)
        : "—",
    subtitle:
      latestDividend != null
        ? translate(
            `Totalt ${dividendPerShareFormatted ?? "—"} kr per aktie inför bolagsstämman ${
              dividendDateDisplay ?? "—"
            }.${dividendYield != null ? ` Direktavkastning vid utbetalning: ${formatPercent(dividendYield, numberLocale)}.` : ""}`,
            `Total ${dividendPerShareFormatted ?? "—"} SEK per share ahead of the AGM ${
              dividendDateDisplay ?? "—"
            }.${dividendYield != null ? ` Yield at payout: ${formatPercent(dividendYield, numberLocale)}.` : ""}`
          )
        : translate(
            "Full historik över utdelningar, återköp och direktavkastning.",
            "Full history of dividends, buybacks, and yields."
          ),
    badge: translate("Historiska och planerade utdelningar", "Historical and planned dividends"),
  });

  if (shareholderReturn) {
    cards.push({
      key: "shareholder-return",
      icon: <SavingsIcon />,
      title: translate("Återfört kapital", "Capital returned"),
      value: shareholderValueDisplay ?? "—",
      subtitle: translate(
        `Återköp totalt: ${shareholderValueDisplay ?? "—"}${
          shareholderDividendCopy ? ` • Utdelningar ${shareholderDividendCopy.sv}` : ""
        }`,
        `Buybacks total: ${shareholderValueDisplay ?? "—"}${
          shareholderDividendCopy ? ` • Dividends ${shareholderDividendCopy.en}` : ""
        }`
      ),
      badge:
        shareholderDividendCopy != null
          ? locale === "en"
            ? shareholderDividendCopy.en
            : shareholderDividendCopy.sv
          : translate("Utdelning + återköp", "Dividend + buybacks"),
    });
  }

  if (buybackSummary) {
    cards.push({
      key: "buybacks",
      icon: <Inventory2Icon />,
      title: translate("Återköp (30 dagar)", "Buybacks (30 days)"),
      value: buybackSharesDisplay
        ? translate(`${buybackSharesDisplay} aktier`, `${buybackSharesDisplay} shares`)
        : "—",
      subtitle: translate(
        `${buybackValueDisplay ?? "—"} senaste 30 dagarna${buybackAvgPriceDisplay ? ` • Snitt ${buybackAvgPriceDisplay}` : ""}.`,
        `${buybackValueDisplay ?? "—"} over the last 30 days${buybackAvgPriceDisplay ? ` • Avg ${buybackAvgPriceDisplay}` : ""}.`
      ),
      badge: buybackLatestDate
        ? translate(`Senast ${buybackLatestDate}`, `Latest ${buybackLatestDate}`)
        : null,
    });
  }

  cards.push({
    key: "ebitda",
    icon: <TrendingUpIcon />,
    title: translate("EBITDA & marginal", "EBITDA & margin"),
    value: ebitdaValue != null ? formatCurrency(ebitdaValue, numberLocale) : "—",
    subtitle:
      ebitdaValue != null
        ? translate(
            `${latest?.quarter ?? ""} ${latest?.year ?? ""} med operativ hävstång spårad tillbaka till 2015.`,
            `${latest?.quarter ?? ""} ${latest?.year ?? ""} with operational leverage tracked back to 2015.`
          )
        : translate("Detaljerad EBITDA-historik och marginalspårning.", "Detailed EBITDA history and margin tracking."),
    badge:
      ebitdaMargin != null
        ? translate(
            `EBITDA-marginal ${formatPercent(ebitdaMargin, numberLocale)}`,
            `EBITDA margin ${formatPercent(ebitdaMargin, numberLocale)}`
          )
        : null,
  });

  if (Number.isFinite(eps)) {
    const epsDisplay = Number(eps).toLocaleString(numberLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const epsPrevDisplay = Number.isFinite(epsPrev)
      ? Number(epsPrev).toLocaleString(numberLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : null;
    const epsChangeDisplay =
      epsChange != null
        ? `${epsChange >= 0 ? "+" : "-"}${Math.abs(epsChange).toLocaleString(numberLocale, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`
        : null;
    cards.push({
      key: "eps",
      icon: <RequestQuoteIcon />,
      title: translate("Justerad EPS", "Adjusted EPS"),
      value: translate(`${epsDisplay} kr`, `${epsDisplay} SEK`),
      subtitle: epsPrevDisplay
        ? translate(`Föregående kvartal ${epsPrevDisplay} kr per aktie.`, `Previous quarter ${epsPrevDisplay} SEK per share.`)
        : translate("Justerat resultat per aktie senaste kvartalet.", "Adjusted earnings per share last quarter."),
      badge: epsChangeDisplay ? translate(`${epsChangeDisplay} kr`, `${epsChangeDisplay} SEK`) : null,
    });
  }

  cards.push({
    key: "region",
    icon: <PublicIcon />,
    title: translate("Största region", "Largest region"),
    value: topRegion
      ? `${topRegion.label} • ${formatCurrency(topRegion.value, numberLocale)}`
      : "—",
    subtitle: topRegion
      ? translate(
          `Reglerade marknader står för ${regulatedShare != null ? formatPercent(regulatedShare, numberLocale) : "—"} av intäkterna samma kvartal.`,
          `Regulated markets account for ${regulatedShare != null ? formatPercent(regulatedShare, numberLocale) : "—"} of revenue this quarter.`
        )
      : translate("Region- och marknadsmix uppdateras varje kvartal.", "Regional mix updates every quarter."),
    badge:
      topCustomersShare != null
        ? translate(
            `Top 5 kunder: ${formatPercent(topCustomersShare, numberLocale)}`,
            `Top 5 customers: ${formatPercent(topCustomersShare, numberLocale)}`
          )
        : null,
  });

  cards.push({
    key: "product-mix",
    icon: <HubIcon />,
    title: translate("Produktmix", "Product mix"),
    value: liveShare != null ? `${formatPercent(liveShare, numberLocale)} Live` : "—",
    subtitle:
      liveShare != null
        ? translate(
            `RNG står för ${formatPercent(rngShare ?? 0, numberLocale)} av intäkterna samma kvartal – följ utvecklingen spel för spel.`,
            `RNG accounts for ${formatPercent(rngShare ?? 0, numberLocale)} of revenue this quarter – track it game by game.`
          )
        : translate("Fördjupa dig i hur Live Casino och RNG utvecklas över tid.", "Dive into how Live Casino and RNG evolve over time."),
    badge: translate("Daglig uppdatering per spelkategori", "Daily update per category"),
  });

  if (liveShare != null) {
    const liveBadgeCopy =
      liveShareChange != null
        ? {
            sv: formatSignedNumber(Number(liveShareChange.toFixed(1)), " %-enheter", numberLocale),
            en: formatSignedNumber(Number(liveShareChange.toFixed(1)), " pp", numberLocale),
          }
        : null;
    cards.push({
      key: "live-share-change",
      icon: <DonutLargeIcon />,
      title: translate("Live vs RNG Δ", "Live vs RNG Δ"),
      value: `${formatPercent(liveShare, numberLocale)}`,
      subtitle: translate(
        `RNG ${formatPercent(rngShare ?? 0, numberLocale)} denna period${
          prevLiveShare != null ? ` • Föregående live ${formatPercent(prevLiveShare, numberLocale)}` : ""
        }.`,
        `RNG ${formatPercent(rngShare ?? 0, numberLocale)} this period${
          prevLiveShare != null ? ` • Previous live ${formatPercent(prevLiveShare, numberLocale)}` : ""
        }.`
      ),
      badge: liveBadgeCopy ? (locale === "en" ? liveBadgeCopy.en : liveBadgeCopy.sv) : null,
    });
  }

  if (shortTrend?.latest) {
    cards.push({
      key: "short-interest",
      icon: <TimelineIcon />,
      title: translate("Blankning (FI)", "Short interest (FI)"),
      value: `${Number(shortTrend.latest.percent).toLocaleString(numberLocale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}%`,
      subtitle: shortSubtitle,
      badge: shortBadge,
    });
  }

  if (latestInsiderBuy) {
    cards.push({
      key: "insider",
      icon: <PersonSearchIcon />, 
      title: translate("Senaste insiderköp", "Latest insider buy"),
      value: insiderVolume
        ? translate(`+${insiderVolume} ${insiderUnit}`, `+${insiderVolume} ${insiderUnit}`)
        : translate(latestInsiderBuy.type ?? "Förvärv", latestInsiderBuy.type ?? "Acquisition"),
      subtitle: translate(
        `${latestInsiderBuy.person ?? "Ledningsperson"}${insiderDate ? ` • ${insiderDate}` : ""}${
          latestInsiderBuy.position ? ` (${latestInsiderBuy.position})` : ""
        }${insiderValue ? ` • ${insiderValue}` : ""}`,
        `${latestInsiderBuy.person ?? "Executive"}${insiderDate ? ` • ${insiderDate}` : ""}${
          latestInsiderBuy.position ? ` (${latestInsiderBuy.position})` : ""
        }${insiderValue ? ` • ${insiderValue}` : ""}`
      ),
      badge: translate(
        latestInsiderBuy.instrumentName ?? latestInsiderBuy.type ?? "Insynsaffär",
        latestInsiderBuy.instrumentName ?? latestInsiderBuy.type ?? "Insider trade"
      ),
    });
  }

  const theme = useTheme();
  const isSmUp = useMediaQuery(theme.breakpoints.up("sm"));
  const isMdUp = useMediaQuery(theme.breakpoints.up("md"));
  const columns = isMdUp ? 3 : isSmUp ? 2 : 1;
  const rows = 2;
  const cardsPerPage = Math.max(1, columns * rows);


  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(cards.length / cardsPerPage));

  useEffect(() => {
    setPage(0);
  }, [cardsPerPage]);

  useEffect(() => {
    setPage((prev) => Math.min(prev, totalPages - 1));
  }, [totalPages]);

  const startIndex = page * cardsPerPage;
  const visibleCards = cards.slice(startIndex, startIndex + cardsPerPage);

  const handlePrev = () => {
    setPage((prev) => Math.max(prev - 1, 0));
  };

  const handleNext = () => {
    setPage((prev) => Math.min(prev + 1, totalPages - 1));
  };

  return (
    <Box
      sx={{
        mt: { xs: 2, sm: 3 },
        width: "100%",
        maxWidth: "1100px",
        px: { xs: 2, sm: 0 },
        mx: "auto",
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: { xs: "center", sm: "flex-end" },
          mb: { xs: 2, sm: 3 },
        }}
      >
        <ToggleButtonGroup
          exclusive
          size="small"
          value={locale}
          onChange={(_, value) => value && setLocale(value)}
          sx={{
            backgroundColor: "rgba(15,23,42,0.45)",
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
      </Box>

      <Box sx={{ textAlign: "center", mb: { xs: 3, sm: 4 } }}>
        <Typography
          variant="overline"
          sx={{
            color: "#82c1ff",
            letterSpacing: 2,
            fontSize: { xs: "0.95rem", sm: "1.05rem" },
            fontWeight: 700,
            textTransform: "uppercase",
          }}
        >
          {translate("Evolution tracker", "Evolution tracker")}
        </Typography>
        <Typography
          variant="h4"
          sx={{
            color: "#fff",
            fontWeight: 700,
            mt: 1,
            textTransform: "uppercase",
            letterSpacing: 0.8,
          }}
        >
          {translate("Följ live-spelare, trend och forecast i realtid", "Track live players, trend, and forecast in real time")}
        </Typography>
        <Typography
          variant="body1"
          sx={{
            color: "rgba(255,255,255,0.72)",
            maxWidth: 640,
            margin: "12px auto 0",
            lineHeight: 1.6,
          }}
        >
          {translate(
            "Få detaljerade grafer, realtidsstatistik över spelare och djupgående utdelningshistorik för Evolution. Allt samlat på ett ställe, uppdaterat varje dag.",
            "Get detailed charts, real-time player stats, and deep dividend history for Evolution — all in one place, updated daily."
          )}
        </Typography>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{ mt: { xs: 2.5, sm: 3 }, justifyContent: "center", alignItems: "center" }}
        >
          <Button
            component={NextLink}
            href="/login"
            size="large"
            variant="contained"
            sx={{
              minWidth: 180,
              fontWeight: 600,
              textTransform: "none",
              background: "linear-gradient(135deg, #38bdf8, #0ea5e9)",
              boxShadow: "0px 16px 35px rgba(14,165,233,0.25)",
            }}
          >
            {translate("Logga in", "Log in")}
          </Button>
          <Button
            component={NextLink}
            href="/register"
            size="large"
            variant="outlined"
            sx={{
              minWidth: 180,
              fontWeight: 600,
              textTransform: "none",
              borderWidth: 2,
              borderColor: "rgba(148,163,184,0.6)",
              color: "#e2e8f0",
              "&:hover": {
                borderColor: "rgba(148,163,184,0.85)",
                backgroundColor: "rgba(148,163,184,0.08)",
              },
            }}
          >
            {translate("Skapa konto", "Create account")}
          </Button>
        </Stack>
      </Box>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: { xs: 1, sm: 2 },
        }}
      >
        <IconButton
          size="small"
          onClick={handlePrev}
          disabled={page === 0}
          aria-label={translate("Visa föregående smakprov", "Show previous preview")}
          sx={{
            backgroundColor: "rgba(255,255,255,0.08)",
            color: "#ffffff",
            "&:hover": { backgroundColor: "rgba(255,255,255,0.16)" },
            visibility: totalPages > 1 ? "visible" : "hidden",
          }}
        >
          <ArrowBackIosNewIcon fontSize="small" />
        </IconButton>

        <Box sx={{ flex: 1 }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "repeat(1, minmax(0, 1fr))",
                sm: "repeat(2, minmax(0, 1fr))",
                md: "repeat(3, minmax(0, 1fr))",
              },
              gap: { xs: 2, sm: 2.5, md: 3 },
            }}
          >
            {visibleCards.map((card) => (
              <StatCard key={card.key} {...card} tone={toneForCardKey(card.key)} />
            ))}
          </Box>
        </Box>

        <IconButton
          size="small"
          onClick={handleNext}
          disabled={page >= totalPages - 1}
          aria-label={translate("Visa fler smakprov", "Show more previews")}
          sx={{
            backgroundColor: "rgba(255,255,255,0.08)",
            color: "#ffffff",
            "&:hover": { backgroundColor: "rgba(255,255,255,0.16)" },
            visibility: totalPages > 1 ? "visible" : "hidden",
          }}
        >
          <ArrowForwardIosIcon fontSize="small" />
        </IconButton>
      </Box>

    </Box>
  );
}
