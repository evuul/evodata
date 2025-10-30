'use client';

import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Divider,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Stack,
  useTheme,
} from "@mui/material";
import useMediaQuery from "@/lib/useMuiMediaQuery";
import {
  AreaChart,
  Area,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
} from "recharts";
import { GAMES as GAME_LIST, COLORS as GAME_COLORS } from "@/config/games";
import { fetchOverviewShared } from "@/lib/csOverviewClient";

const REPORT_LOOKBACK_DAYS = 90;
const PLAYER_ADJUSTMENT_FACTOR = 1.1;
const DEFAULT_REVENUE_PER_PLAYER = 423.7 / 65769;
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
const getQuarter = (date) => {
  const month = date.getMonth() + 1;
  if (month <= 3) return "Q1";
  if (month <= 6) return "Q2";
  if (month <= 9) return "Q3";
  return "Q4";
};
const getQuarterDates = (year, quarter) => {
  const monthIndex = { Q1: 0, Q2: 3, Q3: 6, Q4: 9 }[quarter];
  if (!Number.isFinite(monthIndex)) {
    return { start: new Date(year, 0, 1), end: new Date(year, 2, 31) };
  }
  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 3, 0);
  return { start, end };
};

const mergePlayersData = (staticRows, dynamicRows) => {
  const map = new Map();
  if (Array.isArray(staticRows)) {
    staticRows.forEach((row) => {
      const date = row?.Datum || row?.date || null;
      const players = Number(row?.Players ?? row?.players);
      if (date && Number.isFinite(players)) map.set(date, Math.round(players));
    });
  }
  if (Array.isArray(dynamicRows)) {
    dynamicRows.forEach((row) => {
      const date = row?.Datum || row?.date || null;
      const players = Number(row?.Players ?? row?.avgPlayers ?? row?.players);
      if (date && Number.isFinite(players)) map.set(date, Math.round(players));
    });
  }
  return Array.from(map.entries())
    .map(([date, players]) => ({ Datum: date, Players: players }))
    .sort((a, b) => a.Datum.localeCompare(b.Datum));
};

const calculateQuarterlyPlayers = (playersData) => {
  if (!playersData || !Array.isArray(playersData)) return {};
  const buckets = {};
  playersData.forEach((item) => {
    const rawDate = item?.Datum || item?.date;
    if (!rawDate) return;
    const date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) return;
    const playersValue = Number(item?.Players ?? item?.players);
    if (!Number.isFinite(playersValue)) return;
    const key = `${date.getFullYear()} ${getQuarter(date)}`;
    (buckets[key] ??= []).push(playersValue);
  });
  return Object.keys(buckets).reduce((acc, key) => {
    const values = buckets[key];
    const avgPlayers =
      values.length > 0
        ? Math.round(values.reduce((s, v) => s + v, 0) / values.length)
        : 0;
    acc[key] = { avgPlayers, days: values.length };
    return acc;
  }, {});
};

const calculateQuarterProgress = (currentDate, year, quarter) => {
  const { start, end } = getQuarterDates(year, quarter);
  const totalDays = Math.max(1, Math.floor((end - start) / MS_PER_DAY) + 1);
  let elapsed = 0;
  if (currentDate >= start) {
    const effectiveEnd = currentDate > end ? end : currentDate;
    elapsed = Math.floor((effectiveEnd - start) / MS_PER_DAY);
    if (effectiveEnd >= start) elapsed += 1;
  }
  elapsed = Math.min(Math.max(elapsed, 0), totalDays);
  const progressPercent = Math.min(Math.max(Math.round((elapsed / totalDays) * 100), 0), 100);
  return { elapsedDays: elapsed, totalDays, progressPercent };
};

const labelFromPeriod = (period) => {
  const parts = periodKeyToParts(period);
  if (!parts) return period;
  return `${parts.quarter} ${parts.year}`;
};
const formatMillion = (value) =>
  Number.isFinite(value)
    ? value.toLocaleString("sv-SE", { maximumFractionDigits: 1 })
    : "–";
const findGameBySlug = (slug) =>
  GAME_LIST.find((game) => game.apiSlug === slug) || null;

const LiveShowIntelligence = ({ financialReports, averagePlayersData }) => {
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
        const json = await fetchOverviewShared(REPORT_LOOKBACK_DAYS);

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
              .filter((row) => typeof row.slug === "string" && Number.isFinite(row.avgPlayers))
          : [];

        if (!cancelled) {
          setDynamicPlayers(rows);
          setSlugAverages(averages);
          setOverviewGeneratedAt(json?.generatedAt || null);
        }
      } catch (error) {
        if (!cancelled) setOverviewError(error instanceof Error ? error.message : String(error));
      } finally {
        if (!cancelled) setOverviewLoading(false);
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

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentQuarter = getQuarter(currentDate);
  const currentIndex = quarterToIndex(currentYear, currentQuarter);

  // Period-nycklar
  const currentPeriod = formatPeriodKey(currentIndex);
  const previousPeriod = formatPeriodKey(currentIndex - 1); // kvar för tabellen/texten
  const twoBeforePeriod = formatPeriodKey(currentIndex - 2); // kvar för tabellen
  const lastYearSameQuarterPeriod = formatPeriodKey(
    quarterToIndex(currentYear - 1, currentQuarter)
  ); // <-- NYTT: YoY-period

  const quarterProgress = useMemo(
    () => calculateQuarterProgress(currentDate, currentYear, currentQuarter),
    [currentDate, currentYear, currentQuarter]
  );

  const quarterlyPlayers = useMemo(
    () => calculateQuarterlyPlayers(mergedPlayersData),
    [mergedPlayersData]
  );

  const revenueData = useMemo(() => {
    if (
      !financialReports ||
      !financialReports.financialReports ||
      !Array.isArray(financialReports.financialReports)
    ) {
      return {};
    }
    return financialReports.financialReports.reduce((acc, report) => {
      const key = `${report.year} ${report.quarter}`;
      acc[key] = Number(report.liveCasino) || null;
      return acc;
    }, {});
  }, [financialReports]);

  // Baslinje för €/spelare
  const baseline = useMemo(() => {
    const entries = Object.entries(quarterlyPlayers)
      .map(([period, info]) => {
        const parts = periodKeyToParts(period);
        const revenue = revenueData[period];
        if (!parts || !Number.isFinite(revenue) || !Number.isFinite(info?.avgPlayers) || info.avgPlayers <= 0) {
          return null;
        }
        return {
          period,
          index: quarterToIndex(parts.year, parts.quarter),
          revenuePerPlayer: revenue / info.avgPlayers,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.index - a.index);

    if (!entries.length) {
      return { period: null, revenuePerPlayer: DEFAULT_REVENUE_PER_PLAYER };
    }
    return entries[0];
  }, [quarterlyPlayers, revenueData]);

  const baselineRevenuePerPlayer = baseline.revenuePerPlayer;
  const baselineReferencePeriod = baseline.period;

  // Lista perioder att visa i tabellen (oförändrat)
  const quarterPlayersList = useMemo(() => {
    const basePeriods = [currentPeriod, previousPeriod, twoBeforePeriod, baselineReferencePeriod];
    const unique = [];
    basePeriods.forEach((p) => { if (p && !unique.includes(p)) unique.push(p); });
    return unique;
  }, [currentPeriod, previousPeriod, twoBeforePeriod, baselineReferencePeriod]);

  const currentQuarterPlayers = quarterlyPlayers[currentPeriod]?.avgPlayers ?? null;

  // Serie för nuvarande kvartal (till grafen)
  const qData = useMemo(() => {
    if (!currentPeriod) return [];
    return mergedPlayersData
      .filter((item) => {
        const date = new Date(item.Datum);
        if (Number.isNaN(date.getTime())) return false;
        return date.getFullYear() === currentYear && getQuarter(date) === currentQuarter;
      })
      .sort((a, b) => new Date(a.Datum) - new Date(b.Datum))
      .map((item) => ({ date: item.Datum, players: Number(item.Players) || 0 }));
  }, [mergedPlayersData, currentPeriod, currentYear, currentQuarter]);

  const liveAveragePlayers = useMemo(() => {
    if (!qData.length) return null;
    const sum = qData.reduce((acc, item) => acc + (Number(item.players) || 0), 0);
    return Math.round(sum / qData.length);
  }, [qData]);

  const baseAveragePlayers = liveAveragePlayers ?? currentQuarterPlayers ?? 0;
  const adjustedAveragePlayers = Math.round(baseAveragePlayers * PLAYER_ADJUSTMENT_FACTOR);

  // Estimerad omsättning för pågående kvartal
  const estimatedRevenue = Number.isFinite(baselineRevenuePerPlayer)
    ? Math.round(adjustedAveragePlayers * baselineRevenuePerPlayer * 10) / 10
    : null;

  // Takt hittills (linjär fördelning över dagar)
  const revenueSoFar = Number.isFinite(estimatedRevenue)
    ? Math.round((estimatedRevenue * quarterProgress.elapsedDays) / Math.max(quarterProgress.totalDays, 1) * 10) / 10
    : null;

  // --- NYTT: Endast KORTET uppe till höger ska vara YoY ---
  const yoyReferenceRevenue = Number.isFinite(revenueData[lastYearSameQuarterPeriod])
    ? revenueData[lastYearSameQuarterPeriod]
    : null;

  const changeYoY = useMemo(() => {
    if (!Number.isFinite(estimatedRevenue) || yoyReferenceRevenue == null) {
      return { value: null, percent: null };
    }
    const value = estimatedRevenue - yoyReferenceRevenue;
    const percent = yoyReferenceRevenue !== 0 ? (value / yoyReferenceRevenue) * 100 : null;
    return { value, percent };
  }, [estimatedRevenue, yoyReferenceRevenue]);

  // --- Kvar: tidigare QoQ-jämförelse för text under graferna (oförändrad) ---
  const previousRevenue = Number.isFinite(revenueData[previousPeriod])
    ? revenueData[previousPeriod]
    : null;

  const changeQoQ = useMemo(() => {
    if (!Number.isFinite(estimatedRevenue) || previousRevenue == null) {
      return { value: null, percent: null };
    }
    const value = estimatedRevenue - previousRevenue;
    const percent = previousRevenue !== 0 ? (value / previousRevenue) * 100 : null;
    return { value, percent };
  }, [estimatedRevenue, previousRevenue]);

  // Tabell (oförändrad logik/ordning)
  const tableRows = useMemo(() => {
    return quarterPlayersList
      .map((period) => {
        const info = quarterlyPlayers[period] || { avgPlayers: 0 };
        const basePlayers = Math.round(info.avgPlayers || 0);
        const adjustedPlayers = Math.round(basePlayers * PLAYER_ADJUSTMENT_FACTOR);
        const actualRevenue = Number.isFinite(revenueData[period]) ? revenueData[period] : null;
        const useAdjusted = period === currentPeriod || !Number.isFinite(actualRevenue);
        const playersForEstimate = useAdjusted ? adjustedPlayers : basePlayers;
        const est = Number.isFinite(baselineRevenuePerPlayer)
          ? Math.round(playersForEstimate * baselineRevenuePerPlayer * 10) / 10
          : null;
        const diff =
          Number.isFinite(actualRevenue) && Number.isFinite(est)
            ? actualRevenue - est
            : null;
        const percent =
          Number.isFinite(diff) && Number.isFinite(actualRevenue) && actualRevenue !== 0
            ? (diff / actualRevenue) * 100
            : null;

        return {
          period,
          label: labelFromPeriod(period),
          basePlayers,
          adjustedPlayers,
          playersUsed: playersForEstimate,
          estimated: est,
          actual: actualRevenue,
          diff,
          percent,
          highlight: period === currentPeriod,
        };
      })
      .filter(
        (row) =>
          row.basePlayers > 0 ||
          Number.isFinite(row.actual) ||
          Number.isFinite(row.estimated)
      );
  }, [quarterPlayersList, quarterlyPlayers, revenueData, currentPeriod, baselineRevenuePerPlayer]);

  // Topp 3-spel (oförändrat)
  const topGames = useMemo(() => {
    if (!slugAverages.length) return [];
    const totalPlayers = slugAverages.reduce(
      (sum, row) => sum + (Number.isFinite(row.avgPlayers) ? row.avgPlayers : 0),
      0
    );
    if (totalPlayers <= 0) return [];
    return slugAverages
      .map((row) => {
        const game = findGameBySlug(row.slug);
        const avgPlayers = Number.isFinite(row.avgPlayers) ? row.avgPlayers : 0;
        return {
          id: game?.id || row.slug,
          label: game?.label || row.slug,
          avgPlayers: Math.round(avgPlayers),
          share: avgPlayers / totalPlayers,
          color: GAME_COLORS[game?.id] || "#38bdf8",
        };
      })
      .sort((a, b) => b.avgPlayers - a.avgPlayers)
      .slice(0, 3)
      .map((item) => ({
        ...item,
        estimatedRevenue: Number.isFinite(estimatedRevenue)
          ? Math.round(estimatedRevenue * item.share * 10) / 10
          : null,
      }));
  }, [slugAverages, estimatedRevenue]);

  const overviewGeneratedLabel = useMemo(() => {
    if (!overviewGeneratedAt) return null;
    try {
      const date = new Date(overviewGeneratedAt);
      return date.toLocaleString("sv-SE", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return null;
    }
  }, [overviewGeneratedAt]);

  // Färg för QoQ-texten under korten (oförändrat)
  const changeQoQColor =
    changeQoQ.percent == null
      ? "rgba(226,232,240,0.7)"
      : changeQoQ.percent >= 0
      ? "#34d399"
      : "#f87171";

// Beskrivande rad under grafen (NU YoY, med teckenregler)
const trendText = (() => {
  if (!Number.isFinite(estimatedRevenue)) {
    return "Uppskattad omsättning saknas – inväntar mer data.";
  }
  const refLabel = labelFromPeriod(lastYearSameQuarterPeriod);
  if (changeYoY.percent == null) {
    return `Taktar mot ${refLabel} på ungefär ${formatMillion(estimatedRevenue)} €M.`;
  }

  const descriptor = changeYoY.percent >= 0 ? "över" : "under";
  const amountSign = changeYoY.value < 0 ? "–" : "";
  const percentSign = changeYoY.percent < 0 ? "–" : "";
  const amountStr = `${amountSign}${formatMillion(Math.abs(changeYoY.value))} €M`;
  const percentStr = `${percentSign}${Math.abs(changeYoY.percent).toFixed(1)}%`;

  return `Taktar ${descriptor} ${refLabel} med ${amountStr} (${percentStr}).`;
})();

  const chartYAxisMax = useMemo(() => {
    if (!qData.length) return undefined;
    const max = Math.max(...qData.map((item) => item.players));
    return Math.ceil(max * 1.15);
  }, [qData]);

  return (
    <Box
      sx={{
        background: "linear-gradient(135deg, #111827, #0f172a)",
        borderRadius: "18px",
        border: "1px solid rgba(148,163,184,0.18)",
        boxShadow: "0 20px 45px rgba(15, 23, 42, 0.45)",
        color: "#f8fafc",
        padding: { xs: 3, md: 4 },
        width: "100%",
        maxWidth: "1200px",
        margin: "16px auto",
        position: "relative",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "flex-start" : "center",
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="overline" sx={{ letterSpacing: 1, color: "rgba(148,163,184,0.75)" }}>
            Live Show Intelligence
          </Typography>
          <Typography variant={isMobile ? "h5" : "h4"} sx={{ fontWeight: 700, color: "#f8fafc" }}>
            Gameshow Earnings Outlook
          </Typography>
          <Typography sx={{ color: "rgba(226,232,240,0.65)", maxWidth: 460, mt: 1 }}>
            Uppskattad live-omsättning baserad på lobbydata och historisk omsättning per spelare.
          </Typography>
        </Box>

        <Stack direction={"row"} gap={1} flexWrap="wrap" alignItems="center">
          {overviewGeneratedLabel && (
            <Chip
              label={`Lobby uppdaterad ${overviewGeneratedLabel}`}
              size="small"
              sx={{ backgroundColor: "rgba(59,130,246,0.15)", color: "#93c5fd", fontWeight: 500 }}
            />
          )}
          {overviewLoading && (
            <Chip
              label="Synkar live-data …"
              size="small"
              sx={{ backgroundColor: "rgba(148,163,184,0.18)", color: "rgba(226,232,240,0.85)" }}
            />
          )}
          {overviewError && (
            <Chip
              label={`Fel vid hämtning: ${overviewError}`}
              size="small"
              sx={{ backgroundColor: "rgba(248,113,113,0.2)", color: "#fca5a5" }}
            />
          )}
        </Stack>
      </Box>

      <Divider sx={{ borderColor: "rgba(148,163,184,0.2)", my: { xs: 3, md: 4 } }} />

      {/* KPI-kort */}
      <Grid container spacing={isMobile ? 2 : 3}>
        {/* Kvartalsprogress */}
        <Grid item xs={12} md={4}>
          <Box
            sx={{
              background: "rgba(15,23,42,0.55)",
              borderRadius: "14px",
              border: "1px solid rgba(148,163,184,0.18)",
              p: 3,
              height: "100%",
            }}
          >
            <Typography sx={{ color: "rgba(148,163,184,0.75)", fontWeight: 600 }}>
              {`${currentQuarter} ${currentYear}`}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, mt: 1 }}>
              {quarterProgress.elapsedDays}/{quarterProgress.totalDays} dagar
            </Typography>
            <Typography sx={{ color: "rgba(226,232,240,0.7)", fontSize: "0.95rem", mt: 0.5 }}>
              {quarterProgress.progressPercent}% av kvartalet avklarat
            </Typography>
            <LinearProgress
              variant="determinate"
              value={quarterProgress.progressPercent}
              sx={{
                mt: 2,
                height: 6,
                borderRadius: 4,
                backgroundColor: "rgba(148,163,184,0.25)",
                "& .MuiLinearProgress-bar": { background: "linear-gradient(90deg, #34d399, #38bdf8)" },
              }}
            />
            {baselineReferencePeriod && (
              <Typography sx={{ color: "rgba(148,163,184,0.75)", fontSize: "0.8rem", mt: 2 }}>
                Baslinje: {labelFromPeriod(baselineReferencePeriod)} · {formatMillion(baselineRevenuePerPlayer)} €M/spelare
              </Typography>
            )}
          </Box>
        </Grid>

        {/* Justerade spelare */}
        <Grid item xs={12} md={4}>
          <Box
            sx={{
              background: "rgba(26,46,89,0.55)",
              borderRadius: "14px",
              border: "1px solid rgba(96,165,250,0.3)",
              p: 3,
              height: "100%",
            }}
          >
            <Typography sx={{ color: "rgba(148,163,184,0.75)", fontWeight: 600 }}>
              Genomsnittliga spelare (justerade)
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, mt: 1, color: "#93c5fd" }}>
              {adjustedAveragePlayers.toLocaleString("sv-SE")}
            </Typography>
            <Typography sx={{ color: "rgba(226,232,240,0.75)", fontSize: "0.95rem", mt: 0.5 }}>
              {liveAveragePlayers
                ? `Live-snitt ${liveAveragePlayers.toLocaleString("sv-SE")} spelare`
                : currentQuarterPlayers
                ? `Kvartalssnitt ${currentQuarterPlayers.toLocaleString("sv-SE")} spelare`
                : "Inväntar kvartalsdata"}
            </Typography>
          </Box>
        </Grid>

        {/* Uppskattad omsättning – NU: YoY mot samma kvartal i fjol */}
        <Grid item xs={12} md={4}>
          <Box
            sx={{
              background: "rgba(14,116,144,0.55)",
              borderRadius: "14px",
              border: "1px solid rgba(45,212,191,0.28)",
              p: 3,
              height: "100%",
            }}
          >
            <Typography sx={{ color: "rgba(148,163,184,0.75)", fontWeight: 600 }}>
              Uppskattad omsättning
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, mt: 1 }}>
              {formatMillion(estimatedRevenue)} €M
            </Typography>

            {/* YoY-differens */}
            <Typography
              sx={{
                color:
                  changeYoY.percent == null
                    ? "rgba(226,232,240,0.75)"
                    : changeYoY.percent >= 0
                    ? "#34d399"
                    : "#f87171",
                fontSize: "0.95rem",
                mt: 0.5,
              }}
            >
              {changeYoY.percent == null
                ? "Inväntar jämförelsedata"
                : `${changeYoY.value >= 0 ? "+" : "-"}${formatMillion(Math.abs(changeYoY.value))} €M (${changeYoY.value >= 0 ? "+" : "-"}${Math.abs(changeYoY.percent).toFixed(1)}%) vs ${labelFromPeriod(lastYearSameQuarterPeriod)}`}
            </Typography>

            {Number.isFinite(revenueSoFar) && (
              <Typography sx={{ color: "rgba(226,232,240,0.75)", fontSize: "0.9rem", mt: 1 }}>
                Takt hittills: {formatMillion(revenueSoFar)} €M
              </Typography>
            )}
          </Box>
        </Grid>
      </Grid>

      {/* QoQ-text under korten (oförändrad) */}
      <Typography sx={{ color: changeQoQColor, mt: { xs: 3, md: 4 } }}>
        {trendText}
      </Typography>

      {/* Graf */}
      <Box
        sx={{
          background: "rgba(15,23,42,0.55)",
          borderRadius: "16px",
          border: "1px solid rgba(148,163,184,0.18)",
          p: { xs: 2, md: 3 },
          mt: { xs: 3, md: 4 },
          display: "flex",
          flexDirection: "column",
          gap: { xs: 2, md: 3 },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 1.5,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Live-snitt spelare · {labelFromPeriod(currentPeriod)}
          </Typography>
          <Typography sx={{ color: "rgba(148,163,184,0.75)", fontSize: "0.85rem" }}>
            {qData.length > 0 ? `${qData.length} uppdateringar` : "Inväntar live-data"}
          </Typography>
        </Box>

        <Box sx={{ height: isMobile ? 260 : 320 }}>
          {qData.length ? (
            <ResponsiveContainer>
              <AreaChart data={qData} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="playersGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3182ce" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#0f172a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(148,163,184,0.15)" strokeDasharray="4 4" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: isMobile ? 11 : 12, fill: "rgba(148,163,184,0.75)" }}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(148,163,184,0.25)" }}
                />
                <YAxis
                  tick={{ fontSize: isMobile ? 11 : 12, fill: "rgba(148,163,184,0.75)" }}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(148,163,184,0.25)" }}
                  domain={[0, chartYAxisMax]}
                  width={isMobile ? 40 : 48}
                />
                <RechartsTooltip
                  contentStyle={{
                    background: "rgba(15,23,42,0.9)",
                    border: "1px solid rgba(96,165,250,0.25)",
                    borderRadius: 12,
                    color: "#f8fafc",
                  }}
                  formatter={(value) => `${Number(value).toLocaleString("sv-SE")} spelare`}
                  labelStyle={{ color: "rgba(226,232,240,0.75)" }}
                />
                <Area
                  dataKey="players"
                  type="monotone"
                  stroke="#60a5fa"
                  strokeWidth={2.5}
                  fill="url(#playersGradient)"
                  fillOpacity={1}
                  animationDuration={900}
                  isAnimationActive
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <Box
              sx={{
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "rgba(148,163,184,0.65)",
              }}
            >
              <Typography>Ingen live-data att visa ännu.</Typography>
            </Box>
          )}
        </Box>

        {/* Tabell (oförändrad ordning/beräkning) */}
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
            Kvartalsjämförelse
          </Typography>
          <Typography sx={{ color: "rgba(148,163,184,0.75)", fontSize: "0.85rem", mb: 2 }}>
            Estimerad vs faktisk live-omsättning (Meuro)
          </Typography>
          <Table size="small" sx={{ minWidth: 360 }}>
            <TableHead>
              <TableRow sx={{ "& th": { color: "rgba(148,163,184,0.75)", fontWeight: 600 } }}>
                <TableCell>Period</TableCell>
                <TableCell align="right">Spelare</TableCell>
                <TableCell align="right">Est.</TableCell>
                <TableCell align="right">Faktisk</TableCell>
                <TableCell align="right">Δ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tableRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} sx={{ color: "rgba(148,163,184,0.75)", py: 3 }}>
                    Ingen kvartalsdata tillgänglig ännu.
                  </TableCell>
                </TableRow>
              )}
              {tableRows.map((row) => (
                <TableRow
                  key={row.period}
                  sx={{
                    backgroundColor: row.highlight ? "rgba(37,99,235,0.12)" : "transparent",
                    "&:last-of-type td": { borderBottom: 0 },
                  }}
                >
                  <TableCell sx={{ color: "#f8fafc" }}>{row.label}</TableCell>
                  <TableCell align="right" sx={{ color: "rgba(226,232,240,0.85)" }}>
                    {row.playersUsed.toLocaleString("sv-SE")}
                  </TableCell>
                  <TableCell align="right" sx={{ color: "#93c5fd" }}>
                    {formatMillion(row.estimated)}
                  </TableCell>
                  <TableCell align="right" sx={{ color: "rgba(226,232,240,0.85)" }}>
                    {formatMillion(row.actual)}
                  </TableCell>
                  <TableCell align="right" sx={{ color: row.diff >= 0 ? "#34d399" : "#f87171" }}>
                    {Number.isFinite(row.diff)
                      ? `${row.diff >= 0 ? "+" : "-"}${formatMillion(Math.abs(row.diff))}`
                      : "–"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Box>

      {/* Topp 3-spel */}
      {topGames.length > 0 && (
        <Box
          sx={{
            mt: { xs: 3, md: 4 },
            background: "rgba(15,23,42,0.55)",
            borderRadius: "14px",
            border: "1px solid rgba(148,163,184,0.18)",
            p: { xs: 2, md: 3 },
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 1.5,
              mb: 2,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Topp 3 liveshower senaste {REPORT_LOOKBACK_DAYS} dagarna
            </Typography>
            <Typography sx={{ color: "rgba(148,163,184,0.75)", fontSize: "0.85rem" }}>
              Andelar baserat på lobby-snitt
            </Typography>
          </Box>

          <Grid container spacing={isMobile ? 2 : 3}>
            {topGames.map((game) => (
              <Grid item xs={12} md={4} key={game.id}>
                <Box
                  sx={{
                    borderRadius: "12px",
                    border: `1px solid ${game.color}33`,
                    background: "rgba(15,23,42,0.65)",
                    p: 2,
                    display: "flex",
                    flexDirection: "column",
                    gap: 0.75,
                  }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        backgroundColor: game.color,
                        boxShadow: `0 0 0 3px ${game.color}22`,
                      }}
                    />
                    <Typography sx={{ fontWeight: 600, color: "#f8fafc" }}>
                      {game.label}
                    </Typography>
                  </Stack>
                  <Typography sx={{ color: "rgba(226,232,240,0.75)", fontSize: "0.9rem" }}>
                    {game.avgPlayers.toLocaleString("sv-SE")} snittspelare
                  </Typography>
                  <Typography sx={{ color: "#93c5fd", fontSize: "0.9rem" }}>
                    {(game.share * 100).toFixed(1)}% av lobbyvolymen
                  </Typography>
                  <Typography sx={{ color: "#34d399", fontSize: "0.9rem" }}>
                    {Number.isFinite(game.estimatedRevenue)
                      ? `${formatMillion(game.estimatedRevenue)} €M i takt`
                      : "Omsättning estimeras"}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
};

export default LiveShowIntelligence;