"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, Chip, Grid, Stack, Typography, Divider } from "@mui/material";
import LocalAtmIcon from "@mui/icons-material/LocalAtm";
import PercentIcon from "@mui/icons-material/Percent";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import SavingsIcon from "@mui/icons-material/Savings";
import RequestQuoteIcon from "@mui/icons-material/RequestQuote";
import InsightsIcon from "@mui/icons-material/Insights";
import { useStockPriceContext } from "@/context/StockPriceContext";
import { useFxRateContext } from "@/context/FxRateContext";
import { useTranslate } from "@/context/LocaleContext";
import { calculateEvolutionOwnershipPerYear, totalSharesData } from "./buybacks/utils";

const DEFAULT_MANDATE_SEK = Number(process.env.NEXT_PUBLIC_BUYBACK_MANDATE_SEK) || null;
const BUYBACKS_ACTIVE = process.env.NEXT_PUBLIC_BUYBACKS_ACTIVE === "1";
const DAY_MS = 24 * 60 * 60 * 1000;
const QUARTER_ORDER = { Q1: 1, Q2: 2, Q3: 3, Q4: 4 };

const sortReports = (reports = []) =>
  [...reports].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return (QUARTER_ORDER[a.quarter] || 0) - (QUARTER_ORDER[b.quarter] || 0);
  });

const formatPct = (value) =>
  Number.isFinite(value) ? `${value.toLocaleString("sv-SE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%` : "—";
const formatSek = (value) =>
  Number.isFinite(value)
    ? `${value.toLocaleString("sv-SE", { maximumFractionDigits: value >= 1_000_000 ? 0 : 1 })} SEK`
    : "—";
const formatSekMillions = (value) =>
  Number.isFinite(value) ? `${(value / 1_000_000).toLocaleString("sv-SE", { maximumFractionDigits: 1 })} MSEK` : "—";

export default function CapitalAllocationCard({ dividendData, buybackData, financialReports, sharesData, buybackCash }) {
  const { stockPrice, marketCap, loading: loadingPrice } = useStockPriceContext();
  const { rate: fxRate } = useFxRateContext();
  const translate = useTranslate();
  const [ownershipFromApi, setOwnershipFromApi] = useState(null);

  const { latestDividend, lastFourReports, ttmEps, ttmOcf, latestReport } = useMemo(() => {
    const reports = sortReports(financialReports?.financialReports || []);
    const lastFour = reports.slice(-4);
    const epsSum = lastFour.reduce((acc, r) => (Number.isFinite(r?.adjustedEarningsPerShare) ? acc + r.adjustedEarningsPerShare : acc), 0);
    const ocfSum = lastFour.reduce((acc, r) => (Number.isFinite(r?.ocfPerShare) ? acc + r.ocfPerShare : acc), 0);

    const dividends = Array.isArray(dividendData?.historicalDividends) ? [...dividendData.historicalDividends] : [];
    dividends.sort((a, b) => new Date(a.date) - new Date(b.date));
    const latest = dividends.length ? dividends[dividends.length - 1] : null;

    return { latestDividend: latest, lastFourReports: lastFour, ttmEps: epsSum || null, ttmOcf: ocfSum || null, latestReport: reports[reports.length - 1] || null };
  }, [dividendData, financialReports]);

  const latestPrice = useMemo(() => {
    const price = stockPrice?.price?.regularMarketPrice?.raw;
    return Number.isFinite(price) ? price : null;
  }, [stockPrice]);

  const sharesOutstanding = useMemo(() => {
    const fallback = totalSharesData[totalSharesData.length - 1]?.totalShares;
    return Number.isFinite(fallback) ? fallback : null;
  }, []);

  const { last12mBuybacksSek, totalBuybacksSek, buybackWindowEnd, buybackWindowStart } = useMemo(() => {
    const rows = Array.isArray(buybackData) ? buybackData : [];
    if (!rows.length) return { last12mBuybacksSek: null, totalBuybacksSek: null, buybackWindowEnd: null, buybackWindowStart: null };
    const parsed = rows
      .map((row) => {
        const date = new Date(row.Datum || row.date || row.Date || row.d);
        const value = Number(row.Transaktionsvärde ?? row.value ?? row.valueSek);
        return { date, value };
      })
      .filter((item) => Number.isFinite(item.value) && !Number.isNaN(item.date?.valueOf()));
    if (!parsed.length) return { last12mBuybacksSek: null, totalBuybacksSek: null, buybackWindowEnd: null, buybackWindowStart: null };
    const latestDate = parsed.reduce((latest, item) => (item.date > latest ? item.date : latest), parsed[0].date);
    const earliestDate = parsed.reduce((earliest, item) => (item.date < earliest ? item.date : earliest), parsed[0].date);
    const cutoff = new Date(latestDate.getTime() - 365 * DAY_MS);
    const total = parsed.reduce((acc, item) => (item.date >= cutoff ? acc + item.value : acc), 0);
    const totalAll = parsed.reduce((acc, item) => acc + item.value, 0);
    return {
      last12mBuybacksSek: total || null,
      totalBuybacksSek: totalAll || null,
      buybackWindowEnd: latestDate,
      buybackWindowStart: earliestDate,
    };
  }, [buybackData]);
  const evolutionOwnershipData = useMemo(() => calculateEvolutionOwnershipPerYear(buybackData || []), [buybackData]);
  const latestEvolutionShares = useMemo(
    () => (evolutionOwnershipData.length ? evolutionOwnershipData[evolutionOwnershipData.length - 1].shares : null),
    [evolutionOwnershipData]
  );
  useEffect(() => {
    let active = true;
    if (!BUYBACKS_ACTIVE) return () => {};
    const load = async () => {
      try {
        const res = await fetch("/api/buybacks/data");
        if (!res.ok) return;
        const json = await res.json();
        const source = Array.isArray(json?.old) ? json.old : null;
        if (!source) return;
        const ownership = calculateEvolutionOwnershipPerYear(source);
        const latest = ownership.length ? ownership[ownership.length - 1].shares : null;
        if (active && Number.isFinite(latest)) setOwnershipFromApi(latest);
      } catch {
        /* ignore API errors */
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);
  const sharesExOwnership = useMemo(() => {
    if (!Number.isFinite(sharesOutstanding)) return null;
    const owned = Number.isFinite(ownershipFromApi)
      ? ownershipFromApi
      : Number.isFinite(latestEvolutionShares)
      ? latestEvolutionShares
      : 0;
    return Math.max(sharesOutstanding - owned, 0);
  }, [sharesOutstanding, latestEvolutionShares, ownershipFromApi]);

  const inferredMarketCap = useMemo(() => {
    if (Number.isFinite(marketCap)) return marketCap;
    if (Number.isFinite(latestPrice) && Number.isFinite(sharesOutstanding)) {
      return latestPrice * sharesOutstanding;
    }
    return null;
  }, [marketCap, latestPrice, sharesOutstanding]);

  const dividendYieldPct = useMemo(() => {
    if (!latestDividend?.dividendPerShare || !latestPrice) return null;
    return (latestDividend.dividendPerShare / latestPrice) * 100;
  }, [latestDividend, latestPrice]);

  const fxRateNumber = useMemo(() => (Number.isFinite(Number(fxRate)) ? Number(fxRate) : null), [fxRate]);
  const ttmEpsSek = useMemo(() => {
    if (!Number.isFinite(ttmEps) || ttmEps <= 0 || !Number.isFinite(fxRateNumber)) return null;
    return ttmEps * fxRateNumber;
  }, [fxRateNumber, ttmEps]);
  const ttmOcfSek = useMemo(() => {
    if (!Number.isFinite(ttmOcf) || ttmOcf <= 0 || !Number.isFinite(fxRateNumber)) return null;
    return ttmOcf * fxRateNumber;
  }, [fxRateNumber, ttmOcf]);

  const payoutRatioPct = useMemo(() => {
    if (!latestDividend?.dividendPerShare || !Number.isFinite(ttmEpsSek) || ttmEpsSek <= 0) return null;
    return (latestDividend.dividendPerShare / ttmEpsSek) * 100;
  }, [latestDividend, ttmEpsSek]);

  const buybackYieldPct = useMemo(() => {
    if (!Number.isFinite(last12mBuybacksSek) || !Number.isFinite(inferredMarketCap) || inferredMarketCap <= 0) return null;
    return (last12mBuybacksSek / inferredMarketCap) * 100;
  }, [last12mBuybacksSek, inferredMarketCap]);

  const shareholderYieldPct = useMemo(() => {
    if (dividendYieldPct == null && buybackYieldPct == null) return null;
    return (dividendYieldPct || 0) + (buybackYieldPct || 0);
  }, [dividendYieldPct, buybackYieldPct]);

  const buybackBudgetSek = useMemo(() => {
    if (!Number.isFinite(buybackCash) || buybackCash <= 0) return null;
    const rate = Number(fxRate);
    if (!Number.isFinite(rate) || rate <= 0) return null;
    return buybackCash * rate;
  }, [buybackCash, fxRate]);

  const mandateRemaining = useMemo(() => {
    const spent = Number.isFinite(totalBuybacksSek) ? totalBuybacksSek : null;
    if (Number.isFinite(buybackBudgetSek) && spent != null) {
      return Math.max(buybackBudgetSek - spent, 0);
    }
    if (!Number.isFinite(DEFAULT_MANDATE_SEK) || !Number.isFinite(last12mBuybacksSek)) return null;
    return Math.max(DEFAULT_MANDATE_SEK - last12mBuybacksSek, 0);
  }, [buybackBudgetSek, last12mBuybacksSek, totalBuybacksSek]);

  const latestQuarterLabel = latestReport ? `${latestReport.year} ${latestReport.quarter}` : "–";
  const buybackWindowLabel = buybackWindowEnd ? new Date(buybackWindowEnd).toLocaleDateString("sv-SE") : "–";
  const buybackWindowStartLabel = buybackWindowStart ? new Date(buybackWindowStart).toLocaleDateString("sv-SE") : "–";

  return (
    <Card
      sx={{
        background: "linear-gradient(135deg, #101725, #0f172a)",
        borderRadius: "14px",
        boxShadow: "0 10px 28px rgba(0,0,0,0.35)",
        border: "1px solid rgba(255,255,255,0.05)",
        color: "#e2e8f0",
      }}
    >
      <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} sx={{ mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#f8fafc" }}>
            {translate("Kapitalallokering", "Capital allocation")}
          </Typography>
          <Chip size="small" label={translate(`Senaste: ${latestQuarterLabel}`, `Latest: ${latestQuarterLabel}`)} sx={{ backgroundColor: "#1e293b", color: "#e2e8f0", borderRadius: "8px" }} />
        </Stack>

        <Grid container spacing={2.5}>
          <Grid item xs={12} md={3}>
            <Stack spacing={1}>
              <Typography variant="body2" sx={{ color: "rgba(226,232,240,0.8)" }}>
                {translate("Utdelningsyield", "Dividend yield")}
              </Typography>
              <Stack direction="row" alignItems="center" spacing={1}>
                <LocalAtmIcon fontSize="small" sx={{ color: "#34d399" }} />
                <Typography variant="h5" sx={{ fontWeight: 800, color: "#ecfeff" }}>
                  {formatPct(dividendYieldPct)}
                </Typography>
              </Stack>
              <Typography variant="caption" sx={{ color: "rgba(226,232,240,0.6)" }}>
                {translate("Pris", "Price")} {loadingPrice ? translate("hämtas…", "loading…") : latestPrice ? `${latestPrice.toLocaleString("sv-SE", { maximumFractionDigits: 2 })} SEK` : "–"} ·
                {translate("DPS", "DPS")} {latestDividend?.dividendPerShare ? `${latestDividend.dividendPerShare.toLocaleString("sv-SE", { maximumFractionDigits: 2 })} SEK` : "–"}
              </Typography>
            </Stack>
          </Grid>

          <Grid item xs={12} md={3}>
            <Stack spacing={1}>
              <Typography variant="body2" sx={{ color: "rgba(226,232,240,0.8)" }}>
                {translate("Payout ratio (TTM)", "Payout ratio (TTM)")}
              </Typography>
              <Stack direction="row" alignItems="center" spacing={1}>
                <PercentIcon fontSize="small" sx={{ color: "#60a5fa" }} />
                <Typography variant="h5" sx={{ fontWeight: 800, color: "#dbeafe" }}>
                  {formatPct(payoutRatioPct)}
                </Typography>
              </Stack>
              <Typography variant="caption" sx={{ color: "rgba(226,232,240,0.6)" }}>
                {translate("EPS TTM", "EPS TTM")} {ttmEpsSek ? `${ttmEpsSek.toLocaleString("sv-SE", { maximumFractionDigits: 2 })} SEK` : "–"}
              </Typography>
            </Stack>
          </Grid>

          <Grid item xs={12} md={3}>
            <Stack spacing={1}>
              <Typography variant="body2" sx={{ color: "rgba(226,232,240,0.8)" }}>
                {translate("Återköpsyield (12m)", "Buyback yield (12m)")}
              </Typography>
              <Stack direction="row" alignItems="center" spacing={1}>
                <TrendingUpIcon fontSize="small" sx={{ color: "#fbbf24" }} />
                <Typography variant="h5" sx={{ fontWeight: 800, color: "#fef9c3" }}>
                  {formatPct(buybackYieldPct)}
                </Typography>
              </Stack>
              <Typography variant="caption" sx={{ color: "rgba(226,232,240,0.6)" }}>
                {last12mBuybacksSek
                  ? translate(`${formatSekMillions(last12mBuybacksSek)} senaste 12m`, `${formatSekMillions(last12mBuybacksSek)} last 12m`)
                  : translate("Ingen data", "No data")}
              </Typography>
            </Stack>
          </Grid>

          <Grid item xs={12} md={3}>
            <Stack spacing={1}>
              <Typography variant="body2" sx={{ color: "rgba(226,232,240,0.8)" }}>
                {translate("Shareholder yield", "Shareholder yield")}
              </Typography>
              <Stack direction="row" alignItems="center" spacing={1}>
                <SavingsIcon fontSize="small" sx={{ color: "#a78bfa" }} />
                <Typography variant="h5" sx={{ fontWeight: 800, color: "#ede9fe" }}>
                  {formatPct(shareholderYieldPct)}
                </Typography>
              </Stack>
              <Typography variant="caption" sx={{ color: "rgba(226,232,240,0.6)" }}>
                {translate("Summerar utdelning + återköp", "Dividend + buyback yield")}
              </Typography>
            </Stack>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2.5, borderColor: "rgba(255,255,255,0.08)" }} />

        <Grid container spacing={2.5}>
          <Grid item xs={12} md={4}>
            <Stack spacing={0.75}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <RequestQuoteIcon fontSize="small" sx={{ color: "#67e8f9" }} />
              <Typography variant="subtitle2" sx={{ color: "#e0f2fe", fontWeight: 700 }}>
                {translate("Kassaflöde per aktie (TTM)", "Cash flow per share (TTM)")}
              </Typography>
              </Stack>
              <Typography variant="h6" sx={{ color: "#e2e8f0" }}>
                {ttmOcfSek ? `${ttmOcfSek.toLocaleString("sv-SE", { maximumFractionDigits: 2 })} SEK` : "–"}
              </Typography>
              <Typography variant="caption" sx={{ color: "rgba(226,232,240,0.6)" }}>
                {translate(
                  "Bygger på rapporterad OCF per kvartal (sista 4)",
                  "Based on reported OCF per quarter (last 4)"
                )}
              </Typography>
            </Stack>
          </Grid>

          <Grid item xs={12} md={4}>
            <Stack spacing={0.75}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <InsightsIcon fontSize="small" sx={{ color: "#f472b6" }} />
              <Typography variant="subtitle2" sx={{ color: "#fdf2f8", fontWeight: 700 }}>
                {translate("Mandat kvar", "Remaining mandate")}
              </Typography>
              </Stack>
              <Typography variant="h6" sx={{ color: "#e2e8f0" }}>
                {mandateRemaining != null
                  ? formatSekMillions(mandateRemaining)
                  : translate("Saknar budget", "Missing budget")}
              </Typography>
              <Typography variant="caption" sx={{ color: "rgba(226,232,240,0.6)" }}>
                {translate(
                  `Draget ${totalBuybacksSek ? formatSekMillions(totalBuybacksSek) : "–"} sedan ${buybackWindowStartLabel}`,
                  `Spent ${totalBuybacksSek ? formatSekMillions(totalBuybacksSek) : "–"} since ${buybackWindowStartLabel}`
                )}
              </Typography>
            </Stack>
          </Grid>

          <Grid item xs={12} md={4}>
            <Stack spacing={0.75}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <PercentIcon fontSize="small" sx={{ color: "#38bdf8" }} />
                <Typography variant="subtitle2" sx={{ color: "#e0f2fe", fontWeight: 700 }}>
                  {translate("Marknadsvärde / aktier", "Market cap / shares")}
                </Typography>
              </Stack>
              <Typography variant="h6" sx={{ color: "#e2e8f0" }}>
                {Number.isFinite(inferredMarketCap) ? formatSekMillions(inferredMarketCap) : "–"}
              </Typography>
              <Typography variant="caption" sx={{ color: "rgba(226,232,240,0.6)" }}>
                {sharesOutstanding
                  ? translate(
                      `Totalt ${(sharesOutstanding / 1_000_000).toLocaleString("sv-SE", { maximumFractionDigits: 1 })}m aktier`,
                      `Total ${(sharesOutstanding / 1_000_000).toLocaleString("sv-SE", { maximumFractionDigits: 1 })}m shares`
                    )
                  : translate("Aktier saknas", "Shares missing")}
                {Number.isFinite(sharesExOwnership) && (
                  <span>
                    {" "}
                    {translate(
                      `· ex EVO ${(sharesExOwnership / 1_000_000).toLocaleString("sv-SE", { maximumFractionDigits: 1 })}m`,
                      `· ex EVO ${(sharesExOwnership / 1_000_000).toLocaleString("sv-SE", { maximumFractionDigits: 1 })}m`
                    )}
                  </span>
                )}
              </Typography>
            </Stack>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
