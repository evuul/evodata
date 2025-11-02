"use client";

import { useMemo, useState } from "react";
import {
  Box,
  Typography,
  Stack,
  Grid,
  TextField,
  Slider,
  ToggleButtonGroup,
  ToggleButton,
  Chip,
  Divider,
} from "@mui/material";
import { useStockPriceContext } from "@/context/StockPriceContext";

const parseNumericInput = (value) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value !== "string") return 0;
  const trimmed = value.trim();
  if (!trimmed) return 0;
  const normalized = trimmed.replace(/\s+/g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatSekCompact = (value) => {
  if (!Number.isFinite(value)) return "–";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000_000) {
    return `${sign}${(abs / 1_000_000_000).toLocaleString("sv-SE", { maximumFractionDigits: 1 })} Mdkr`;
  }
  if (abs >= 1_000_000) {
    return `${sign}${(abs / 1_000_000).toLocaleString("sv-SE", { maximumFractionDigits: 1 })} MSEK`;
  }
  if (abs >= 1_000) {
    return `${sign}${abs.toLocaleString("sv-SE", { maximumFractionDigits: 0 })} SEK`;
  }
  return `${sign}${abs.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SEK`;
};

const formatSharePrice = (value) =>
  Number.isFinite(value) ? `${value.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SEK` : "–";

const formatPercent = (value, { showPlus = true } = {}) => {
  if (!Number.isFinite(value)) return "–";
  const rounded = Number(value.toFixed(1));
  const prefix = rounded > 0 && showPlus ? "+" : "";
  return `${prefix}${rounded}%`;
};

const formatShares = (value) =>
  Number.isFinite(value)
    ? value.toLocaleString("sv-SE", { maximumFractionDigits: 0 })
    : "–";

const pickLatestDividend = (dividendData) => {
  const history = Array.isArray(dividendData?.historicalDividends)
    ? dividendData.historicalDividends
    : [];
  if (history.length) {
    const last = history[history.length - 1];
    return Number(last?.dividendPerShare) || 0;
  }
  const planned = Array.isArray(dividendData?.plannedDividends)
    ? dividendData.plannedDividends
    : [];
  if (planned.length) {
    return Number(planned[0]?.dividendPerShare) || 0;
  }
  return Number(dividendData?.currentDividendPerShare) || 0;
};

const ScenarioCard = ({ title, accent, data }) => (
  <Box
    sx={{
      background: "linear-gradient(135deg, rgba(15,23,42,0.7), rgba(30,41,59,0.72))",
      borderRadius: "16px",
      border: `1px solid ${accent}33`,
      boxShadow: "0 20px 40px rgba(15,23,42,0.35)",
      p: { xs: 2.5, md: 3 },
      display: "flex",
      flexDirection: "column",
      gap: 1.5,
      color: "#f8fafc",
      height: "100%",
    }}
  >
    <Typography variant="overline" sx={{ letterSpacing: 1.5, color: `${accent}cc`, fontWeight: 600 }}>
      {title}
    </Typography>
    <Stack spacing={1}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        {formatSekCompact(data.finalValue)}
      </Typography>
      <Typography variant="body2" sx={{ color: "rgba(226,232,240,0.72)" }}>
        Projekterat portföljvärde inklusive {data.reinvest ? "återinvesterade" : "utbetalda"} utdelningar.
      </Typography>
    </Stack>
    <Grid container spacing={1.5}>
      <Grid item xs={6}>
        <Stack spacing={0.5}>
          <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.75)" }}>
            Total avkastning
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: data.totalReturn >= 0 ? "#34d399" : "#f87171" }}>
            {formatPercent(data.totalReturn)}
          </Typography>
        </Stack>
      </Grid>
      <Grid item xs={6}>
        <Stack spacing={0.5}>
          <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.75)" }}>
            CAGR
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {formatPercent(data.cagr)}
          </Typography>
        </Stack>
      </Grid>
      <Grid item xs={6}>
        <Stack spacing={0.5}>
          <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.75)" }}>
            Totala utdelningar
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {formatSekCompact(data.dividends)}
          </Typography>
        </Stack>
      </Grid>
      <Grid item xs={6}>
        <Stack spacing={0.5}>
          <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.75)" }}>
            Aktier efter perioden
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {formatShares(Number.isFinite(data.finalShares) ? Math.round(data.finalShares) : NaN)}
          </Typography>
        </Stack>
      </Grid>
      {typeof data.buybacks === "number" && Number.isFinite(data.buybacks) && (
        <Grid item xs={6}>
          <Stack spacing={0.5}>
            <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.75)" }}>
              Återköpta aktier (totalt)
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {formatShares(Math.round(data.buybacks))}
            </Typography>
          </Stack>
        </Grid>
      )}
      {typeof data.remainingShares === "number" && Number.isFinite(data.remainingShares) && (
        <Grid item xs={6}>
          <Stack spacing={0.5}>
            <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.75)" }}>
              Utestående efter perioden
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {formatShares(Math.round(data.remainingShares))}
            </Typography>
          </Stack>
        </Grid>
      )}
    </Grid>
    <Stack spacing={0.5}>
      <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.75)" }}>
        Kapitalinsats inkl. sparande
      </Typography>
      <Typography variant="body2" sx={{ color: "rgba(226,232,240,0.75)" }}>
        {formatSekCompact(data.totalInvested)}
      </Typography>
    </Stack>
    {typeof data.buybacks === "number" && Number.isFinite(data.buybacks) && (
      <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.6)" }}>
        Återköp beräknade utifrån dagens uppskattade antal utestående aktier.
      </Typography>
    )}
  </Box>
);

export default function LiveInvestmentCalculator({ dividendData }) {
  const { stockPrice, marketCap, loading: priceLoading, error: priceError } = useStockPriceContext();

  const [shares, setShares] = useState("200");
  const [gav, setGav] = useState("900");
  const [monthlyContribution, setMonthlyContribution] = useState("0");
  const [years, setYears] = useState(5);
  const [growthRate, setGrowthRate] = useState(12);
  const [dividendGrowth, setDividendGrowth] = useState(8);
  const [buybackRate, setBuybackRate] = useState(3);
  const [reinvestMode, setReinvestMode] = useState("reinvest");

  const shareCount = useMemo(() => Math.max(parseNumericInput(shares), 0), [shares]);
  const gavAmount = useMemo(() => Math.max(parseNumericInput(gav), 0), [gav]);
  const monthlyContributionAmount = useMemo(
    () => Math.max(parseNumericInput(monthlyContribution), 0),
    [monthlyContribution]
  );
  const reinvestDividends = reinvestMode === "reinvest";

  const currentPrice = useMemo(() => {
    const live = stockPrice?.price?.regularMarketPrice;
    const liveRaw = Number(live?.raw ?? live);
    if (Number.isFinite(liveRaw) && liveRaw > 0) return liveRaw;
    const close = stockPrice?.price?.previousClose;
    const closeRaw = Number(close?.raw ?? close);
    if (Number.isFinite(closeRaw) && closeRaw > 0) return closeRaw;
    const fallback = Number(dividendData?.currentSharePrice);
    if (Number.isFinite(fallback) && fallback > 0) return fallback;
    return 0;
  }, [stockPrice, dividendData]);

  const latestDividend = useMemo(() => {
    const value = pickLatestDividend(dividendData);
    return Number.isFinite(value) && value > 0 ? value : 0;
  }, [dividendData]);

  const outstandingShares = useMemo(() => {
    const cap = Number(marketCap);
    const price = currentPrice > 0 ? currentPrice : gavAmount > 0 ? gavAmount : 0;
    if (Number.isFinite(cap) && cap > 0 && price > 0) {
      return Math.round(cap / price);
    }
    const fallback = Number(dividendData?.currentSharesOutstanding);
    if (Number.isFinite(fallback) && fallback > 0) {
      return Math.round(fallback);
    }
    return null;
  }, [marketCap, currentPrice, gavAmount, dividendData]);

  const priceForSimulation = useMemo(() => {
    if (currentPrice > 0) return currentPrice;
    if (gavAmount > 0) return gavAmount;
    return 1;
  }, [currentPrice, gavAmount]);

  const initialInvestment = shareCount * gavAmount;
  const yearlyContribution = monthlyContributionAmount * 12;
  const totalPlannedContributions = yearlyContribution * years;
  const capitalOutlay = initialInvestment + totalPlannedContributions;

  const dividendYield = currentPrice > 0 && latestDividend > 0 ? (latestDividend / currentPrice) * 100 : null;

  const currentValue = shareCount * currentPrice;
  const gain = currentValue - initialInvestment;
  const gainPercent = initialInvestment > 0 ? (gain / initialInvestment) * 100 : null;
  const breakEvenDiff = currentPrice - gavAmount;

  const estimatedAnnualBuybacks = useMemo(() => {
    if (!Number.isFinite(outstandingShares) || outstandingShares <= 0) return null;
    const annualShares = outstandingShares * (Math.max(buybackRate, 0) / 100);
    return annualShares > 0 ? Math.round(annualShares) : null;
  }, [outstandingShares, buybackRate]);

  const scenarios = useMemo(() => {
    if (!(shareCount > 0) || years <= 0) {
      return {
        base: null,
        bull: null,
        bear: null,
      };
    }

    const runScenario = (annualGrowthPercent, dividendAdjust = 0) => {
      const annualGrowth = Math.max(annualGrowthPercent, -95) / 100;
      const dividendGrowthRate = Math.max(dividendGrowth + dividendAdjust, -95) / 100;
      const effectiveBuyback = Math.min(Math.max(buybackRate, 0), 25) / 100;
      const buybackMultiplier = 1 / Math.max(1 - effectiveBuyback, 0.01);
      let sharesHeld = shareCount;
      let price = priceForSimulation;
      let dividendPerShare = latestDividend;
      let aggregatedDividends = 0;
      let contributions = 0;
      let outstanding = Number.isFinite(outstandingShares) && outstandingShares > 0 ? outstandingShares : null;
      let totalBuybackShares = 0;

      for (let year = 1; year <= years; year += 1) {
        price *= (1 + annualGrowth) * buybackMultiplier;
        dividendPerShare *= (1 + dividendGrowthRate) * buybackMultiplier;

        if (Number.isFinite(outstanding) && effectiveBuyback > 0) {
          const newOutstanding = Math.max(outstanding * (1 - effectiveBuyback), 1);
          totalBuybackShares += Math.max(outstanding - newOutstanding, 0);
          outstanding = newOutstanding;
        }

        if (yearlyContribution > 0 && price > 0) {
          const addedShares = yearlyContribution / price;
          sharesHeld += addedShares;
          contributions += yearlyContribution;
        }

        const dividendCash = sharesHeld * dividendPerShare;
        aggregatedDividends += dividendCash;
        if (reinvestDividends && price > 0) {
          sharesHeld += dividendCash / price;
        }
      }

      const finalValue = sharesHeld * price;
      const finalWithDividends = reinvestDividends ? finalValue : finalValue + aggregatedDividends;
      const totalInvested = initialInvestment + contributions;
      const absoluteReturn = finalWithDividends - totalInvested;
      const totalReturn = totalInvested > 0 ? (absoluteReturn / totalInvested) * 100 : null;
      const cagr =
        totalInvested > 0 && years > 0 && finalWithDividends > 0
          ? (Math.pow(finalWithDividends / totalInvested, 1 / years) - 1) * 100
          : null;

      return {
        finalValue: finalWithDividends,
        finalShares: sharesHeld,
        totalReturn,
        cagr,
        dividends: aggregatedDividends,
        totalInvested,
        reinvest: reinvestDividends,
        buybacks: Number.isFinite(totalBuybackShares) && totalBuybackShares > 0 ? totalBuybackShares : null,
        remainingShares: Number.isFinite(outstanding) && outstanding > 0 ? outstanding : null,
      };
    };

    return {
      base: runScenario(growthRate, 0),
      bull: runScenario(growthRate + 5, 3),
      bear: runScenario(Math.max(growthRate - 5, 0), -3),
    };
  }, [
    dividendGrowth,
    buybackRate,
    growthRate,
    initialInvestment,
    latestDividend,
    priceForSimulation,
    reinvestDividends,
    shareCount,
    yearlyContribution,
    years,
    outstandingShares,
  ]);

  const baseScenario = scenarios.base;

  const summaryCards = [
    {
      key: "current",
      title: "Nuvarande värde",
      value: formatSekCompact(currentValue),
      subtitle:
        shareCount > 0 && currentPrice > 0
          ? `${shareCount.toLocaleString("sv-SE")} aktier × ${formatSharePrice(currentPrice)}`
          : "Ange antal aktier och GAV.",
      accent: "rgba(56,189,248,0.35)",
    },
    {
      key: "result",
      title: "Resultat vs GAV",
      value: formatSekCompact(gain),
      subtitle: gainPercent != null ? formatPercent(gainPercent) : "–",
      accent: gain >= 0 ? "rgba(52,211,153,0.35)" : "rgba(248,113,113,0.35)",
    },
    {
      key: "yield",
      title: "Direktavkastning",
      value: formatPercent(dividendYield),
      subtitle: latestDividend > 0 ? `${formatSharePrice(latestDividend)} i utdelning per aktie` : "Ingen utdelning registrerad",
      accent: "rgba(192,132,252,0.35)",
    },
    {
      key: "projection",
      title: "Bas-scenario",
      value: formatSekCompact(baseScenario?.finalValue),
      subtitle:
        baseScenario && Number.isFinite(baseScenario.totalReturn)
          ? `${years} år • ${formatPercent(baseScenario.totalReturn)} total avkastning`
          : `${years} år`,
      accent: "rgba(251,191,36,0.35)",
    },
  ];

  const scenarioCards = [
    {
      key: "bear",
      title: "Bear-case (−5%)",
      accent: "#f87171",
      data: scenarios.bear ?? {
        finalValue: 0,
        totalReturn: null,
        cagr: null,
        dividends: 0,
        finalShares: null,
        totalInvested: capitalOutlay,
        reinvest: reinvestDividends,
        buybacks: null,
        remainingShares: null,
      },
    },
    {
      key: "base",
      title: "Bas-scenario",
      accent: "#38bdf8",
      data: baseScenario ?? {
        finalValue: 0,
        totalReturn: null,
        cagr: null,
        dividends: 0,
        finalShares: null,
        totalInvested: capitalOutlay,
        reinvest: reinvestDividends,
        buybacks: null,
        remainingShares: null,
      },
    },
    {
      key: "bull",
      title: "Bull-case (+5%)",
      accent: "#34d399",
      data: scenarios.bull ?? {
        finalValue: 0,
        totalReturn: null,
        cagr: null,
        dividends: 0,
        finalShares: null,
        totalInvested: capitalOutlay,
        reinvest: reinvestDividends,
        buybacks: null,
        remainingShares: null,
      },
    },
  ];

  return (
    <Box
      sx={{
        background: "linear-gradient(135deg, #0f172a, #111c2f)",
        borderRadius: { xs: 0, md: "18px" },              // fullbleed hörn på mobil
        border: "1px solid rgba(148,163,184,0.18)",
        boxShadow: "0 28px 60px rgba(15,23,42,0.55)",
        color: "#f8fafc",
        width: "100%",
        maxWidth: "1200px",
        // fullbleed horisontellt: matcha sidans padding (t.ex. p={2|3|4})
        mx: { xs: -2, sm: -3, md: -4 },
        px: { xs: 2, sm: 3, md: 4 },
        my: 2,
        py: { xs: 3, md: 4 },
        display: "flex",
        flexDirection: "column",
        gap: { xs: 3, md: 3.5 },
      }}
    >
      <Stack spacing={1.5}>
        <Typography variant="overline" sx={{ letterSpacing: 2, color: "rgba(148,163,184,0.72)", fontWeight: 700 }}>
          Live Investment
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Investment Studio
        </Typography>
        <Typography variant="body1" sx={{ color: "rgba(226,232,240,0.72)", maxWidth: 720 }}>
          Kalkylera scenarier med livekurs, prognoser för tillväxt, utdelningar och månadssparande. Resultaten uppdateras i realtid när du ändrar antaganden.
        </Typography>
      </Stack>

      <Stack direction="row" spacing={1.5} flexWrap="wrap">
        <Chip
          label={
            priceLoading && !priceError
              ? "Livekurs hämtas…"
              : `Livekurs: ${formatSharePrice(currentPrice || gavAmount || 0)}`
          }
          sx={{
            backgroundColor: "rgba(56,189,248,0.2)",
            color: "#bae6fd",
            borderRadius: "999px",
            border: "1px solid rgba(56,189,248,0.35)",
          }}
        />
        <Chip
          label={`GAV: ${formatSharePrice(gavAmount)}`}
          sx={{
            backgroundColor: "rgba(192,132,252,0.18)",
            color: "#e9d5ff",
            borderRadius: "999px",
            border: "1px solid rgba(192,132,252,0.35)",
          }}
        />
        <Chip
          label={`Planerat sparande: ${formatSekCompact(totalPlannedContributions)}`}
          sx={{
            backgroundColor: "rgba(244,114,182,0.18)",
            color: "#fbcfe8",
            borderRadius: "999px",
            border: "1px solid rgba(244,114,182,0.3)",
          }}
        />
        <Chip
          label={`Återköp: ${buybackRate.toFixed(1)}%/år`}
          sx={{
            backgroundColor: "rgba(45,212,191,0.18)",
            color: "#5eead4",
            borderRadius: "999px",
            border: "1px solid rgba(45,212,191,0.3)",
          }}
        />
        {Number.isFinite(estimatedAnnualBuybacks) && (
          <Chip
            label={`≈ ${formatShares(estimatedAnnualBuybacks)} aktier/år`}
            sx={{
              backgroundColor: "rgba(16,185,129,0.18)",
              color: "#bbf7d0",
              borderRadius: "999px",
              border: "1px solid rgba(16,185,129,0.3)",
            }}
          />
        )}
        <Chip
          label={`Break-even diff: ${formatSharePrice(breakEvenDiff)}`}
          sx={{
            backgroundColor: "rgba(254,215,170,0.18)",
            color: "#fed7aa",
            borderRadius: "999px",
            border: "1px solid rgba(254,215,170,0.35)",
          }}
        />
      </Stack>

      <Grid container spacing={{ xs: 3, md: 4 }}>
        <Grid item xs={12} lg={5}>
          <Box
            sx={{
              background: "rgba(15,23,42,0.55)",
              borderRadius: "16px",
              border: "1px solid rgba(148,163,184,0.18)",
              p: { xs: 2.5, md: 3 },
              display: "flex",
              flexDirection: "column",
              gap: 2.5,
            }}
          >
            <Stack spacing={2}>
              <Typography variant="subtitle2" sx={{ color: "rgba(226,232,240,0.85)", fontWeight: 700, letterSpacing: 0.5 }}>
                Utgångsläge
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Antal aktier"
                    type="number"
                    value={shares}
                    onChange={(event) => setShares(event.target.value)}
                    fullWidth
                    InputLabelProps={{ sx: { color: "rgba(226,232,240,0.65)" } }}
                    InputProps={{
                      sx: {
                        color: "#f8fafc",
                        backgroundColor: "rgba(15,23,42,0.6)",
                        borderRadius: "12px",
                      },
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="GAV (SEK)"
                    type="number"
                    value={gav}
                    onChange={(event) => setGav(event.target.value)}
                    fullWidth
                    InputLabelProps={{ sx: { color: "rgba(226,232,240,0.65)" } }}
                    InputProps={{
                      sx: {
                        color: "#f8fafc",
                        backgroundColor: "rgba(15,23,42,0.6)",
                        borderRadius: "12px",
                      },
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Månadssparande (SEK)"
                    type="number"
                    value={monthlyContribution}
                    onChange={(event) => setMonthlyContribution(event.target.value)}
                    fullWidth
                    InputLabelProps={{ sx: { color: "rgba(226,232,240,0.65)" } }}
                    InputProps={{
                      sx: {
                        color: "#f8fafc",
                        backgroundColor: "rgba(15,23,42,0.6)",
                        borderRadius: "12px",
                      },
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Stack spacing={1}>
                    <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.75)", fontWeight: 600 }}>
                      Tidshorisont: {years} år
                    </Typography>
                    <Slider
                      value={years}
                      onChange={(_, value) => setYears(Array.isArray(value) ? value[0] : value)}
                      min={1}
                      max={20}
                      step={1}
                      sx={{ color: "#38bdf8" }}
                    />
                  </Stack>
                </Grid>
              </Grid>
            </Stack>

            <Divider sx={{ borderColor: "rgba(148,163,184,0.15)" }} />

            <Stack spacing={2.5}>
              <Typography variant="subtitle2" sx={{ color: "rgba(226,232,240,0.85)", fontWeight: 700, letterSpacing: 0.5 }}>
                Antaganden
              </Typography>
              <Stack spacing={1}>
                <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.75)", fontWeight: 600 }}>
                  Årlig vinsttillväxt: {growthRate}%
                </Typography>
                <Slider
                  value={growthRate}
                  onChange={(_, value) => setGrowthRate(Array.isArray(value) ? value[0] : value)}
                  min={0}
                  max={25}
                  step={0.5}
                  sx={{ color: "#34d399" }}
                />
              </Stack>
              <Stack spacing={1}>
                <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.75)", fontWeight: 600 }}>
                  Utdelningstillväxt: {dividendGrowth}%
                </Typography>
                <Slider
                  value={dividendGrowth}
                  onChange={(_, value) => setDividendGrowth(Array.isArray(value) ? value[0] : value)}
                  min={0}
                  max={20}
                  step={0.5}
                  sx={{ color: "#fbbf24" }}
                />
              </Stack>
              <Stack spacing={1}>
                <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.75)", fontWeight: 600 }}>
                  Återköp & makulering: {buybackRate.toFixed(1)}%
                </Typography>
                <Slider
                  value={buybackRate}
                  onChange={(_, value) => setBuybackRate(Array.isArray(value) ? value[0] : value)}
                  min={0}
                  max={6}
                  step={0.25}
                  sx={{ color: "#14b8a6" }}
                />
              </Stack>
              <Stack spacing={1.5}>
                <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.75)", fontWeight: 600 }}>
                  Hantering av utdelningar
                </Typography>
                <ToggleButtonGroup
                  exclusive
                  value={reinvestMode}
                  onChange={(_, value) => value && setReinvestMode(value)}
                  sx={{
                    backgroundColor: "rgba(15,23,42,0.6)",
                    borderRadius: "12px",
                    p: 0.5,
                    alignSelf: "flex-start",
                  }}
                >
                  <ToggleButton
                    value="reinvest"
                    sx={{
                      textTransform: "none",
                      color: "rgba(226,232,240,0.7)",
                      border: 0,
                      borderRadius: "10px!important",
                      px: 2.5,
                      "&.Mui-selected": {
                        color: "#f8fafc",
                        backgroundColor: "rgba(56,189,248,0.35)",
                      },
                    }}
                  >
                    Återinvestera
                  </ToggleButton>
                  <ToggleButton
                    value="cash"
                    sx={{
                      textTransform: "none",
                      color: "rgba(226,232,240,0.7)",
                      border: 0,
                      borderRadius: "10px!important",
                      px: 2.5,
                      "&.Mui-selected": {
                        color: "#f8fafc",
                        backgroundColor: "rgba(244,114,182,0.35)",
                      },
                    }}
                  >
                    Ta ut
                  </ToggleButton>
                </ToggleButtonGroup>
              </Stack>
            </Stack>
          </Box>
        </Grid>

        <Grid item xs={12} lg={7}>
          <Stack spacing={3}>
            <Grid container spacing={2}>
              {summaryCards.map((card) => (
                <Grid key={card.key} item xs={12} sm={6}>
                  <Box
                    sx={{
                      background: "rgba(15,23,42,0.55)",
                      borderRadius: "16px",
                      border: `1px solid ${card.accent}`,
                      p: { xs: 2, md: 2.5 },
                      display: "flex",
                      flexDirection: "column",
                      gap: 1,
                      height: "100%",
                    }}
                  >
                    <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.75)", fontWeight: 600 }}>
                      {card.title}
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                      {card.value}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "rgba(226,232,240,0.7)" }}>
                      {card.subtitle}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>

            <Divider sx={{ borderColor: "rgba(148,163,184,0.12)" }} />

            <Grid container spacing={2.5}>
              {scenarioCards.map((card) => (
                <Grid key={card.key} item xs={12} md={4}>
                  <ScenarioCard title={card.title} accent={card.accent} data={card.data} />
                </Grid>
              ))}
            </Grid>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}