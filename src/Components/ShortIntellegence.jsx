'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
  IconButton,
  Grid,
  LinearProgress,
  useTheme,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ComposedChart,
  Bar,
  Line,
} from "recharts";
import useMediaQuery from "@/lib/useMuiMediaQuery";
import { totalSharesData } from "./buybacks/utils";
import { useStockPriceContext } from "@/context/StockPriceContext";
import { parseJsonResponse } from "@/lib/apiResponse";
import { useTranslate } from "@/context/LocaleContext";

const VIEW_OPTIONS = [
  { value: "blanking", labelSv: "Blankningstrend", labelEn: "Short interest trend" },
  { value: "trading", labelSv: "Handel & andelar", labelEn: "Trading & short share" },
];

const BLANKING_RANGES = [7, 30, 90];
const TRADING_RANGES_DESKTOP = [14, 30, 90];
const TRADING_RANGES_MOBILE = [7, 14, 30];

const LATEST_TOTAL_SHARES =
  totalSharesData?.[totalSharesData.length - 1]?.totalShares || null;

const formatPercent = (value, digits = 2) =>
  Number.isFinite(value) ? `${value.toFixed(digits)}%` : "–";

const formatNumber = (value) =>
  Number.isFinite(value) ? value.toLocaleString("sv-SE") : "–";

const formatMillion = (value, digits = 1) =>
  Number.isFinite(value)
    ? value.toLocaleString("sv-SE", { maximumFractionDigits: digits })
    : "–";

const shortLabel = (dateStr) => {
  try {
    const date = new Date(`${dateStr}T00:00:00Z`);
    return date.toLocaleDateString("sv-SE", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
};

const fullLabel = (dateStr) => {
  try {
    const date = new Date(`${dateStr}T00:00:00Z`);
    return date.toLocaleDateString("sv-SE", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
};

const buildTradingSeries = (items) =>
  items.map((item) => ({
    date: item.date,
    xLabel: shortLabel(item.date),
    volumeShares: item.volumeShares,
    volumeM: Number.isFinite(item.volumeShares)
      ? item.volumeShares / 1_000_000
      : null,
    volumeAverage5M: Number.isFinite(item.volumeAverage5)
      ? item.volumeAverage5 / 1_000_000
      : null,
    shortSharePct: item.shortShareOfVolumePercent,
    shortShareAvg5: item.shortShareOfVolumeAverage5,
    shortChangeShares: item.shortChangeShares,
  }));

const computeBlankingSummary = (series, stockPrice) => {
  if (!series.length) {
    return {
      latestPercent: null,
      latestDate: null,
      deltaPP: null,
      deltaShares: null,
      totalShares: null,
      totalValue: null,
      valueDelta: null,
    };
  }

  const latest = series[series.length - 1];
  const previous = series.length > 1 ? series[series.length - 2] : null;
  const deltaPP = previous
    ? Number((latest.percent - previous.percent).toFixed(2))
    : null;

  const totalShares =
    Number.isFinite(latest.percent) && LATEST_TOTAL_SHARES
      ? Math.round((latest.percent / 100) * LATEST_TOTAL_SHARES)
      : null;
  const deltaShares =
    deltaPP != null && LATEST_TOTAL_SHARES
      ? Math.round((deltaPP / 100) * LATEST_TOTAL_SHARES)
      : null;

  const price = stockPrice?.price?.regularMarketPrice?.raw;
  const totalValue =
    totalShares != null && Number.isFinite(price) ? totalShares * price : null;
  const valueDelta =
    deltaShares != null && Number.isFinite(price) ? deltaShares * price : null;

  return {
    latestPercent: latest.percent,
    latestDate: latest.date,
    deltaPP,
    deltaShares,
    totalShares,
    totalValue,
    valueDelta,
  };
};

const ShortTooltip = ({ active, payload }) => {
  const translate = useTranslate();
  if (!active || !payload?.length) return null;
  const datum = payload[0]?.payload ?? {};
  const change = datum.delta;
  return (
    <Box
      sx={{
        p: 1.5,
        background: "rgba(15,23,42,0.92)",
        border: "1px solid rgba(96,165,250,0.25)",
        borderRadius: 1.5,
      }}
    >
      <Typography variant="caption" sx={{ color: "rgba(226,232,240,0.8)" }}>
        {fullLabel(datum.date)}
      </Typography>
      <Typography variant="body2" sx={{ color: "#f8fafc", mt: 0.5 }}>
        {translate(
          `${formatPercent(datum.percent, 2)} blankade aktier`,
          `${formatPercent(datum.percent, 2)} shorted shares`
        )}
      </Typography>
      {change != null && (
        <Typography
          variant="body2"
          sx={{ color: change >= 0 ? "#f87171" : "#34d399" }}
        >
          {translate(
            `${change >= 0 ? "+" : ""}${change.toFixed(2)} pp mot föregående dag`,
            `${change >= 0 ? "+" : ""}${change.toFixed(2)} pp vs previous day`
          )}
        </Typography>
      )}
    </Box>
  );
};

const TradingTooltip = ({ active, payload }) => {
  const translate = useTranslate();
  if (!active || !payload?.length) return null;
  const datum = payload[0]?.payload ?? {};
  return (
    <Box
      sx={{
        p: 1.5,
        background: "rgba(15,23,42,0.92)",
        border: "1px solid rgba(96,165,250,0.25)",
        borderRadius: 1.5,
      }}
    >
      <Typography variant="caption" sx={{ color: "rgba(226,232,240,0.8)" }}>
        {fullLabel(datum.date)}
      </Typography>
      {Number.isFinite(datum.volumeM) && (
        <Typography variant="body2" sx={{ color: "#34d399", mt: 0.5 }}>
          {translate(
            `Volym: ${formatMillion(datum.volumeM, 1)} M aktier`,
            `Volume: ${formatMillion(datum.volumeM, 1)} M shares`
          )}
        </Typography>
      )}
      {Number.isFinite(datum.shortSharePct) && (
        <Typography variant="body2" sx={{ color: "#facc15" }}>
          {translate(
            `Blankarnas andel: ${formatPercent(datum.shortSharePct)}`,
            `Short share of volume: ${formatPercent(datum.shortSharePct)}`
          )}
        </Typography>
      )}
      {Number.isFinite(datum.shortChangeShares) &&
        datum.shortChangeShares !== 0 && (
          <Typography
            variant="body2"
            sx={{ color: datum.shortChangeShares > 0 ? "#f87171" : "#34d399" }}
          >
            {translate(
              `Netto: ${datum.shortChangeShares > 0 ? "+" : "-"}${formatNumber(
                Math.abs(datum.shortChangeShares)
              )} aktier`,
              `Net: ${datum.shortChangeShares > 0 ? "+" : "-"}${formatNumber(
                Math.abs(datum.shortChangeShares)
              )} shares`
            )}
          </Typography>
        )}
    </Box>
  );
};

const ShortIntellegence = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { stockPrice } = useStockPriceContext();
  const translate = useTranslate();

  const [view, setView] = useState("blanking");

  const [blankingRange, setBlankingRange] = useState(30);
  const [blankingLoading, setBlankingLoading] = useState(false);
  const [blankingData, setBlankingData] = useState([]);
  const [blankingUpdatedAt, setBlankingUpdatedAt] = useState(null);

  const tradingRanges = isMobile ? TRADING_RANGES_MOBILE : TRADING_RANGES_DESKTOP;
  const [tradingRange, setTradingRange] = useState(tradingRanges[1]);
  const [tradingLoading, setTradingLoading] = useState(false);
  const [tradingError, setTradingError] = useState("");
  const [tradingItems, setTradingItems] = useState([]);
  const [aggregateShare, setAggregateShare] = useState(null);
  const [latestTrading, setLatestTrading] = useState(null);

  useEffect(() => {
    if (!tradingRanges.includes(tradingRange)) {
      setTradingRange(tradingRanges[tradingRanges.length - 1]);
    }
  }, [tradingRanges, tradingRange]);

  const fetchBlanking = useCallback(async () => {
    setBlankingLoading(true);
    try {
      const res = await fetch("/api/short/history");
      const json = await parseJsonResponse(res, { requireOk: false });
      const items = Array.isArray(json?.items) ? json.items : [];
      const sorted = items
        .slice()
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .map((item, idx, arr) => {
          const prev = idx > 0 ? arr[idx - 1] : null;
          const percent = Number(item.percent);
          const prevPercent = prev != null ? Number(prev.percent) : null;
          const delta =
            prevPercent != null &&
            Number.isFinite(prevPercent) &&
            Number.isFinite(percent)
              ? Number(percent - prevPercent).toFixed(2)
              : null;
          return {
            date: item.date,
            percent: Number.isFinite(percent) ? percent : null,
            delta: delta != null ? Number(delta) : null,
          };
        })
        .filter((item) => item.date && Number.isFinite(item.percent));
      setBlankingData(sorted);
      setBlankingUpdatedAt(json?.updatedAt || null);
    } catch (error) {
      console.error("Failed to fetch blanking history", error);
    } finally {
      setBlankingLoading(false);
    }
  }, []);

  const refreshBlanking = useCallback(async () => {
    setBlankingLoading(true);
    try {
      await fetch("/api/short/snapshot", {
        method: "POST",
        cache: "no-store",
      }).catch(() => {});
    } finally {
      await fetchBlanking();
    }
  }, [fetchBlanking]);

  const fetchTrading = useCallback(async (days) => {
    setTradingLoading(true);
    setTradingError("");
    try {
      const res = await fetch(`/api/short/activity?days=${days}`);
      const json = await parseJsonResponse(res, { requireOk: false });
      setTradingItems(Array.isArray(json?.items) ? json.items : []);
      setLatestTrading(json?.latest ?? null);
      setAggregateShare(
        Number.isFinite(json?.aggregateShare) ? json.aggregateShare : null
      );
    } catch (error) {
      console.error("Failed to fetch trading activity", error);
      setTradingError(
        error instanceof Error
          ? error.message
          : translate("Kunde inte hämta handelsdata", "Could not fetch trading data")
      );
    } finally {
      setTradingLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBlanking();
  }, [fetchBlanking]);

  useEffect(() => {
    fetchTrading(tradingRange);
  }, [fetchTrading, tradingRange]);

  const blankingSeries = useMemo(() => {
    const limit = Math.max(blankingRange, 1);
    return blankingData.slice(-limit).map((item) => ({
      ...item,
      xLabel: shortLabel(item.date),
    }));
  }, [blankingData, blankingRange]);

  const blankingSummary = useMemo(
    () => computeBlankingSummary(blankingSeries, stockPrice),
    [blankingSeries, stockPrice]
  );

  const blankingDomain = useMemo(() => {
    if (!blankingSeries.length) return [0, 1];
    const values = blankingSeries
      .map((item) => item.percent)
      .filter(Number.isFinite);
    if (!values.length) return [0, 1];
    let min = Math.min(...values);
    let max = Math.max(...values);
    const range = max - min;
    const padding = range > 0 ? range * 0.1 : 0.3;
    min = Math.max(0, min - padding);
    max = max + padding;
    if (min === max) {
      min = Math.max(0, min - 0.5);
      max = max + 0.5;
    }
    return [Math.floor(min * 10) / 10, Math.ceil(max * 10) / 10];
  }, [blankingSeries]);

  const blankingAxisInterval = useMemo(() => {
    const length = blankingSeries.length;
    if (!length) return 0;
    const divisor = isMobile ? 6 : 10;
    return Math.max(Math.floor(length / divisor) - 1, 0);
  }, [blankingSeries, isMobile]);

  const tradingSeries = useMemo(
    () => buildTradingSeries(tradingItems),
    [tradingItems]
  );

  const tradingAxisInterval = useMemo(() => {
    const length = tradingSeries.length;
    if (!length) return 0;
    const divisor = isMobile ? 6 : 12;
    return Math.max(Math.floor(length / divisor) - 1, 0);
  }, [tradingSeries, isMobile]);

  const latestTradingSummary = useMemo(() => {
    if (!latestTrading) return null;
    return {
      date: fullLabel(latestTrading.date),
      volumeM: Number.isFinite(latestTrading.volumeShares)
        ? latestTrading.volumeShares / 1_000_000
        : null,
      shortPercent: formatPercent(latestTrading.shortShareOfVolumePercent),
      netChange: Number.isFinite(latestTrading.shortChangeShares)
        ? `${latestTrading.shortChangeShares > 0 ? "+" : latestTrading.shortChangeShares < 0 ? "-" : ""}${formatNumber(
            Math.abs(latestTrading.shortChangeShares)
          )}`
        : "–",
      daysToCover: Number.isFinite(latestTrading.daysToCover)
        ? latestTrading.daysToCover
        : null,
    };
  }, [latestTrading]);

  const activeLoading = view === "blanking" ? blankingLoading : tradingLoading;

  return (
    <Box
      sx={{
        background: "linear-gradient(135deg, #0f172a, #1f2937)",
        borderRadius: "18px",
        border: "1px solid rgba(148,163,184,0.18)",
        boxShadow: "0 20px 45px rgba(15, 23, 42, 0.45)",
        color: "#f8fafc",
        padding: { xs: 3, md: 4 },
        width: "100%",
        maxWidth: "1200px",
        margin: "16px auto",
      }}
    >
      <Stack
        direction={isMobile ? "column" : "row"}
        spacing={isMobile ? 2 : 3}
        alignItems={isMobile ? "flex-start" : "center"}
        justifyContent="space-between"
      >
        <Box>
          <Typography
            variant="overline"
            sx={{ letterSpacing: 1, color: "rgba(148,163,184,0.65)" }}
          >
            {translate("Short Intelligence", "Short Intelligence")}
          </Typography>
          <Typography variant={isMobile ? "h5" : "h4"} sx={{ fontWeight: 700 }}>
            {translate("Blankning & daglig handel", "Short interest & daily trading")}
          </Typography>
          <Typography
            sx={{ color: "rgba(226,232,240,0.7)", mt: 1, maxWidth: 520 }}
          >
            {translate(
              "Växla mellan blankningsgrad och handelsdata för att se hur kortsiktiga positioner utvecklas och påverkar likviditeten.",
              "Switch between short interest and trading data to see how short-term positions evolve and impact liquidity."
            )}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
          {blankingUpdatedAt && (
            <Chip
              label={translate(
                `Blankning uppdaterad ${new Date(blankingUpdatedAt).toLocaleTimeString("sv-SE", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}`,
                `Short data updated ${new Date(blankingUpdatedAt).toLocaleTimeString("sv-SE", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}`
              )}
              size="small"
              sx={{
                backgroundColor: "rgba(59,130,246,0.15)",
                color: "#93c5fd",
                fontWeight: 500,
              }}
            />
          )}
          {aggregateShare != null && (
            <Chip
              label={translate(
                `Blankare stod för ${formatPercent(aggregateShare, 1)} av handeln`,
                `Shorts accounted for ${formatPercent(aggregateShare, 1)} of trading`
              )}
              size="small"
              sx={{
                backgroundColor: "rgba(250,204,21,0.15)",
                color: "#facc15",
                fontWeight: 500,
              }}
            />
          )}
          <IconButton
            aria-label={translate("Uppdatera blankningsdata", "Refresh short data")}
            onClick={refreshBlanking}
            size="small"
            sx={{
              backgroundColor: "rgba(148,163,184,0.18)",
              color: "#f8fafc",
              "&:hover": { backgroundColor: "rgba(148,163,184,0.28)" },
            }}
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Stack>

      <ToggleButtonGroup
        value={view}
        exclusive
        onChange={(_event, next) => next && setView(next)}
        sx={{
          mt: { xs: 3, md: 4 },
          backgroundColor: "rgba(148,163,184,0.12)",
          borderRadius: "999px",
          p: 0.5,
          flexWrap: "wrap",
        }}
      >
        {VIEW_OPTIONS.map((option) => (
          <ToggleButton
            key={option.value}
            value={option.value}
            sx={{
              textTransform: "none",
              color: "rgba(226,232,240,0.75)",
              border: 0,
              borderRadius: "999px!important",
              px: { xs: 1.75, md: 3 },
              py: 0.75,
              "&.Mui-selected": {
                color: "#f8fafc",
                backgroundColor:
                  option.value === "blanking"
                    ? "rgba(96,165,250,0.3)"
                    : "rgba(250,204,21,0.28)",
              },
            }}
          >
            {translate(option.labelSv, option.labelEn)}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      <Box sx={{ position: "relative", mt: { xs: 3, md: 4 } }}>
        {activeLoading && (
          <LinearProgress
            sx={{
              position: "absolute",
              top: -12,
              left: 0,
              right: 0,
              borderRadius: 999,
              backgroundColor: "rgba(148,163,184,0.12)",
              "& .MuiLinearProgress-bar": {
                background: "linear-gradient(90deg, #38bdf8, #818cf8)",
              },
            }}
          />
        )}

        {view === "blanking" ? (
          // ===== BLANKNING – FULLBLEED-KORT + BRED GRAF =====
          <Box
            sx={{
              background: "rgba(15,23,42,0.55)",
              border: "1px solid rgba(148,163,184,0.18)",
              borderRadius: { xs: 0, md: "16px" },
              // fullbleed: ta ut kortet till kanterna
              mx: { xs: -2, sm: -3, md: -4 },
              px: { xs: 2, sm: 3, md: 4 },
              py: { xs: 2, md: 3 },
              display: "flex",
              flexDirection: "column",
              gap: { xs: 2, md: 3 },
              overflow: "visible",
            }}
          >
            <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
              {BLANKING_RANGES.map((value) => (
                <Chip
                  key={value}
                  label={`${value}D`}
                  size="small"
                  onClick={() => setBlankingRange(value)}
                  sx={{
                    backgroundColor:
                      blankingRange === value
                        ? "rgba(96,165,250,0.35)"
                        : "rgba(148,163,184,0.15)",
                    color:
                      blankingRange === value
                        ? "#f8fafc"
                        : "rgba(226,232,240,0.75)",
                    cursor: "pointer",
                  }}
                />
              ))}
            </Stack>

            <Box sx={{ height: isMobile ? 260 : 320 }}>
              {blankingSeries.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={blankingSeries}
                    margin={{ top: 10, right: 0, left: 0, bottom: 0 }} // inga sidmarginaler
                  >
                    <defs>
                      <linearGradient id="blankingGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.6} />
                        <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      stroke="rgba(148,163,184,0.15)"
                      strokeDasharray="4 4"
                    />
                    <XAxis
                      dataKey="xLabel"
                      tick={{
                        fontSize: isMobile ? 11 : 12,
                        fill: "rgba(148,163,184,0.75)",
                      }}
                      tickLine={false}
                      axisLine={{ stroke: "rgba(148,163,184,0.25)" }}
                      interval={blankingAxisInterval}
                      minTickGap={isMobile ? 8 : 16}
                    />
                    <YAxis
                      tick={{
                        fontSize: isMobile ? 11 : 12,
                        fill: "rgba(148,163,184,0.75)",
                      }}
                      tickLine={false}
                      axisLine={{ stroke: "rgba(148,163,184,0.25)" }}
                      domain={blankingDomain}
                      width={isMobile ? 48 : 56}
                      tickFormatter={(value) => `${value.toFixed(1)}%`}
                    />
                    <RechartsTooltip content={<ShortTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="percent"
                      stroke="#60a5fa"
                      strokeWidth={2.5}
                      fill="url(#blankingGradient)"
                      fillOpacity={1}
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
                  <Typography>
                    {translate("Ingen blankningshistorik att visa.", "No short history to display.")}
                  </Typography>
              </Box>
            )}
            </Box>

            <Grid container spacing={isMobile ? 2 : 3}>
              <Grid item xs={12} md={4}>
                <Box
                  sx={{
                    background: "rgba(59,130,246,0.08)",
                    borderRadius: "14px",
                    border: "1px solid rgba(96,165,250,0.25)",
                    p: 2.5,
                  }}
                >
                  <Typography
                    sx={{
                      color: "rgba(148,163,184,0.75)",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                    }}
                  >
                    {translate("Senaste blankning", "Latest short interest")}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {formatPercent(blankingSummary.latestPercent, 2)}
                  </Typography>
                  <Typography
                    sx={{
                      color: "rgba(148,163,184,0.7)",
                      fontSize: "0.85rem",
                    }}
                  >
                    {blankingSummary.latestDate
                      ? fullLabel(blankingSummary.latestDate)
                      : "–"}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box
                  sx={{
                    background: "rgba(248,113,113,0.08)",
                    borderRadius: "14px",
                    border: "1px solid rgba(248,113,113,0.25)",
                    p: 2.5,
                  }}
                >
                  <Typography
                    sx={{
                      color: "rgba(248,113,113,0.8)",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                    }}
                  >
                    {translate("Förändring senaste dag", "Change since last day")}
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 700,
                      color:
                        blankingSummary.deltaPP != null
                          ? blankingSummary.deltaPP >= 0
                            ? "#f87171"
                            : "#34d399"
                          : "#f8fafc",
                    }}
                  >
                    {blankingSummary.deltaPP != null
                      ? `${blankingSummary.deltaPP >= 0 ? "+" : ""}${blankingSummary.deltaPP.toFixed(
                          2
                        )} pp`
                      : "–"}
                  </Typography>
                  <Typography
                    sx={{
                      color: "rgba(148,163,184,0.7)",
                      fontSize: "0.85rem",
                    }}
                  >
                    {translate(
                      `motsvarar ${blankingSummary.deltaShares != null ? formatNumber(Math.abs(blankingSummary.deltaShares)) : "–"} aktier`,
                      `equals ${blankingSummary.deltaShares != null ? formatNumber(Math.abs(blankingSummary.deltaShares)) : "–"} shares`
                    )}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box
                  sx={{
                    background: "rgba(45,212,191,0.08)",
                    borderRadius: "14px",
                    border: "1px solid rgba(45,212,191,0.25)",
                    p: 2.5,
                  }}
                >
                  <Typography
                    sx={{
                      color: "rgba(148,163,184,0.75)",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                    }}
                  >
                    {translate("Totalt blankat värde", "Total shorted value")}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {blankingSummary.totalValue != null
                      ? `${formatMillion(
                          blankingSummary.totalValue / 1_000_000,
                          1
                        )} MSEK`
                      : "–"}
                  </Typography>
                  <Typography
                    sx={{
                      color: "rgba(148,163,184,0.7)",
                      fontSize: "0.85rem",
                    }}
                  >
                    {blankingSummary.valueDelta != null
                      ? translate(
                          `${blankingSummary.valueDelta >= 0 ? "+" : ""}${formatMillion(
                            blankingSummary.valueDelta / 1_000_000,
                            1
                          )} MSEK senast`,
                          `${blankingSummary.valueDelta >= 0 ? "+" : ""}${formatMillion(
                            blankingSummary.valueDelta / 1_000_000,
                            1
                          )} MSEK latest`
                        )
                      : "–"}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>
        ) : (
          // ===== TRADING – FULLBLEED-KORT + BRED GRAF =====
          <Box
            sx={{
              background: "rgba(15,23,42,0.55)",
              border: "1px solid rgba(148,163,184,0.18)",
              borderRadius: { xs: 0, md: "16px" },
              // fullbleed: ta ut kortet till kanterna
              mx: { xs: -2, sm: -3, md: -4 },
              px: { xs: 2, sm: 3, md: 4 },
              py: { xs: 2, md: 3 },
              display: "flex",
              flexDirection: "column",
              gap: { xs: 2, md: 3 },
              overflow: "visible",
            }}
          >
            <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
              {tradingRanges.map((value) => (
                <Chip
                  key={value}
                  label={`${value}D`}
                  size="small"
                  onClick={() => setTradingRange(value)}
                  sx={{
                    backgroundColor:
                      tradingRange === value
                        ? "rgba(250,204,21,0.28)"
                        : "rgba(148,163,184,0.15)",
                    color:
                      tradingRange === value
                        ? "#f8fafc"
                        : "rgba(226,232,240,0.75)",
                    cursor: "pointer",
                  }}
                />
              ))}
            </Stack>

            <Box sx={{ height: isMobile ? 260 : 320 }}>
              {tradingError ? (
                <Box
                  sx={{
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#f87171",
                  }}
                >
                  <Typography>{tradingError}</Typography>
                </Box>
              ) : tradingSeries.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={tradingSeries}
                    margin={{ top: 10, right: 0, left: 0, bottom: 0 }} // inga sidmarginaler
                  >
                    <CartesianGrid
                      stroke="rgba(148,163,184,0.15)"
                      strokeDasharray="4 4"
                    />
                    <XAxis
                      dataKey="xLabel"
                      tick={{
                        fontSize: isMobile ? 11 : 12,
                        fill: "rgba(148,163,184,0.75)",
                      }}
                      tickLine={false}
                      axisLine={{ stroke: "rgba(148,163,184,0.25)" }}
                      interval={tradingAxisInterval}
                      minTickGap={isMobile ? 8 : 16}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{
                        fontSize: isMobile ? 11 : 12,
                        fill: "rgba(74,222,128,0.85)",
                      }}
                      tickLine={false}
                      axisLine={{ stroke: "rgba(74,222,128,0.35)" }}
                      width={isMobile ? 46 : 56}
                      tickFormatter={(value) => `${formatMillion(value, 0)}`}
                      label={{
                        value: translate("Miljoner aktier", "Million shares"),
                        angle: -90,
                        position: "insideLeft",
                        offset: 12,
                        fill: "rgba(74,222,128,0.85)",
                        fontSize: 12,
                      }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{
                        fontSize: isMobile ? 11 : 12,
                        fill: "rgba(250,204,21,0.85)",
                      }}
                      tickLine={false}
                      axisLine={{ stroke: "rgba(250,204,21,0.35)" }}
                      width={isMobile ? 46 : 56}
                      tickFormatter={(value) => `${value.toFixed(1)}%`}
                    />
                    <RechartsTooltip content={<TradingTooltip />} />
                    <Bar
                      yAxisId="left"
                      dataKey="volumeM"
                      fill="rgba(74,222,128,0.65)"
                      radius={[6, 6, 0, 0]}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="shortSharePct"
                      stroke="#facc15"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="shortShareAvg5"
                      stroke="#a855f7"
                      strokeDasharray="4 4"
                      strokeWidth={2}
                      dot={false}
                    />
                  </ComposedChart>
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
                  <Typography>
                    {translate("Ingen handelsstatistik för vald period.", "No trading data for the selected period.")}
                  </Typography>
                </Box>
              )}
            </Box>

            <Grid container spacing={isMobile ? 2 : 3}>
              <Grid item xs={12} md={3}>
                <Box
                  sx={{
                    background: "rgba(250,204,21,0.12)",
                    borderRadius: "14px",
                    border: "1px solid rgba(250,204,21,0.25)",
                    p: 2.5,
                  }}
                >
                  <Typography
                    sx={{
                      color: "rgba(250,204,21,0.9)",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                    }}
                  >
                    {translate("Senaste handelsdag", "Latest trading day")}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {latestTradingSummary
                      ? latestTradingSummary.shortPercent
                      : "–"}
                  </Typography>
                  <Typography
                    sx={{
                      color: "rgba(148,163,184,0.75)",
                      fontSize: "0.85rem",
                    }}
                  >
                    {latestTradingSummary ? latestTradingSummary.date : "–"}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box
                  sx={{
                    background: "rgba(74,222,128,0.12)",
                    borderRadius: "14px",
                    border: "1px solid rgba(74,222,128,0.3)",
                    p: 2.5,
                  }}
                >
                  <Typography
                    sx={{
                      color: "rgba(74,222,128,0.85)",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                    }}
                  >
                    {translate("Omsatt volym", "Volume traded")}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {latestTradingSummary && latestTradingSummary.volumeM != null
                      ? `${formatMillion(latestTradingSummary.volumeM, 1)} M aktier`
                      : "–"}
                  </Typography>
                  <Typography
                    sx={{
                      color: "rgba(148,163,184,0.75)",
                      fontSize: "0.85rem",
                    }}
                  >
                    {translate(
                      `Netto blankning: ${latestTradingSummary ? latestTradingSummary.netChange : "–"} aktier`,
                      `Net shorting: ${latestTradingSummary ? latestTradingSummary.netChange : "–"} shares`
                    )}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box
                  sx={{
                    background: "rgba(148,163,184,0.12)",
                    borderRadius: "14px",
                    border: "1px solid rgba(148,163,184,0.25)",
                    p: 2.5,
                  }}
                >
                  <Typography
                    sx={{
                      color: "rgba(148,163,184,0.75)",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                    }}
                  >
                    {translate("Periodsnitt blankarandel", "Average short share for period")}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {aggregateShare != null
                      ? formatPercent(aggregateShare, 1)
                      : "–"}
                  </Typography>
                  <Typography
                    sx={{
                      color: "rgba(148,163,184,0.75)",
                      fontSize: "0.85rem",
                    }}
                  >
                    {translate("Andel av volym för vald period", "Share of volume for selected period")}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box
                  sx={{
                    background: "rgba(56,189,248,0.12)",
                    borderRadius: "14px",
                    border: "1px solid rgba(56,189,248,0.25)",
                    p: 2.5,
                  }}
                >
                  <Typography
                    sx={{
                      color: "rgba(56,189,248,0.9)",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                    }}
                  >
                    {translate("Days to cover", "Days to cover")}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {latestTradingSummary && latestTradingSummary.daysToCover != null
                      ? latestTradingSummary.daysToCover.toFixed(2)
                      : "–"}
                  </Typography>
                  <Typography
                    sx={{
                      color: "rgba(148,163,184,0.75)",
                      fontSize: "0.85rem",
                    }}
                  >
                    {translate("Kort/20d volymsnitt", "Shorts / 20d avg volume")}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default ShortIntellegence;
