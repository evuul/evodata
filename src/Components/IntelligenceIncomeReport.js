'use client';
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  useTheme,
} from "@mui/material";
import useMediaQuery from "@/lib/useMuiMediaQuery";
import {
  LineChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { GAMES as GAME_LIST, COLORS as GAME_COLORS } from "@/config/games";

const REPORT_LOOKBACK_DAYS = 90;
const DEFAULT_REVENUE_PER_PLAYER = 423.7 / 65769; // tidigare Q2-bas
const PLAYER_ADJUSTMENT_FACTOR = 1.1;
const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const quarterToIndex = (year, quarter) => {
  const idx = QUARTERS.indexOf(quarter);
  if (idx === -1) throw new Error(`Unknown quarter ${quarter}`);
  return year * 4 + idx;
};

const indexToQuarter = (value) => {
  const qIndex = ((value % 4) + 4) % 4;
  const year = Math.floor(value / 4);
  return { year, quarter: QUARTERS[qIndex] };
};

const formatPeriodKey = (value) => {
  const { year, quarter } = indexToQuarter(value);
  return `${year} ${quarter}`;
};

const periodKeyToParts = (period) => {
  if (!period) return null;
  const [yearStr, quarter] = period.split(" ");
  const year = Number(yearStr);
  if (!Number.isFinite(year) || !QUARTERS.includes(quarter)) return null;
  return { year, quarter };
};

const roundOneDecimal = (value) =>
  Number.isFinite(value) ? Math.round(value * 10) / 10 : value;

const mergePlayersData = (staticRows, dynamicRows) => {
  const map = new Map();

  if (Array.isArray(staticRows)) {
    staticRows.forEach((row) => {
      const date = row?.Datum || row?.date || null;
      const players = Number(row?.Players ?? row?.players);
      if (date && Number.isFinite(players)) {
        map.set(date, Math.round(players));
      }
    });
  }

  if (Array.isArray(dynamicRows)) {
    dynamicRows.forEach((row) => {
      const date = row?.Datum || row?.date || null;
      const players = Number(row?.Players ?? row?.avgPlayers ?? row?.players);
      if (date && Number.isFinite(players)) {
        map.set(date, Math.round(players));
      }
    });
  }

  return Array.from(map.entries())
    .map(([date, players]) => ({ Datum: date, Players: players }))
    .sort((a, b) => a.Datum.localeCompare(b.Datum));
};

// Hjälpfunktion för att bestämma kvartal baserat på datum
const getQuarter = (date) => {
  const month = date.getMonth() + 1;
  if (month >= 1 && month <= 3) return "Q1";
  if (month >= 4 && month <= 6) return "Q2";
  if (month >= 7 && month <= 9) return "Q3";
  return "Q4";
};

// Hjälpfunktion för att få start- och slutdatum för ett givet kvartal och år
const getQuarterDates = (year, quarter) => {
  const monthIndex = { Q1: 0, Q2: 3, Q3: 6, Q4: 9 }[quarter];
  if (!Number.isFinite(monthIndex)) {
    return {
      start: new Date(year, 0, 1),
      end: new Date(year, 2, 31),
    };
  }
  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 3, 0); // sista dagen i kvartalet
  return { start, end };
};

// Hjälpfunktion för att summera genomsnittliga spelare per kvartal
const calculateQuarterlyPlayers = (playersData) => {
  if (!playersData || !Array.isArray(playersData)) return {};

  const quarterlyData = {};
  playersData.forEach((item) => {
    const rawDate = item?.Datum || item?.date;
    if (!rawDate) return;
    const date = new Date(rawDate);
    if (isNaN(date)) return;

    const playersValue = Number(item?.Players ?? item?.players);
    if (!Number.isFinite(playersValue)) return;

    const year = date.getFullYear();
    const quarter = getQuarter(date);
    const key = `${year} ${quarter}`;

    if (!quarterlyData[key]) {
      quarterlyData[key] = { players: [], dates: [] };
    }
    quarterlyData[key].players.push(playersValue);
    quarterlyData[key].dates.push(rawDate);
  });

  return Object.keys(quarterlyData).reduce((acc, key) => {
    const bucket = quarterlyData[key];
    const { players, dates } = bucket;
    const avgPlayers =
      players.length > 0
        ? Math.round(players.reduce((sum, val) => sum + val, 0) / players.length)
        : 0;
    acc[key] = { avgPlayers, dates, days: players.length };
    return acc;
  }, {});
};

// Komponenten
const IntelligenceIncomeReport = ({ financialReports, averagePlayersData }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [dynamicPlayers, setDynamicPlayers] = useState([]);
  const [slugAverages, setSlugAverages] = useState([]);
  const [overviewError, setOverviewError] = useState("");
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewGeneratedAt, setOverviewGeneratedAt] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setOverviewLoading(true);
        setOverviewError("");
        const res = await fetch(`/api/casinoscores/lobby/overview?days=${REPORT_LOOKBACK_DAYS}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!json?.ok) throw new Error(json?.error || "Kunde inte hämta lobby-data");

        const rows = Array.isArray(json?.dailyTotals)
          ? json.dailyTotals
              .map((row) => ({
                Datum: row?.date,
                Players: Number(row?.avgPlayers),
              }))
              .filter((row) => row?.Datum && Number.isFinite(row?.Players))
          : [];

        const averages = Array.isArray(json?.slugAverages)
          ? json.slugAverages
              .map((row) => ({
                slug: row?.slug,
                avgPlayers: Number(row?.avgPlayers),
              }))
              .filter((row) => typeof row.slug === "string" && Number.isFinite(row.avgPlayers) && row.avgPlayers > 0)
          : [];
        const generatedAt = json?.generatedAt || null;

        if (!cancelled) {
          setDynamicPlayers(rows);
          setSlugAverages(averages);
          setOverviewGeneratedAt(generatedAt);
        }
      } catch (error) {
        if (!cancelled) {
          setOverviewError(error instanceof Error ? error.message : String(error));
        }
      } finally {
        if (!cancelled) {
          setOverviewLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const mergedPlayersData = useMemo(
    () => mergePlayersData(averagePlayersData, dynamicPlayers),
    [averagePlayersData, dynamicPlayers]
  );

  // Aktuellt datum (dynamiskt)
  const currentDate = new Date(); // Nu 10:27 AM CEST, 2025-07-17
  const currentYear = currentDate.getFullYear();
  const currentQuarter = getQuarter(currentDate);

  // Bestäm de tre senaste kvartalen att visa
  const getRecentQuarters = () => {
    try {
      const base = quarterToIndex(currentYear, currentQuarter);
      return [0, -1, -2].map((offset) => formatPeriodKey(base + offset));
    } catch {
      return [`${currentYear} ${currentQuarter}`, `${currentYear} ${currentQuarter}`, `${currentYear} ${currentQuarter}`];
    }
  };

  const [currentPeriod, previousPeriod, twoBeforePeriod] = getRecentQuarters();

  // Formatera rapportdatum för visning baserat på specifikt kvartal
  const getReportDate = (quarter, year) => {
    const reportMonth = { Q1: 4, Q2: 7, Q3: 10, Q4: 1 }[quarter];
    const reportDay = { Q1: 17, Q2: 17, Q3: 23, Q4: 17 }[quarter];
    const reportYear = quarter === "Q4" ? year + 1 : year;
    return new Date(`${reportYear}-${reportMonth}-${reportDay}`);
  };

  // Beräkna antal dagar och procent för aktuellt kvartal
  const getQuarterProgress = () => {
    const { start, end } = getQuarterDates(currentYear, currentQuarter);
    const totalDays = Math.max(1, Math.floor((end - start) / MS_PER_DAY) + 1);
    let elapsed = 0;
    if (currentDate >= start) {
      const effectiveEnd = currentDate > end ? end : currentDate;
      elapsed = Math.floor((effectiveEnd - start) / MS_PER_DAY);
      if (effectiveEnd >= start) {
        elapsed += 1; // räkna innevarande dag
      }
    }
    elapsed = Math.min(Math.max(elapsed, 0), totalDays);
    const progressPercent = Math.min(
      Math.max(Math.round((elapsed / totalDays) * 100), 0),
      100
    );
    return { elapsedDays: elapsed, totalDays, progressPercent };
  };

  const { elapsedDays, totalDays, progressPercent } = getQuarterProgress();

  // Bearbeta genomsnittliga spelare per kvartal
  const quarterlyPlayers = useMemo(
    () => calculateQuarterlyPlayers(mergedPlayersData),
    [mergedPlayersData]
  );

  // Bearbeta liveCasino-data från financialReports
  const revenueData = useMemo(() => {
    if (!financialReports || !financialReports.financialReports || !Array.isArray(financialReports.financialReports)) {
      return {};
    }

    const data = {};
    financialReports.financialReports.forEach((report) => {
      const key = `${report.year} ${report.quarter}`;
      data[key] = Number(report.liveCasino) || 0; // Fallback till 0 om värdet saknas
    });
    return data;
  }, [financialReports]);

  // Beräkna historisk omsättning per spelare per kvartal
  const revenuePerPlayerMap = useMemo(() => {
    return Object.entries(quarterlyPlayers).reduce((acc, [period, info]) => {
      const revenue = revenueData[period];
      const avgPlayers = info?.avgPlayers;
      if (Number.isFinite(revenue) && Number.isFinite(avgPlayers) && avgPlayers > 0) {
        acc[period] = revenue / avgPlayers;
      }
      return acc;
    }, {});
  }, [quarterlyPlayers, revenueData]);

  const baselineStats = useMemo(() => {
    const entries = Object.entries(revenuePerPlayerMap)
      .map(([period, value]) => {
        const parts = periodKeyToParts(period);
        if (!parts) return null;
        return {
          period,
          value,
          index: quarterToIndex(parts.year, parts.quarter),
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.index - a.index);
    return entries[0] || null;
  }, [revenuePerPlayerMap]);

const baselineRevenuePerPlayer =
  baselineStats?.value && Number.isFinite(baselineStats.value)
    ? baselineStats.value
    : DEFAULT_REVENUE_PER_PLAYER;
const baselineReferencePeriod = baselineStats?.period || null;
const baselineIndex = useMemo(() => {
  if (!baselineReferencePeriod) return null;
  const parts = periodKeyToParts(baselineReferencePeriod);
  if (!parts) return null;
  return quarterToIndex(parts.year, parts.quarter);
  }, [baselineReferencePeriod]);

  // Skapa tabelldata för Q1, Q2 och Q3
  const { tableData, rawPeriodRows } = useMemo(() => {
    const candidatePeriods = [twoBeforePeriod, previousPeriod, baselineReferencePeriod, currentPeriod]
      .filter(Boolean);
    const seen = new Set();
    const orderedPeriods = [];
    for (const period of candidatePeriods) {
      if (!seen.has(period)) {
        seen.add(period);
        orderedPeriods.push(period);
      }
    }

    const buildRow = (period) => {
      const parts = periodKeyToParts(period);
      const info = quarterlyPlayers[period] || { avgPlayers: 0, dates: [], days: 0 };
      const baseAvgPlayers = Math.round(info.avgPlayers || 0);
      const actualRevenue = Number.isFinite(revenueData[period]) ? revenueData[period] : null;
      const periodIndex = parts ? quarterToIndex(parts.year, parts.quarter) : null;
      const forceBoost =
        baselineIndex != null && periodIndex != null && periodIndex > baselineIndex;
      const useAdjusted = forceBoost || !Number.isFinite(actualRevenue);
      const adjustedAvgPlayers = Math.round(baseAvgPlayers * PLAYER_ADJUSTMENT_FACTOR);
      const playersForEstimate = useAdjusted ? adjustedAvgPlayers : baseAvgPlayers;
      const displayAvgPlayers = useAdjusted ? adjustedAvgPlayers : baseAvgPlayers;
      const estimatedRevenue =
        playersForEstimate > 0 && Number.isFinite(baselineRevenuePerPlayer)
          ? roundOneDecimal(playersForEstimate * baselineRevenuePerPlayer)
          : null;
      let differencePercent = null;
      let differenceValue = null;
      if (
        actualRevenue !== null &&
        actualRevenue !== undefined &&
        estimatedRevenue
      ) {
        differenceValue = actualRevenue - estimatedRevenue;
        const percentBase =
          Number.isFinite(estimatedRevenue) && estimatedRevenue !== 0
            ? estimatedRevenue
            : actualRevenue || null;
        differencePercent =
          percentBase && percentBase !== 0 ? (differenceValue / percentBase) * 100 : null;
      }

      return {
        periodKey: period,
        quarter: parts?.quarter || period,
        year: parts?.year || null,
        avgPlayersDisplay: displayAvgPlayers,
        avgPlayersBase: baseAvgPlayers,
        avgPlayersAdjusted: adjustedAvgPlayers,
        useAdjusted,
        upskattad: estimatedRevenue,
        faktisk: actualRevenue,
        diffValue: Number.isFinite(differenceValue) ? differenceValue : null,
        diffPercent: Number.isFinite(differencePercent) ? differencePercent : null,
        isCurrent: period === currentPeriod,
        dates: info.dates || [],
        days: info.days || 0,
        hidden: period === baselineReferencePeriod,
      };
    };

    const rows = orderedPeriods
      .map((period) => buildRow(period))
      .filter(Boolean);

    return {
      tableData: rows.filter((row) => !row.hidden),
      rawPeriodRows: rows,
    };
  }, [
    twoBeforePeriod,
    previousPeriod,
    baselineReferencePeriod,
    currentPeriod,
    quarterlyPlayers,
    revenueData,
    baselineRevenuePerPlayer,
    baselineIndex,
  ]);

  // Data för graf (endast aktuellt kvartal hittills)
  const qData = useMemo(() => {
    if (!currentPeriod) return [];
    return mergedPlayersData
      .filter((item) => {
        const date = new Date(item.Datum);
        if (isNaN(date)) return false;
        const itemQuarter = getQuarter(date);
        return date.getFullYear() === currentYear && itemQuarter === currentQuarter;
      })
      .map((item) => ({
        date: item.Datum,
        players: Number(item.Players) || 0,
      }));
  }, [mergedPlayersData, currentPeriod, currentYear, currentQuarter]);

  // Beräkna preliminära nyckeltal för aktuellt kvartal
  const preliminary = useMemo(() => {
    const averagePlayersCurrent = (() => {
      if (qData.length) {
        const sum = qData.reduce((acc, item) => acc + (Number(item.players) || 0), 0);
        return Math.round(sum / qData.length);
      }
      return Math.round(quarterlyPlayers[currentPeriod]?.avgPlayers || 0);
    })();

    const adjustedAveragePlayers = Math.round(
      averagePlayersCurrent * PLAYER_ADJUSTMENT_FACTOR
    );

    const estimatedRevenue =
      adjustedAveragePlayers > 0 && Number.isFinite(baselineRevenuePerPlayer)
        ? roundOneDecimal(adjustedAveragePlayers * baselineRevenuePerPlayer)
        : 0;

    const previousRevenue = Number.isFinite(revenueData[previousPeriod])
      ? revenueData[previousPeriod]
      : null;

    const changePercent =
      previousRevenue && estimatedRevenue
        ? ((estimatedRevenue - previousRevenue) / previousRevenue) * 100
        : null;

    const revenueSoFar =
      estimatedRevenue && totalDays > 0
        ? roundOneDecimal(estimatedRevenue * (elapsedDays / totalDays))
        : 0;

    return {
      avgPlayers: adjustedAveragePlayers,
      estimatedRevenue,
      changePercent,
      revenueSoFar,
      baselineSource: baselineReferencePeriod,
    };
  }, [
    qData,
    quarterlyPlayers,
    currentPeriod,
    baselineRevenuePerPlayer,
    revenueData,
    previousPeriod,
    elapsedDays,
    totalDays,
    baselineReferencePeriod,
  ]);

  const topGameShares = useMemo(() => {
    if (!Array.isArray(slugAverages) || slugAverages.length === 0) {
      return { items: [], totalPlayers: 0 };
    }

    const gameMap = new Map(GAME_LIST.map((game) => [game.id, game]));

    const entries = slugAverages
      .map(({ slug, avgPlayers }) => {
        const game = gameMap.get(slug);
        if (!game || !Number.isFinite(avgPlayers) || avgPlayers <= 0) return null;
        return {
          id: slug,
          label: game.label,
          avgPlayers,
        };
      })
      .filter(Boolean);

    if (!entries.length) return { items: [], totalPlayers: 0 };

    const totalPlayers = entries.reduce((sum, entry) => sum + entry.avgPlayers, 0);
    if (!(totalPlayers > 0)) return { items: [], totalPlayers: 0 };

    const totalEstimatedRevenue = Number.isFinite(preliminary.estimatedRevenue)
      ? preliminary.estimatedRevenue
      : null;

    const items = entries
      .map((entry) => {
        const share = entry.avgPlayers / totalPlayers;
        return {
          ...entry,
          share,
          estimatedRevenue: totalEstimatedRevenue != null ? share * totalEstimatedRevenue : null,
          color: GAME_COLORS?.[entry.id] || "#22c55e",
        };
      })
      .sort((a, b) => b.avgPlayers - a.avgPlayers)
      .slice(0, 3);

    return { items, totalPlayers };
  }, [slugAverages, preliminary.estimatedRevenue]);

  const overviewGeneratedLabel = useMemo(() => {
    if (!overviewGeneratedAt) return null;
    try {
      const date = new Date(overviewGeneratedAt);
      return date.toLocaleString("sv-SE", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return null;
    }
  }, [overviewGeneratedAt]);

  // Beräkna trendtext baserat på uppskattad förändring
  const getTrendText = () => {
    const previousRevenue = Number.isFinite(revenueData[previousPeriod])
      ? revenueData[previousPeriod]
      : null;
    const estimated = Number.isFinite(preliminary.estimatedRevenue)
      ? preliminary.estimatedRevenue
      : 0;
    const changePercent = Number.isFinite(preliminary.changePercent)
      ? preliminary.changePercent
      : null;
    const changeAmount =
      previousRevenue !== null ? estimated - previousRevenue : estimated;

    if (changePercent !== null) {
      if (changePercent > 2) {
        return `Vi är på god väg att öka vår omsättning med ${changeAmount.toLocaleString("sv-SE", {
          maximumFractionDigits: 1,
        })} Meuro (+${changePercent.toFixed(2)}%)!`;
      }
      if (changePercent < -2) {
        return `Varning: Vi riskerar att minska omsättningen med ${Math.abs(changeAmount).toLocaleString("sv-SE", {
          maximumFractionDigits: 1,
        })} Meuro (${changePercent.toFixed(2)}%)!`;
      }
      return `Vi verkar hålla oss på samma nivå som ${
        previousPeriod.split(" ")[1]
      } ${previousPeriod.split(" ")[0]} (±${changePercent.toFixed(2)}%)!`;
    }

    return `Uppskattad omsättning ligger runt ${estimated.toLocaleString("sv-SE", {
      maximumFractionDigits: 1,
    })} Meuro men vi saknar referens för jämförelse.`;
  };

const trendText = getTrendText();
const changePercentValue = Number.isFinite(preliminary.changePercent)
  ? preliminary.changePercent
  : null;
const changePercentColor =
  changePercentValue === null
    ? "#e0e0e0"
    : changePercentValue >= 0
    ? "#00e676"
    : "#FF6F61";
const quarterComparison = useMemo(() => {
  const currentRow = rawPeriodRows.find((row) => row.periodKey === currentPeriod);
  const prevRow = rawPeriodRows.find((row) => row.periodKey === previousPeriod);
  if (!currentRow || !prevRow) return null;

  const currentValue = Number.isFinite(preliminary.estimatedRevenue)
    ? preliminary.estimatedRevenue
    : currentRow.faktisk ?? currentRow.upskattad;
  const previousValue = Number.isFinite(prevRow.faktisk)
    ? prevRow.faktisk
    : prevRow.upskattad;

  if (!Number.isFinite(currentValue) || !Number.isFinite(previousValue)) return null;

  const delta = currentValue - previousValue;
  const percent = previousValue !== 0 ? (delta / previousValue) * 100 : null;
  return {
    label: `${prevRow.quarter} ${prevRow.year ?? ""}`.trim(),
    previous: previousValue,
    delta,
    percent,
  };
}, [rawPeriodRows, currentPeriod, previousPeriod, preliminary.estimatedRevenue]);

const quarterDeltaColor = quarterComparison
  ? quarterComparison.delta >= 0
    ? "#22c55e"
    : "#FF6F61"
  : "rgba(226,232,240,0.75)";
const quarterSummaryText = useMemo(() => {
  if (!quarterComparison) return null;
  const absDelta = Math.abs(quarterComparison.delta).toFixed(1);
  const absPercent =
    quarterComparison.percent != null ? Math.abs(quarterComparison.percent).toFixed(2) : null;
  const direction = quarterComparison.delta >= 0 ? "över" : "under";
  return `Taktar ${direction} ${quarterComparison.label} med ${absDelta} €M${
    absPercent != null ? ` (${absPercent}%)` : ""
  }.`;
}, [quarterComparison]);

  return (
    <Box
      sx={{
        background: "linear-gradient(135deg, #1e1e1e, #2e2e2e)",
        color: "#f8fafc",
        borderRadius: "16px",
        border: "1px solid rgba(255,255,255,0.06)",
        boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
        width: "100%",
        maxWidth: "1200px",
        margin: "16px auto",
        overflow: "hidden",
        display: "none",
      }}
    >
      <Box
        sx={{
          p: { xs: 3, md: 4 },
          display: "flex",
          flexDirection: "column",
          gap: { xs: 3, md: 4 },
        }}
      >
      {/* Preliminära nyckeltal utan svart ruta */}
      <Box
        sx={{
          textAlign: "center",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        <Typography
          variant="h5"
          sx={{
            color: "#ffffff",
            fontWeight: 600,
            fontSize: { xs: "1.3rem", sm: "1.6rem" },
          }}
        >
          Gameshow Earnings Tracker ({currentQuarter} {currentYear})
        </Typography>
        <Typography sx={{ color: "#e0e0e0", fontSize: { xs: "0.9rem", sm: "1rem" }, mb: 1, fontFamily: "'Roboto', sans-serif" }}>
          Genomsnittliga Spelare: <span style={{ color: "#00e676" }}>{preliminary.avgPlayers.toLocaleString()}</span> (hittills)
        </Typography>
        <Typography sx={{ color: "#FFCA28", fontSize: { xs: "0.9rem", sm: "1rem" }, mb: 1, fontFamily: "'Roboto', sans-serif" }}>
          Uppskattad Omsättning:{" "}
          <span style={{ color: "#FFCA28" }}>
            {Number.isFinite(preliminary.estimatedRevenue)
              ? preliminary.estimatedRevenue.toLocaleString("sv-SE", { maximumFractionDigits: 1 })
              : "n/a"}{" "}
            €M
          </span>
        </Typography>
        <Typography sx={{ color: "#e0e0e0", fontSize: { xs: "0.9rem", sm: "1rem" }, mb: 1, fontFamily: "'Roboto', sans-serif" }}>
          Uppskattad Intäkt Hittills:{" "}
          <span style={{ color: "#00e676" }}>
            {Number.isFinite(preliminary.revenueSoFar)
              ? preliminary.revenueSoFar.toLocaleString("sv-SE", { maximumFractionDigits: 1 })
              : "n/a"}{" "}
            €M
          </span>
        </Typography>
        {overviewLoading && dynamicPlayers.length === 0 && (
          <Typography
            sx={{
              color: "#bbb",
              fontSize: { xs: "0.8rem", sm: "0.9rem" },
              fontFamily: "'Roboto', sans-serif",
              mt: 1,
            }}
          >
            Hämtar lobby-data …
          </Typography>
        )}
        {overviewError && (
          <Typography
            sx={{
              color: "#FF6F61",
              fontSize: { xs: "0.8rem", sm: "0.9rem" },
              fontFamily: "'Roboto', sans-serif",
              mt: 1,
            }}
          >
            Kunde inte hämta senaste lobby-datan: {overviewError}
          </Typography>
        )}
      </Box>

      {/* Progressindikator & baslinje */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: { xs: 2, md: 4 },
        }}
      >
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            background: "rgba(255,255,255,0.04)",
            borderRadius: "12px",
            border: "1px solid rgba(255,255,255,0.06)",
            p: 2.5,
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 0.75,
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{
              color: "rgba(148,163,184,0.75)",
              fontWeight: 600,
            }}
          >
            {currentQuarter} {currentYear} Progress
          </Typography>
          <Typography
            variant="h5"
            sx={{
              color: "#f8fafc",
              fontWeight: 700,
            }}
          >
            {elapsedDays}/{totalDays} dagar ({progressPercent}%)
          </Typography>
          <Typography
            sx={{
              color: "rgba(226,232,240,0.65)",
              fontSize: { xs: "0.9rem", sm: "1rem" },
            }}
          >
            av kvartalet har passerat
          </Typography>
        </Box>

        {/* <Box
          sx={{
            flex: 1,
            minWidth: 0,
            background: "rgba(255,255,255,0.04)",
            borderRadius: "12px",
            border: "1px solid rgba(255,255,255,0.06)",
            p: 2.5,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 0.75,
            textAlign: "center",
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{ color: "rgba(148,163,184,0.75)", fontWeight: 600 }}
          >
            Baslinje
          </Typography>
          <Typography sx={{ color: "#22c55e", fontWeight: 600, fontSize: "1.1rem" }}>
            {baselineReferencePeriod
              ? `${baselineReferencePeriod} • ${(baselineRevenuePerPlayer * 1_000_000).toLocaleString("sv-SE", {
                  maximumFractionDigits: 0,
                })} €`
              : `Historisk antagande • ${(baselineRevenuePerPlayer * 1_000_000).toLocaleString("sv-SE", {
                  maximumFractionDigits: 0,
                })} €`}
          </Typography>
        </Box> */}
      </Box>

      {/* Graf för aktuellt kvartal (tillfälligt avstängd) */}
      {/*
      {qData.length > 0 && (
        <Box
          sx={{
            background: "rgba(255,255,255,0.03)",
            borderRadius: "14px",
            border: "1px solid rgba(255,255,255,0.06)",
            p: { xs: 2.5, md: 3 },
            textAlign: "center",
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#f8fafc", mb: 1.5 }}>
            Spelaretrend ({currentQuarter} {currentYear})
          </Typography>
          <Typography sx={{ color: "rgba(226,232,240,0.65)", mb: 2 }}>
            Dagligt snitt av lobby (justerat +10%). Uppdateras varje cron-körning.
          </Typography>
          <ResponsiveContainer width="100%" height={isMobile ? 220 : 280}>
            <LineChart data={qData} margin={{ top: 10, right: 40, left: 10, bottom: 10 }}>
              <defs>
                <linearGradient id="playersTrendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#42A5F5" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#42A5F5" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
              <XAxis
                dataKey="date"
                stroke="#bbb"
                angle={isMobile ? -45 : 0}
                textAnchor={isMobile ? "end" : "middle"}
                height={isMobile ? 50 : 30}
                interval="preserveStartEnd"
                tick={{ fontSize: isMobile ? 12 : 14, fill: "#bbb", fontFamily: "'Roboto', sans-serif" }}
                tickCount={4}
                tickMargin={10}
              />
              <YAxis
                stroke="#bbb"
                domain={['auto', 'auto']}
                tick={{ fontSize: isMobile ? 12 : 14, fill: "#bbb", fontFamily: "'Roboto', sans-serif" }}
                tickCount={5}
              />
              <Tooltip
                contentStyle={{
                  background: "rgba(255, 255, 255, 0.1)",
                  border: "none",
                  borderRadius: "8px",
                  color: "#fff",
                  fontFamily: "'Roboto', sans-serif",
                }}
                formatter={(value) => `${value.toLocaleString()} spelare`}
              />
              <Area
                type="monotone"
                dataKey="players"
                stroke="#42A5F5"
                strokeWidth={2}
                fill="url(#playersTrendFill)"
                fillOpacity={1}
                dot={false}
                activeDot={{ r: 6, fill: "#42A5F5", stroke: "#fff", strokeWidth: 2 }}
                animationDuration={1200}
              />
              <Line
                type="monotone"
                dataKey="players"
                stroke="#82c7ff"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 6, fill: "#42A5F5", stroke: "#fff", strokeWidth: 2 }}
                animationDuration={1200}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      )}
      */}

        {/* {topGameShares.items.length > 0 && (
          <Box
            sx={{
              background: "rgba(255,255,255,0.03)",
              borderRadius: "14px",
              border: "1px solid rgba(255,255,255,0.06)",
              p: { xs: 2.5, md: 3 },
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
              <Typography variant="h6" sx={{ color: "#f8fafc", fontWeight: 700 }}>
                Top 3 Games (genomsnittlig andel)
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "rgba(226,232,240,0.65)", fontSize: "0.85rem" }}>
                <Typography component="span">
                  Totalt {topGameShares.totalPlayers.toLocaleString("sv-SE", { maximumFractionDigits: 0 })} snittspelare
                </Typography>
                {overviewGeneratedLabel && (
                  <Typography component="span">• Uppdaterad {overviewGeneratedLabel}</Typography>
                )}
              </Box>
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {topGameShares.items.map((item) => (
                <Box
                  key={item.id}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "rgba(255,255,255,0.02)",
                    border: `1px solid ${item.color}33`,
                    borderRadius: "12px",
                    padding: "12px 16px",
                    gap: 1.5,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: "50%", background: item.color }} />
                    <Typography sx={{ color: "#f8fafc", fontWeight: 600 }}>
                      {item.label}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1.5, sm: 3 }, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <Typography sx={{ color: "rgba(226,232,240,0.75)", fontSize: "0.9rem" }}>
                      {item.avgPlayers.toLocaleString("sv-SE", { maximumFractionDigits: 0 })} spelare (snitt)
                    </Typography>
                    <Typography sx={{ color: "#38bdf8", fontWeight: 600, fontSize: "0.9rem" }}>
                      {(item.share * 100).toFixed(1)}%
                    </Typography>
                    <Typography sx={{ color: "#facc15", fontWeight: 600, fontSize: "0.9rem" }}>
                      {item.estimatedRevenue != null
                        ? `${item.estimatedRevenue.toLocaleString("sv-SE", { maximumFractionDigits: 1 })} €M`
                        : "–"}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
            {topGameShares.items.length < 3 && (
              <Typography sx={{ color: "rgba(226,232,240,0.5)", fontSize: "0.85rem" }}>
                Färre än tre spel har tillräcklig data för perioden.
              </Typography>
            )}
            <Typography sx={{ color: "rgba(226,232,240,0.6)", fontSize: "0.85rem" }}>
              Andelar bygger på genomsnittliga samtidiga spelare under de senaste {REPORT_LOOKBACK_DAYS} dagarna.
            </Typography>
          </Box>
        )} */}

      <Box
        sx={{
          background: "rgba(255,255,255,0.03)",
          borderRadius: "14px",
          border: "1px solid rgba(255,255,255,0.06)",
          p: { xs: 2.5, md: 3 },
        }}
      >
        <Typography
          variant="h6"
          sx={{ color: "#f8fafc", fontWeight: 700, textAlign: "center", mb: 2 }}
        >
          Gameshow Omsättning vs Faktiskt
        </Typography>
        <Typography sx={{ color: "rgba(226,232,240,0.65)", textAlign: "center", mb: 2 }}>
          Jämför uppskattning från lobby-spelare mot rapporterade siffror.
        </Typography>

        <Box sx={{ overflowX: "auto" }}>
          <Table sx={{ minWidth: { xs: 560, sm: 650 } }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: "#fff", fontWeight: "bold", fontSize: { xs: "0.85rem", sm: "0.95rem" }, borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
                  Period
                </TableCell>
                <TableCell sx={{ color: "#fff", fontWeight: "bold", fontSize: { xs: "0.85rem", sm: "0.95rem" }, borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
                  Genomsnitt spelare
                </TableCell>
                <TableCell sx={{ color: "#fff", fontWeight: "bold", fontSize: { xs: "0.85rem", sm: "0.95rem" }, borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
                  Uppskattad (€M)
                </TableCell>
                <TableCell sx={{ color: "#fff", fontWeight: "bold", fontSize: { xs: "0.85rem", sm: "0.95rem" }, borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
                  Faktisk (€M)
                </TableCell>
                <TableCell sx={{ color: "#fff", fontWeight: "bold", fontSize: { xs: "0.85rem", sm: "0.95rem" }, borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
                  Skillnad (%)
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tableData.map((row) => {
                const reportDate =
                  row.year && row.quarter ? getReportDate(row.quarter, row.year) : null;
                const reportDateFormatted = reportDate
                  ? reportDate.toLocaleDateString("sv-SE", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : null;
                const displayLabel = row.year ? `${row.quarter} ${row.year}` : row.quarter;
                const hasActual = Number.isFinite(row.faktisk);
                const diffValue = hasActual ? row.diffValue ?? null : null;
                const diffPercent = hasActual ? row.diffPercent ?? null : null;
                const diffPositive = Number.isFinite(diffValue) ? diffValue >= 0 : null;
                const diffColor =
                  diffPositive === null
                    ? "#9ca3af"
                    : diffPositive
                    ? "#22c55e"
                    : "#ef4444";
                return (
                  <TableRow
                    key={row.periodKey}
                    sx={{
                      backgroundColor: row.isCurrent ? "rgba(34,197,94,0.08)" : "transparent",
                      "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.05)" },
                      transition: "background-color 0.3s ease",
                    }}
                  >
                    <TableCell sx={{ color: "#e0e0e0", fontSize: { xs: "0.85rem", sm: "0.95rem" }, borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                      {displayLabel}{" "}
                      {row.isCurrent && <span style={{ color: "#22c55e" }}>• Live</span>}
                    </TableCell>
                    <TableCell sx={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 0.25 }}>
                        <Typography sx={{ color: "#e0e0e0", fontWeight: 600 }}>
                          {row.avgPlayersDisplay.toLocaleString()}
                        </Typography>
                        <Typography sx={{ color: "rgba(226,232,240,0.6)", fontSize: "0.75rem" }}>
                          {row.useAdjusted ? "prognos (+10%)" : "historiskt snitt"}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ color: "#facc15", fontSize: { xs: "0.85rem", sm: "0.95rem" }, borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                      {row.upskattad?.toLocaleString() || "-"}
                    </TableCell>
                    <TableCell sx={{ color: "#22c55e", fontSize: { xs: "0.85rem", sm: "0.95rem" }, borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                      {row.faktisk?.toLocaleString() ||
                        (reportDateFormatted ? `Kommer ${reportDateFormatted}!` : "-")}
                    </TableCell>
                    <TableCell sx={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)", whiteSpace: "nowrap" }}>
                      {Number.isFinite(diffValue) && Number.isFinite(diffPercent) ? (
                        <Box
                          sx={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 0.5,
                            px: 1,
                            py: 0.5,
                            borderRadius: "999px",
                            backgroundColor: diffPositive ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.15)",
                            color: diffColor,
                            fontSize: "0.85rem",
                            fontWeight: 600,
                          }}
                        >
                          {`${diffPositive ? "+" : ""}${diffValue.toFixed(1)} €M`}
                          <Typography component="span" sx={{ fontSize: "0.75rem", color: diffColor }}>
                            ({`${diffPositive ? "+" : ""}${diffPercent.toFixed(2)}%`})
                          </Typography>
                        </Box>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
        <Typography sx={{ color: "rgba(226,232,240,0.6)", fontSize: "0.85rem", mt: 1.5 }}>
          Genomsnitt spelare visar prognos-justerade nivåer när verkliga siffror saknas. Skillnad jämför rapporterad intäkt mot vår modell för respektive kvartal.
        </Typography>
      </Box>

      {/* Trend & disclaimer */}
      <Box
        sx={{
          background: "rgba(0,229,255,0.08)",
          borderRadius: "14px",
          border: "1px solid rgba(0,229,255,0.25)",
          p: { xs: 2.5, md: 3 },
          textAlign: "center",
          color: "#e0f7ff",
        }}
      >
        <Typography
          sx={{
            color: trendText.includes("Varning") ? "#f87171" : trendText.includes("god väg") ? "#34d399" : "#e0f7ff",
            fontSize: { xs: "0.95rem", sm: "1.05rem" },
            fontWeight: 600,
            mb: 1.5,
          }}
        >
          {trendText}
        </Typography>
        <Typography
          sx={{
            color: "rgba(224, 247, 255, 0.75)",
            fontSize: { xs: "0.78rem", sm: "0.85rem" },
            lineHeight: 1.6,
          }}
        >
          Ansvarsfriskrivning: Denna rapport bygger på uppskattningar där lobbyspelar-data extrapoleras mot tidigare rapporterade intäkter. Underlaget avser gameshow-segmentet och är ingen officiell prognos.
        </Typography>
      </Box>
    </Box>
  </Box>
  );
};

export default IntelligenceIncomeReport;
