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
import { useTranslate } from "@/context/LocaleContext";

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

const ScenarioCard = ({ title, accent, data, compact = false }) => {
  const translate = useTranslate();
  const projectionText = data.reinvest
    ? translate(
        "Projekterat portföljvärde inklusive återinvesterade utdelningar.",
        "Projected portfolio value including reinvested dividends."
      )
    : translate(
        "Projekterat portföljvärde inklusive utbetalda utdelningar.",
        "Projected portfolio value including dividends paid out."
      );
  const padding = compact ? { xs: 1.8, md: 2 } : { xs: 2.5, md: 3 };
  const titleVariant = compact ? "caption" : "overline";
  const valueVariant = compact ? "h6" : "h5";
  return (
    <Box
      sx={{
        background: "linear-gradient(135deg, rgba(15,23,42,0.7), rgba(30,41,59,0.72))",
        borderRadius: compact ? "14px" : "16px",
        border: "1px solid rgba(148,163,184,0.18)",
        boxShadow: "0 20px 40px rgba(15,23,42,0.35)",
        p: padding,
        display: "flex",
        flexDirection: "column",
        gap: compact ? 1 : 1.5,
        color: "#f8fafc",
        height: "100%",
      }}
    >
      <Typography variant={titleVariant} sx={{ letterSpacing: 1.2, color: `${accent}cc`, fontWeight: 600 }}>
        {title}
      </Typography>
      <Stack spacing={1}>
        <Typography variant={valueVariant} sx={{ fontWeight: 700 }}>
          {formatSekCompact(data.finalValue)}
        </Typography>
        <Typography variant="body2" sx={{ color: "rgba(226,232,240,0.72)" }}>
          {projectionText}
        </Typography>
      </Stack>
      <Grid container spacing={1.5}>
        <Grid item xs={6}>
          <Stack spacing={0.5}>
            <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.75)" }}>
              {translate("Total avkastning", "Total return")}
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
              {translate("Totala utdelningar", "Total dividends")}
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {formatSekCompact(data.dividends)}
            </Typography>
          </Stack>
        </Grid>
        <Grid item xs={6}>
          <Stack spacing={0.5}>
            <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.75)" }}>
              {translate("Aktier efter perioden", "Shares after period")}
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
                {translate("Återköpta aktier (totalt)", "Total shares repurchased")}
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
                {translate("Utestående efter perioden", "Shares outstanding after period")}
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
          {translate("Kapitalinsats inkl. sparande", "Capital invested incl. savings")}
        </Typography>
        <Typography variant="body2" sx={{ color: "rgba(226,232,240,0.75)" }}>
          {formatSekCompact(data.totalInvested)}
        </Typography>
      </Stack>
      {typeof data.buybacks === "number" && Number.isFinite(data.buybacks) && (
        <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.6)" }}>
          {translate(
            "Återköp beräknade utifrån dagens uppskattade antal utestående aktier.",
            "Buybacks estimated using today’s outstanding share count."
          )}
        </Typography>
      )}
    </Box>
  );
};

export default function LiveInvestmentCalculator({ dividendData }) {
  const translate = useTranslate();
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
      const monthlyGrowth = Math.pow(1 + annualGrowth, 1 / 12) - 1;
      const monthlyDividendGrowth = Math.pow(1 + dividendGrowthRate, 1 / 12) - 1;
      const monthlyBuyback = 1 - Math.pow(1 - effectiveBuyback, 1 / 12);
      let sharesHeld = shareCount;
      let price = priceForSimulation;
      let dividendPerShare = latestDividend;
      let aggregatedDividends = 0;
      let contributions = 0;
      let outstanding = Number.isFinite(outstandingShares) && outstandingShares > 0 ? outstandingShares : null;
      let totalBuybackShares = 0;

      const totalMonths = Math.max(years * 12, 1);
      for (let month = 1; month <= totalMonths; month += 1) {
        price *= 1 + monthlyGrowth;
        dividendPerShare *= 1 + monthlyDividendGrowth;

        if (Number.isFinite(outstanding) && monthlyBuyback > 0) {
          const newOutstanding = Math.max(outstanding * (1 - monthlyBuyback), 1);
          totalBuybackShares += Math.max(outstanding - newOutstanding, 0);
          outstanding = newOutstanding;
        }

        if (monthlyContributionAmount > 0 && price > 0) {
          const addedShares = monthlyContributionAmount / price;
          sharesHeld += addedShares;
          contributions += monthlyContributionAmount;
        }

        const dividendCash = sharesHeld * (dividendPerShare / 12);
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
      bear: runScenario(growthRate - 5, -3),
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
    monthlyContributionAmount,
    years,
    outstandingShares,
  ]);

  const baseScenario = scenarios.base;

  const summaryCards = useMemo(() => {
    const currentSubtitle =
      shareCount > 0 && currentPrice > 0
        ? translate(
            `${shareCount.toLocaleString("sv-SE")} aktier × ${formatSharePrice(currentPrice)}`,
            `${shareCount.toLocaleString("sv-SE")} shares × ${formatSharePrice(currentPrice)}`
          )
        : translate("Ange antal aktier och GAV.", "Enter number of shares and cost basis.");
    const yieldSubtitle =
      latestDividend > 0
        ? translate(
            `${formatSharePrice(latestDividend)} i utdelning per aktie`,
            `${formatSharePrice(latestDividend)} dividend per share`
          )
        : translate("Ingen utdelning registrerad", "No dividend recorded.");
    const projectionSubtitle =
      baseScenario && Number.isFinite(baseScenario.totalReturn)
        ? translate(
            `${years} år • ${formatPercent(baseScenario.totalReturn)} total avkastning`,
            `${years} years • ${formatPercent(baseScenario.totalReturn)} total return`
          )
        : translate(`${years} år`, `${years} years`);
    return [
      {
        key: "current",
        title: translate("Nuvarande värde", "Current value"),
        value: formatSekCompact(currentValue),
        subtitle: currentSubtitle,
        accent: "rgba(56,189,248,0.35)",
      },
      {
        key: "result",
        title: translate("Resultat vs GAV", "Performance vs cost basis"),
        value: formatSekCompact(gain),
        subtitle: gainPercent != null ? formatPercent(gainPercent) : "–",
        accent: gain >= 0 ? "rgba(52,211,153,0.35)" : "rgba(248,113,113,0.35)",
      },
      {
        key: "yield",
        title: translate("Direktavkastning", "Dividend yield"),
        value: formatPercent(dividendYield),
        subtitle: yieldSubtitle,
        accent: "rgba(192,132,252,0.35)",
      },
      {
        key: "projection",
        title: translate("Bas-scenario", "Base scenario"),
        value: formatSekCompact(baseScenario?.finalValue),
        subtitle: projectionSubtitle,
        accent: "rgba(251,191,36,0.35)",
      },
    ];
  }, [translate, shareCount, currentPrice, gavAmount, gain, gainPercent, dividendYield, latestDividend, baseScenario, years]);

  const scenarioCards = useMemo(
    () => [
      {
        key: "bear",
        title: translate("Bear-case (−5%)", "Bear case (−5%)"),
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
        title: translate("Bas-scenario", "Base scenario"),
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
        title: translate("Bull-case (+5%)", "Bull case (+5%)"),
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
    ],
    [translate, scenarios, capitalOutlay, reinvestDividends, baseScenario]
  );

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
          {translate("Kalkylator", "Calculator")}
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          {translate("Investeringskalkylator", "Investment calculator")}
        </Typography>
        <Typography variant="body1" sx={{ color: "rgba(226,232,240,0.72)", maxWidth: 720 }}>
          {translate(
            "Kalkylera scenarier med livekurs, prognoser för tillväxt, utdelningar och månadssparande. Resultaten uppdateras i realtid när du ändrar antaganden.",
            "Model scenarios with the live price, growth, dividends, and monthly savings. Results update instantly as you tweak assumptions."
          )}
        </Typography>
      </Stack>

      <Stack direction="row" spacing={1.5} flexWrap="wrap">
        <Chip
          label={
            priceLoading && !priceError
              ? translate("Livekurs hämtas…", "Fetching live price…")
              : translate(
                  `Livekurs: ${formatSharePrice(currentPrice || gavAmount || 0)}`,
                  `Live price: ${formatSharePrice(currentPrice || gavAmount || 0)}`
                )
          }
          sx={{
            backgroundColor: "rgba(56,189,248,0.2)",
            color: "#bae6fd",
            borderRadius: "999px",
            border: "1px solid rgba(56,189,248,0.35)",
          }}
        />
        <Chip
          label={translate(`GAV: ${formatSharePrice(gavAmount)}`, `Cost basis: ${formatSharePrice(gavAmount)}`)}
          sx={{
            backgroundColor: "rgba(192,132,252,0.18)",
            color: "#e9d5ff",
            borderRadius: "999px",
            border: "1px solid rgba(192,132,252,0.35)",
          }}
        />
        <Chip
          label={translate(
            `Planerat sparande: ${formatSekCompact(totalPlannedContributions)}`,
            `Planned savings: ${formatSekCompact(totalPlannedContributions)}`
          )}
          sx={{
            backgroundColor: "rgba(244,114,182,0.18)",
            color: "#fbcfe8",
            borderRadius: "999px",
            border: "1px solid rgba(244,114,182,0.3)",
          }}
        />
        <Chip
          label={translate(`Återköp: ${buybackRate.toFixed(1)}%/år`, `Buybacks: ${buybackRate.toFixed(1)}%/yr`)}
          sx={{
            backgroundColor: "rgba(45,212,191,0.18)",
            color: "#5eead4",
            borderRadius: "999px",
            border: "1px solid rgba(45,212,191,0.3)",
          }}
        />
        {Number.isFinite(estimatedAnnualBuybacks) && (
          <Chip
            label={translate(
              `≈ ${formatShares(estimatedAnnualBuybacks)} aktier/år`,
              `≈ ${formatShares(estimatedAnnualBuybacks)} shares/yr`
            )}
            sx={{
              backgroundColor: "rgba(16,185,129,0.18)",
              color: "#bbf7d0",
              borderRadius: "999px",
              border: "1px solid rgba(16,185,129,0.3)",
            }}
          />
        )}
        <Chip
          label={translate(
            `Break-even diff: ${formatSharePrice(breakEvenDiff)}`,
            `Break-even diff: ${formatSharePrice(breakEvenDiff)}`
          )}
          sx={{
            backgroundColor: "rgba(254,215,170,0.18)",
            color: "#fed7aa",
            borderRadius: "999px",
            border: "1px solid rgba(254,215,170,0.35)",
          }}
        />
      </Stack>

      <Grid container spacing={{ xs: 3, md: 4 }}>
        <Grid item xs={12} lg={7}>
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
                {translate("Utgångsläge", "Starting point")}
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label={translate("Antal aktier", "Number of shares")}
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
                    label={translate("GAV (SEK)", "Cost basis (SEK)")}
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
                    label={translate("Månadssparande (SEK)", "Monthly contribution (SEK)")}
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
                      {translate(`Tidshorisont: ${years} år`, `Time horizon: ${years} years`)}
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
                {translate("Antaganden", "Assumptions")}
              </Typography>
              <Stack spacing={1}>
                <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.75)", fontWeight: 600 }}>
                  {translate(`Årlig vinsttillväxt: ${growthRate}%`, `Annual profit growth: ${growthRate}%`)}
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
                  {translate(`Utdelningstillväxt: ${dividendGrowth}%`, `Dividend growth: ${dividendGrowth}%`)}
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
                  {translate(
                    `Återköp & makulering: ${buybackRate.toFixed(1)}%`,
                    `Buybacks & cancellations: ${buybackRate.toFixed(1)}%`
                  )}
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
                  {translate("Hantering av utdelningar", "Dividend handling")}
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
                    {translate("Återinvestera", "Reinvest")}
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
                    {translate("Ta ut", "Pay out")}
                  </ToggleButton>
                </ToggleButtonGroup>
              </Stack>
            </Stack>
          </Box>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Stack spacing={3}>
            <Stack spacing={2}>
              {scenarioCards.map((card) => (
                <ScenarioCard
                  key={card.key}
                  title={card.title}
                  accent={card.accent}
                  data={card.data}
                  compact
                />
              ))}
            </Stack>

            <Divider sx={{ borderColor: "rgba(148,163,184,0.12)" }} />

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
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
