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

const quarterOrder = { Q1: 1, Q2: 2, Q3: 3, Q4: 4 };

const formatCurrency = (value) =>
  `${Number(value ?? 0).toLocaleString("sv-SE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} MEUR`;

const formatPercent = (value) =>
  `${Number(value ?? 0).toLocaleString("sv-SE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

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
  return history[history.length - 1];
};

const formatNumberCompact = (value, options = {}) =>
  Number(value ?? 0).toLocaleString("sv-SE", { notation: "compact", maximumFractionDigits: 1, ...options });

const formatCurrencySek = (value) =>
  typeof value === "number"
    ? new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: value >= 1_000_000 ? 0 : 2 }).format(value)
    : null;

const formatSekAbbrev = (value) => {
  if (!Number.isFinite(value)) return null;
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toLocaleString("sv-SE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Mdkr`;
  }
  return `${(value / 1_000_000).toLocaleString("sv-SE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} MSEK`;
};

const formatSignedPercent = (value) => {
  if (!Number.isFinite(value)) return null;
  if (value === 0) return "±0%";
  const abs = Math.abs(value).toLocaleString("sv-SE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
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

const formatPlayers = (value) => Number(value ?? 0).toLocaleString("sv-SE");

const formatSignedNumber = (value, suffix = "") => {
  if (!Number.isFinite(value) || value === 0) return value === 0 ? `±0${suffix}` : null;
  const formatted = Math.abs(value).toLocaleString("sv-SE");
  return `${value > 0 ? "+" : "-"}${formatted}${suffix}`;
};

const StatCard = ({ icon, title, value, subtitle, badge }) => (
  <Card
    sx={{
      height: "100%",
      background: "linear-gradient(145deg, rgba(30,30,30,0.95), rgba(50,50,50,0.9))",
      border: "1px solid rgba(255,255,255,0.08)",
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
            background: "linear-gradient(135deg, rgba(74,144,226,0.25), rgba(0,119,255,0.4))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#4a90e2",
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
              backgroundColor: "rgba(74,144,226,0.2)",
              color: "#82c1ff",
              border: "1px solid rgba(130,193,255,0.3)",
              fontWeight: 600,
            }}
          />
        )}
        {subtitle && (
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)", mt: 1.5, lineHeight: 1.5 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
    </CardContent>
  </Card>
);

export default function LiveLoggedOutPreview({
  financialReports,
  averagePlayersData,
  dividendData,
  gameShowsData,
  shortHistoryData,
  insiderTransactions,
  buybackData,
}) {
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
        { label: "Europa", value: Number(latest.europe ?? 0) },
        { label: "Asien", value: Number(latest.asia ?? 0) },
        { label: "Nordamerika", value: Number(latest.northAmerica ?? 0) },
        { label: "Latinamerika", value: Number(latest.latAm ?? 0) },
        { label: "Övrigt", value: Number(latest.other ?? 0) },
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
      ? `${Math.min(...shortWindowPercents).toFixed(2)}–${Math.max(...shortWindowPercents).toFixed(2)}%`
      : null;
  const latestShortDate = shortTrend?.latest?.date
    ? new Date(shortTrend.latest.date).toLocaleDateString("sv-SE")
    : null;

  const topGameValue = topGames.length ? `#1 ${topGames[0].name}` : "—";
  const topGameBadge =
    topGames.length && topGames[0].change != null ? `D/d ${formatSignedNumber(topGames[0].change, " spelare")}` : null;
  const topGamesSubtitle = topGames.length
    ? topGames
        .map((game, index) => `#${index + 1} ${game.name} (${formatPlayers(game.latestPlayers)} spelare)`)
        .join(" • ")
    : "Live-ranking med realtidsdata per spel.";

  const shortBadge =
    shortTrend?.delta != null
      ? `${shortTrend.delta >= 0 ? "+" : ""}${shortTrend.delta.toFixed(2)} %-enheter senaste ${shortTrend.window?.length ?? 0} dagarna`
      : null;
  const shortSubtitle =
    shortTrend?.latest && shortWindowRange
      ? `Intervall ${shortWindowRange} under ${shortTrend.window?.length ?? 0} dagar • Senast ${latestShortDate}.`
      : shortTrend?.latest
        ? `Senast rapporterad ${latestShortDate}.`
        : "Senaste FI-uppdateringar på blankningsdata.";

  const insiderVolume =
    latestInsiderBuy?.volumeText ??
    (Number.isFinite(latestInsiderBuy?.volume) ? formatPlayers(latestInsiderBuy.volume) : null);
  const insiderUnit = (latestInsiderBuy?.volumeUnit ?? "st").toLowerCase();
  const insiderDate = latestInsiderBuy?.transactionDate
    ? new Date(latestInsiderBuy.transactionDate).toLocaleDateString("sv-SE")
    : null;
  const insiderValue = formatCurrencySek(latestInsiderBuy?.valueSek);

  const revenueAth = computeRevenueAth(financialReports?.financialReports ?? []);
  const lobbyTrend = computeLobbyTrend(averagePlayersData ?? []);
  const buybackSummary = computeBuybackSummary(buybackData);
  const shareholderReturn = computeShareholderReturn(dividendData, buybackData);

  const revenueAthMargin =
    revenueAth && Number.isFinite(revenueAth.margin) ? formatPercent(revenueAth.margin) : null;

  const lobbyValue = lobbyTrend ? `${formatPlayers(Math.round(lobbyTrend.latestAvg))} spelare` : null;
  const lobbyBadge = lobbyTrend ? formatSignedNumber(Math.round(lobbyTrend.diff), " spelare") : null;
  const lobbySubtitle = lobbyTrend
    ? `Föregående: ${formatPlayers(Math.round(lobbyTrend.prevAvg))} • Förändring ${
        lobbyTrend.pct != null ? `${lobbyTrend.pct >= 0 ? "+" : ""}${lobbyTrend.pct.toFixed(1)}%` : "N/A"
      }.`
    : null;

  const buybackSharesDisplay = buybackSummary
    ? formatNumberCompact(buybackSummary.shares, { maximumFractionDigits: 1 })
    : null;
  const buybackValueDisplay = buybackSummary ? formatSekAbbrev(buybackSummary.value) : null;
  const buybackAvgPriceDisplay =
    buybackSummary && Number.isFinite(buybackSummary.avgPrice)
      ? `${buybackSummary.avgPrice.toLocaleString("sv-SE", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} SEK`
      : null;
  const buybackLatestDate = buybackSummary?.latestDate ? buybackSummary.latestDate.toLocaleDateString("sv-SE") : null;

  const shareholderValueDisplay = shareholderReturn ? formatSekAbbrev(shareholderReturn.totalBuybackValue) : null;
  const shareholderDividendDisplay =
    shareholderReturn && Number.isFinite(shareholderReturn.totalDividendPerShare)
      ? `${shareholderReturn.totalDividendPerShare.toFixed(1)} kr/aktie`
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

  const playersChangeText = lobbyTrend?.pct != null ? formatSignedPercent(lobbyTrend.pct) : null;
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

  const cards = [];

  cards.push({
    key: "revenue",
    icon: <ShowChartIcon />,
    title: "Omsättning per kvartal",
    value: latest ? formatCurrency(latest.operatingRevenues) : "—",
    subtitle: latest
      ? `${latest.quarter} ${latest.year} med ${formatPercent(latest.adjustedOperatingMargin)} rörelsemarginal och full regionfördelning.`
      : "Kvartalsvis omsättning och marginaler med historik.",
    badge: revenueGrowth != null ? `${revenueGrowth >= 0 ? "+" : ""}${revenueGrowth.toFixed(1)}% vs föregående kvartal` : null,
  });

  if (Number.isFinite(latest?.adjustedOperatingMargin)) {
    const marginBadge =
      marginChange != null ? formatSignedNumber(Number(marginChange.toFixed(1)), " %-enheter") : null;
    cards.push({
      key: "margin-trend",
      icon: <EqualizerIcon />,
      title: "Rörelsemarginal",
      value: formatPercent(latest.adjustedOperatingMargin),
      subtitle: marginBadge ? `Förändring ${marginBadge} mot föregående kvartal.` : "Håller koll på marginaltrenden kvartalsvis.",
      badge: marginBadge,
    });
  }

  if (revenueAth) {
    cards.push({
      key: "revenue-ath",
      icon: <EmojiEventsIcon />,
      title: "All time high",
      value: formatCurrency(revenueAth.value),
      subtitle: `${revenueAth.quarter} ${revenueAth.year}${revenueAthMargin ? ` • Rörelsemarginal ${revenueAthMargin}` : ""}.`,
      badge: "Historisk topp",
    });
  }

  if (lobbyTrend) {
    cards.push({
      key: "lobby-trend",
      icon: <AutoGraphIcon />,
      title: "Lobbytrend (7d)",
      value: lobbyValue ?? "—",
      subtitle: lobbySubtitle ?? "Trend jämfört med föregående 7 dagar.",
      badge: lobbyBadge,
    });
  }

  if (forecastRevenue != null) {
    cards.push({
      key: "forecast",
      icon: <InsightsIcon />,
      title: "Intelligence-prognos",
      value: formatCurrency(forecastRevenue),
      subtitle: playersChangeText
        ? `Lobbytrenden ${playersChangeText} mot föregående 7 dagar.`
        : "Prognos baserad på senaste lobbytrenden.",
      badge: "Prognos",
    });
  }

  cards.push({
    key: "live-players",
    icon: <GroupsIcon />,
    title: "Live-spelare",
    value: latestDay ? `${formatPlayers(latestDay.Players)}` : "—",
    subtitle: weeklyAvg
      ? `Snitt senaste veckan: ${Math.round(weeklyAvg).toLocaleString("sv-SE")} samtidiga spelare över Evolution Live.`
      : "Följ daglig live-trafik per spel i realtid.",
    badge: latestDay ? `Senaste uppdatering ${new Date(latestDay.Datum).toLocaleDateString("sv-SE")}` : null,
  });

  if (topGames.length) {
    cards.push({
      key: "leaderboard",
      icon: <LeaderboardIcon />,
      title: "Ranking av spel",
      value: topGameValue,
      subtitle: topGamesSubtitle,
      badge: topGameBadge,
    });
  }

  if (lobbyRecord) {
    const recordDate = new Date(lobbyRecord.date).toLocaleDateString("sv-SE");
    cards.push({
      key: "lobby-peak",
      icon: <BarChartIcon />,
      title: "Lobbytoppen",
      value: `${formatPlayers(lobbyRecord.players)} spelare`,
      subtitle: `Rekordnotering ${recordDate}.`,
      badge: "All time high",
    });
  }

  cards.push({
    key: "dividends",
    icon: <PaidIcon />,
    title: "Utdelningar",
    value:
      latestDividend != null
        ? `${latestDividend.dividendPerShare.toLocaleString("sv-SE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })} kr`
        : "—",
    subtitle:
      latestDividend != null
        ? `Totalt ${latestDividend.dividendPerShare.toLocaleString("sv-SE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })} kr per aktie inför bolagsstämman ${new Date(latestDividend.date).toLocaleDateString("sv-SE")}.${dividendYield != null ? ` Direktavkastning vid utbetalning: ${formatPercent(dividendYield)}.` : ""}`
        : "Full historik över utdelningar, återköp och direktavkastning.",
    badge: "Historiska och planerade utdelningar",
  });

  if (shareholderReturn) {
    cards.push({
      key: "shareholder-return",
      icon: <SavingsIcon />,
      title: "Återfört kapital",
      value: shareholderValueDisplay ?? "—",
      subtitle: `Återköp totalt: ${shareholderValueDisplay ?? "—"}${shareholderDividendDisplay ? ` • Utdelningar ${shareholderDividendDisplay}` : ""}`,
      badge: shareholderDividendDisplay ?? "Utdelning + återköp",
    });
  }

  if (buybackSummary) {
    cards.push({
      key: "buybacks",
      icon: <Inventory2Icon />,
      title: "Återköp (30 dagar)",
      value: buybackSharesDisplay ? `${buybackSharesDisplay} aktier` : "—",
      subtitle: `${buybackValueDisplay ?? "—"} senaste 30 dagarna${buybackAvgPriceDisplay ? ` • Snitt ${buybackAvgPriceDisplay}` : ""}.`,
      badge: buybackLatestDate ? `Senast ${buybackLatestDate}` : null,
    });
  }

  cards.push({
    key: "ebitda",
    icon: <TrendingUpIcon />,
    title: "EBITDA & marginal",
    value: ebitdaValue != null ? formatCurrency(ebitdaValue) : "—",
    subtitle:
      ebitdaValue != null
        ? `${latest?.quarter ?? ""} ${latest?.year ?? ""} med operativ hävstång spårad tillbaka till 2015.`
        : "Detaljerad EBITDA-historik och marginalspårning.",
    badge: ebitdaMargin != null ? `EBITDA-marginal ${formatPercent(ebitdaMargin)}` : null,
  });

  if (Number.isFinite(eps)) {
    cards.push({
      key: "eps",
      icon: <RequestQuoteIcon />,
      title: "Justerad EPS",
      value: `${eps.toFixed(2)} kr`,
      subtitle: Number.isFinite(epsPrev)
        ? `Föregående kvartal ${epsPrev.toFixed(2)} kr per aktie.`
        : "Justerat resultat per aktie senaste kvartalet.",
      badge: epsChange != null ? `${epsChange >= 0 ? "+" : "-"}${Math.abs(epsChange).toFixed(2)} kr` : null,
    });
  }

  cards.push({
    key: "region",
    icon: <PublicIcon />,
    title: "Största region",
    value: topRegion ? `${topRegion.label} • ${formatCurrency(topRegion.value)}` : "—",
    subtitle: topRegion
      ? `Reglerade marknader står för ${regulatedShare != null ? formatPercent(regulatedShare) : "—"} av intäkterna samma kvartal.`
      : "Region- och marknadsmix uppdateras varje kvartal.",
    badge: topCustomersShare != null ? `Top 5 kunder: ${formatPercent(topCustomersShare)}` : null,
  });

  cards.push({
    key: "product-mix",
    icon: <HubIcon />,
    title: "Produktmix",
    value: liveShare != null ? `${formatPercent(liveShare)} Live` : "—",
    subtitle:
      liveShare != null
        ? `RNG står för ${formatPercent(rngShare ?? 0)} av intäkterna samma kvartal – följ utvecklingen spel för spel.`
        : "Fördjupa dig i hur Live Casino och RNG utvecklas över tid.",
    badge: "Daglig uppdatering per spelkategori",
  });

  if (liveShare != null) {
    const liveBadge =
      liveShareChange != null ? formatSignedNumber(Number(liveShareChange.toFixed(1)), " %-enheter") : null;
    cards.push({
      key: "live-share-change",
      icon: <DonutLargeIcon />,
      title: "Live vs RNG Δ",
      value: `${formatPercent(liveShare)}`,
      subtitle: `RNG ${formatPercent(rngShare ?? 0)} denna period${prevLiveShare != null ? ` • Föregående live ${formatPercent(prevLiveShare)}` : ""}.`,
      badge: liveBadge,
    });
  }

  if (shortTrend?.latest) {
    cards.push({
      key: "short-interest",
      icon: <TimelineIcon />,
      title: "Blankning (FI)",
      value: `${shortTrend.latest.percent.toFixed(2)}%`,
      subtitle: shortSubtitle,
      badge: shortBadge,
    });
  }

  if (latestInsiderBuy) {
    cards.push({
      key: "insider",
      icon: <PersonSearchIcon />,
      title: "Senaste insiderköp",
      value: insiderVolume ? `+${insiderVolume} ${insiderUnit}` : latestInsiderBuy.type ?? "Förvärv",
      subtitle: `${latestInsiderBuy.person ?? "Ledningsperson"}${insiderDate ? ` • ${insiderDate}` : ""}${
        latestInsiderBuy.position ? ` (${latestInsiderBuy.position})` : ""
      }${insiderValue ? ` • ${insiderValue}` : ""}`,
      badge: latestInsiderBuy.instrumentName ?? latestInsiderBuy.type ?? "Insynsaffär",
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
          Smakprov ur dashboards
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
          Live-uppdaterad data när du loggar in
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
          Få detaljerade grafer, realtidsstatistik över spelare och djupgående utdelningshistorik för Evolution.
          Allt samlat på ett ställe, uppdaterat varje dag.
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
            Logga in
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
            Skapa konto
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
          aria-label="Visa föregående smakprov"
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
              <StatCard key={card.key} {...card} />
            ))}
          </Box>
        </Box>

        <IconButton
          size="small"
          onClick={handleNext}
          disabled={page >= totalPages - 1}
          aria-label="Visa fler smakprov"
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
