'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Stack,
  Grid,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
  Divider,
  LinearProgress,
} from '@mui/material';
import useMediaQuery from '@/lib/useMuiMediaQuery';
import { useStockPriceContext } from '@/context/StockPriceContext';
import { useFxRateContext } from '@/context/FxRateContext';
import { useTheme } from '@mui/material/styles';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { parseJsonResponse } from '@/lib/apiResponse';
import OwnershipView from './buybacks/OwnershipView';
import TotalSharesView from './buybacks/TotalSharesView';
import HistoryView from './buybacks/HistoryView';
import ReturnsView from './buybacks/ReturnsView';
import {
  buybackDataForGraphDaily as buildDaily,
  buybackDataForGraphWeekly as buildWeekly,
  buybackDataForGraphMonthly as buildMonthly,
  buybackDataForGraphYearly as buildYearly,
  getLastWeekBuybacks,
  getPreviousWeekBuybacks,
  calculateAverageDailyBuyback,
  calculateEstimatedCompletion,
  calculateBuybackStats,
  calculateEvolutionOwnershipPerYear,
  calculateCancelledShares,
  calculateShareholderReturns,
  totalSharesData,
} from './buybacks/utils';

const TIME_OPTIONS = [
  { value: 'weekly', label: 'Veckor' },
  { value: 'daily', label: 'Dagar' },
  { value: 'monthly', label: 'Månader' },
  { value: 'yearly', label: 'År' },
];
const SUB_VIEWS = [
  { value: 'overview', label: 'Översikt' },
  { value: 'ownership', label: 'Evolutions ägande' },
  { value: 'total', label: 'Totala aktier' },
  { value: 'history', label: 'Återköpshistorik' },
  { value: 'returns', label: 'Återinvestering' },
];

const fmtNum = (n) => (Number.isFinite(n) ? n.toLocaleString('sv-SE') : '–');
const fmtThousands = (n, digits = 1) =>
  Number.isFinite(n) ? n.toLocaleString('sv-SE', { maximumFractionDigits: digits }) : '–';

const fmtCurrency = (value) =>
  Number.isFinite(value)
    ? value.toLocaleString('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: value >= 1_000_000 ? 0 : 2 })
    : '–';

const fmtEuroMillions = (value) =>
  Number.isFinite(value) ? `${(value / 1_000_000).toLocaleString('sv-SE', { maximumFractionDigits: 1 })} M€` : '–';

const toLabel = (datum) => {
  if (!datum) return '';
  if (/^\d{4}-V\d{2}$/.test(datum)) return datum.replace('-V', ' v');
  if (/^\d{4}-\d{2}-\d{2}$/.test(datum)) return datum.slice(5);
  if (/^\d{4}-\d{2}$/.test(datum)) return datum;
  return String(datum);
};

export default function LiveStockBuyBackInfo({ buybackCash = 0, dividendData }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { marketCap, loading: loadingPrice, stockPrice } = useStockPriceContext();
  const { rate: fxRate } = useFxRateContext();

  const [subView, setSubView] = useState('overview');
  const [viewMode, setViewMode] = useState('weekly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [oldData, setOldData] = useState([]);
  const [curData, setCurData] = useState([]);
  const [lastFetchedAt, setLastFetchedAt] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/buybacks/data', { cache: 'no-store' });
      const json = await parseJsonResponse(res, { requireOk: false });
      setOldData(Array.isArray(json?.old) ? json.old : []);
      setCurData(Array.isArray(json?.current) ? json.current : []);
      setLastFetchedAt(json?.updatedAt || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setCurData([]);
      setLastFetchedAt(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const { weekNow, weekPrev } = useMemo(() => {
    const thisWeek = getLastWeekBuybacks(curData);
    const prevWeek = getPreviousWeekBuybacks(curData, thisWeek.periodStart);
    return { weekNow: thisWeek, weekPrev: prevWeek };
  }, [curData]);

  const avgDaily = useMemo(() => calculateAverageDailyBuyback(curData), [curData]);
  const buybackBudgetSek = useMemo(() => {
    if (!Number.isFinite(buybackCash) || buybackCash <= 0) return null;
    const rate = Number(fxRate);
    if (!Number.isFinite(rate) || rate <= 0) return null;
    return buybackCash * rate;
  }, [buybackCash, fxRate]);
  const stats = useMemo(() => calculateBuybackStats(curData), [curData]);
  const totalSpent = useMemo(
    () => (curData || []).filter((row) => Number(row?.Antal_aktier) > 0).reduce((sum, row) => sum + (row?.Transaktionsvärde || 0), 0),
    [curData]
  );
  const remainingCash = useMemo(
    () => (Number.isFinite(buybackBudgetSek) ? Math.max(buybackBudgetSek - totalSpent, 0) : null),
    [buybackBudgetSek, totalSpent]
  );
  const est = useMemo(
    () =>
      Number.isFinite(remainingCash) && remainingCash > 0
        ? calculateEstimatedCompletion(remainingCash, curData)
        : null,
    [remainingCash, curData]
  );
  const cashUsagePercent =
    Number.isFinite(buybackBudgetSek) && buybackBudgetSek > 0 ? Math.min((totalSpent / buybackBudgetSek) * 100, 100) : null;
  const currentSharePrice = useMemo(() => {
    const price = stockPrice?.price?.regularMarketPrice;
    const raw = Number(price?.raw ?? price);
    if (Number.isFinite(raw) && raw > 0) return raw;
    const close = stockPrice?.price?.previousClose;
    const closeRaw = Number(close?.raw ?? close);
    return Number.isFinite(closeRaw) && closeRaw > 0 ? closeRaw : null;
  }, [stockPrice]);
  const sharesAffordable = useMemo(() => {
    if (!Number.isFinite(remainingCash) || !Number.isFinite(currentSharePrice) || currentSharePrice <= 0) return null;
    return Math.floor(remainingCash / currentSharePrice);
  }, [remainingCash, currentSharePrice]);

  const chartData = useMemo(() => {
    let base = [];
    if (viewMode === 'daily') base = buildDaily(curData);
    else if (viewMode === 'weekly') base = buildWeekly(curData);
    else if (viewMode === 'monthly') base = buildMonthly(curData);
    else base = buildYearly(curData);
    return base
      .map((row) => ({ x: toLabel(row.Datum), sharesK: (row.Antal_aktier || 0) / 1_000 }))
      .filter((r) => Number.isFinite(r.sharesK));
  }, [viewMode, curData]);

  // ---- Subview derived data ----
  const evolutionOwnershipData = useMemo(() => calculateEvolutionOwnershipPerYear(oldData), [oldData]);
  const cancelledShares = useMemo(() => calculateCancelledShares(oldData), [oldData]);
  const ownershipPercentageData = useMemo(
    () =>
      totalSharesData.map((item) => {
        const ev = evolutionOwnershipData.find((e) => e.date === item.date)?.shares || 0;
        return { date: item.date, percentage: item.totalShares > 0 ? (ev / item.totalShares) * 100 : 0 };
      }),
    [evolutionOwnershipData]
  );
  const latestEvolutionShares = evolutionOwnershipData.length ? evolutionOwnershipData[evolutionOwnershipData.length - 1].shares : 0;
  const latestOwnershipPercentage = useMemo(() => {
    const lastTot = totalSharesData[totalSharesData.length - 1]?.totalShares || 0;
    return lastTot > 0 ? (latestEvolutionShares / lastTot) * 100 : 0;
  }, [latestEvolutionShares]);

  const returns = useMemo(() => calculateShareholderReturns(dividendData || {}, oldData || []), [dividendData, oldData]);
  const chartReturns = useMemo(
    () => returns.combinedData.map((d) => ({ year: d.year, dividends: d.dividends / 1_000_000, buybacks: d.buybacks / 1_000_000 })),
    [returns]
  );
  const directYieldPercentage = useMemo(() => (marketCap > 0 ? (returns.latestYearReturns / marketCap) * 100 : 0), [returns.latestYearReturns, marketCap]);

  const historyChartData = useMemo(() => {
    if (viewMode === 'daily') return buildDaily(oldData);
    if (viewMode === 'weekly') return buildWeekly(oldData);
    if (viewMode === 'monthly') return buildMonthly(oldData);
    return buildYearly(oldData);
  }, [oldData, viewMode]);

  const [chartTypeHistory, setChartTypeHistory] = useState('line');
  const [chartTypeOwnership, setChartTypeOwnership] = useState('line');
  const [chartTypeTotalShares, setChartTypeTotalShares] = useState('line');
  const [sortConfig, setSortConfig] = useState({ key: 'Datum', direction: 'desc' });

  const getDynamicStep = (data, key, mode) => {
    const values = (data || []).map((it) => Number(it[key] || 0));
    const maxVal = Math.max(0, ...values);
    if (mode === 'daily') return maxVal < 10000 ? 1000 : maxVal < 50000 ? 5000 : 10000;
    if (mode === 'weekly') return maxVal < 50000 ? 5000 : maxVal < 200000 ? 20000 : 50000;
    if (mode === 'monthly') return maxVal < 200000 ? 20000 : maxVal < 1000000 ? 100000 : 500000;
    return maxVal < 1000000 ? 100000 : 500000;
  };
  const getYDomain = (data, key) => {
    if (!data || !data.length) return [0, 1000];
    const vals = data.map((d) => Number(d[key] || 0));
    const min = Math.min(0, ...vals);
    const max = Math.max(...vals);
    const step = getDynamicStep(data, key, viewMode);
    const upper = Math.ceil((max * 1.1) / step) * step;
    const lower = Math.floor(min / step) * step;
    return [lower, upper];
  };
  const getYTickValues = (data, key, mode) => {
    const [min, max] = getYDomain(data, key);
    const step = getDynamicStep(data, key, mode);
    const ticks = [];
    for (let i = min; i <= max; i += step) ticks.push(i);
    return ticks;
  };
  const formatYAxisTick = (value) => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
    return Number(value).toLocaleString('sv-SE');
  };
  const sortedOldData = useMemo(() => {
    const arr = Array.isArray(oldData) ? [...oldData] : [];
    const { key, direction } = sortConfig;
    arr.sort((a, b) => {
      const dir = direction === 'asc' ? 1 : -1;
      if (key === 'Datum') return dir * (new Date(a.Datum) - new Date(b.Datum));
      return dir * (Number(a[key] || 0) - Number(b[key] || 0));
    });
    return arr;
  }, [oldData, sortConfig]);
  const onSort = (key) => setSortConfig((prev) => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));

  const lastUpdatedLabel = useMemo(() => {
    if (!lastFetchedAt) return null;
    try {
      const d = new Date(lastFetchedAt);
      return d.toLocaleString('sv-SE', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch {
      return null;
    }
  }, [lastFetchedAt]);

  return (
    <Box
      sx={{
        background: 'linear-gradient(135deg, #0f172a, #1f2937)',
        borderRadius: '18px',
        border: '1px solid rgba(148,163,184,0.18)',
        boxShadow: '0 20px 45px rgba(15, 23, 42, 0.45)',
        color: '#f8fafc',
        padding: { xs: 3, md: 4 },
        width: '100%',
        maxWidth: '1200px',
        margin: '16px auto',
      }}
    >
      <Stack direction={isMobile ? 'column' : 'row'} spacing={isMobile ? 2 : 3} alignItems={isMobile ? 'flex-start' : 'center'} justifyContent="space-between">
        <Box>
          <Typography variant="overline" sx={{ letterSpacing: 1, color: 'rgba(148,163,184,0.65)' }}>Live Buybacks</Typography>
          <Typography variant={isMobile ? 'h5' : 'h4'} sx={{ fontWeight: 700 }}>Återköp – fart & takt</Typography>
          <Typography sx={{ color: 'rgba(226,232,240,0.7)', mt: 1, maxWidth: 560 }}>
            Senaste veckans återköp jämfört med föregående, genomsnittlig takt och en enkel tidslinje. Uppdateras automatiskt.
          </Typography>
        </Box>
      </Stack>

      {/* Subview menu row */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1.5 }}>
        <ToggleButtonGroup
          value={subView}
          exclusive
          onChange={(_e, v) => v && setSubView(v)}
          size="small"
          sx={{ backgroundColor: 'rgba(148,163,184,0.12)', borderRadius: '999px', p: 0.5, flexWrap: 'wrap' }}
        >
          {SUB_VIEWS.map((opt) => (
            <ToggleButton
              key={opt.value}
              value={opt.value}
              sx={{
                textTransform: 'none',
                color: 'rgba(226,232,240,0.75)',
                border: 0,
                borderRadius: '999px!important',
                px: { xs: 1.6, md: 2.2 },
                py: 0.6,
                '&.Mui-selected': { color: '#f8fafc', backgroundColor: 'rgba(56,189,248,0.28)' },
              }}
            >
              {opt.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {/* ===== Overview chart (FULLBREDD) ===== */}
      {subView === 'overview' && (
        <Box
          sx={{
            mt: 2,
            background: 'rgba(15,23,42,0.45)',
            border: '1px solid rgba(148,163,184,0.18)',
            borderRadius: { xs: 0, md: '16px' },

            // Fullbleed-trick för att matcha dina andra komponenter
            mx: { xs: -2, sm: -3, md: -4 },
            px: { xs: 2, sm: 3, md: 4 },
            py: { xs: 2, md: 2.5 },

            height: isMobile ? 240 : 280,
            overflow: 'visible',
          }}
        >
          {loading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 1 }}>
              <CircularProgress size={20} sx={{ color: '#38bdf8' }} />
              <Typography variant="body2" sx={{ color: 'rgba(148,163,184,0.75)' }}>Laddar tidslinje…</Typography>
            </Box>
          ) : error ? (
            <Typography sx={{ color: '#fecaca' }}>Fel: {error}</Typography>
          ) : chartData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 0, left: 0, bottom: 0 }} // inga sidmarginaler
              >
                <defs>
                  <linearGradient id="bbGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(148,163,184,0.15)" strokeDasharray="4 4" />
                <XAxis dataKey="x" tick={{ fontSize: 11, fill: 'rgba(148,163,184,0.75)' }} tickLine={false} axisLine={{ stroke: 'rgba(148,163,184,0.25)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'rgba(148,163,184,0.75)' }} tickLine={false} axisLine={{ stroke: 'rgba(148,163,184,0.25)' }} width={60} tickFormatter={(v) => `${fmtThousands(v, 1)} k`} />
                <RechartsTooltip
                  contentStyle={{ background: 'rgba(15,23,42,0.92)', border: '1px solid rgba(96,165,250,0.25)', borderRadius: 12, color: '#f8fafc' }}
                  formatter={(v) => [`${fmtThousands(v, 1)} k aktier`, 'Återköp']}
                />
                <Area type="monotone" dataKey="sharesK" stroke="#38bdf8" strokeWidth={2.5} fill="url(#bbGradient)" fillOpacity={1} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(148,163,184,0.75)' }}>
              Ingen återköpsdata tillgänglig.
            </Box>
          )}
        </Box>
      )}

      {subView === 'overview' && (
        <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mt: 2 }}>
          <Grid item xs={12} md={3}>
            <Box sx={{ background: 'rgba(15,23,42,0.45)', borderRadius: '16px', border: '1px solid rgba(148,163,184,0.18)', p: { xs: 2, md: 2.5 } }}>
              <Typography variant="overline" sx={{ color: 'rgba(148,163,184,0.85)', letterSpacing: 1.2, fontWeight: 600 }}>
                Denna vecka
              </Typography>
              {loading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={18} sx={{ color: '#38bdf8' }} />
                  <Typography variant="body2" sx={{ color: 'rgba(148,163,184,0.75)' }}>Hämtar…</Typography>
                </Box>
              ) : (
                <Stack spacing={0.5}>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {fmtNum(weekNow.totalShares)} aktier
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(148,163,184,0.75)' }}>
                    {weekNow.periodStart && weekNow.periodEnd
                      ? `${weekNow.periodStart.toLocaleDateString('sv-SE')}–${weekNow.periodEnd.toLocaleDateString('sv-SE')}`
                      : '—'}
                  </Typography>
                  <Divider sx={{ borderColor: 'rgba(148,163,184,0.18)', my: 1 }} />
                  <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.8)' }}>Genomsnittlig daglig takt</Typography>
                  <Typography sx={{ fontWeight: 700 }}>{fmtNum(Math.round(avgDaily.averageDaily))} aktier/dag</Typography>
                </Stack>
              )}
            </Box>
          </Grid>
          <Grid item xs={12} md={3}>
            <Box sx={{ background: 'rgba(15,23,42,0.45)', borderRadius: '16px', border: '1px solid rgba(148,163,184,0.18)', p: { xs: 2, md: 2.5 } }}>
              <Typography variant="overline" sx={{ color: 'rgba(148,163,184,0.85)', letterSpacing: 1.2, fontWeight: 600 }}>
                Föregående vecka
              </Typography>
              {loading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={18} sx={{ color: '#34d399' }} />
                  <Typography variant="body2" sx={{ color: 'rgba(148,163,184,0.75)' }}>Hämtar…</Typography>
                </Box>
              ) : (
                <Stack spacing={0.5}>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {fmtNum(weekPrev.totalShares)} aktier
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(148,163,184,0.75)' }}>
                    {weekPrev.periodStart && weekPrev.periodEnd
                      ? `${weekPrev.periodStart.toLocaleDateString('sv-SE')}–${weekPrev.periodEnd.toLocaleDateString('sv-SE')}`
                      : '—'}
                  </Typography>
                  <Divider sx={{ borderColor: 'rgba(148,163,184,0.18)', my: 1 }} />
                  <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.8)' }}>Snittpris i programmet</Typography>
                  <Typography sx={{ fontWeight: 700 }}>{fmtNum(Math.round(stats.averagePrice))} SEK</Typography>
                </Stack>
              )}
            </Box>
          </Grid>
          <Grid item xs={12} md={3}>
            <Box sx={{ background: 'rgba(15,23,42,0.45)', borderRadius: '16px', border: '1px solid rgba(148,163,184,0.18)', p: { xs: 2, md: 2.5 } }}>
              <Typography variant="overline" sx={{ color: 'rgba(148,163,184,0.85)', letterSpacing: 1.2, fontWeight: 600 }}>
                Framåtblick
              </Typography>
              {loading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={18} sx={{ color: '#f59e0b' }} />
                  <Typography variant="body2" sx={{ color: 'rgba(148,163,184,0.75)' }}>Hämtar…</Typography>
                </Box>
              ) : (
                <Stack spacing={0.5}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {est
                      ? `${fmtNum(est.daysToCompletion)} handelsdagar kvar`
                      : Number.isFinite(remainingCash) && remainingCash <= 0
                      ? 'Budget förbrukad'
                      : '—'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(148,163,184,0.75)' }}>
                    {est?.estimatedCompletionDate
                      ? `Klar: ${est.estimatedCompletionDate}`
                      : Number.isFinite(remainingCash) && remainingCash <= 0
                      ? 'Återköpsbudgeten är förbrukad.'
                      : 'Lägg till kontantbudget för uppskattning'}
                  </Typography>
                </Stack>
              )}
            </Box>
          </Grid>
          {Number.isFinite(buybackBudgetSek) && (
            <Grid item xs={12} md={3}>
              <Box sx={{ background: 'rgba(15,23,42,0.45)', borderRadius: '16px', border: '1px solid rgba(148,163,184,0.18)', p: { xs: 2, md: 2.5 }, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                <Typography variant="overline" sx={{ color: 'rgba(148,163,184,0.85)', letterSpacing: 1.2, fontWeight: 600 }}>
                  Kassaläge
                </Typography>
                <Stack spacing={0.5}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {fmtCurrency(totalSpent)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(148,163,184,0.75)' }}>
                    Budget: {fmtEuroMillions(buybackCash)} (≈ {fmtCurrency(buybackBudgetSek)})
                  </Typography>
                  {Number.isFinite(cashUsagePercent) ? (
                    <Stack spacing={0.5}>
                      <LinearProgress
                        variant="determinate"
                        value={cashUsagePercent}
                        sx={{
                          height: 8,
                          borderRadius: 999,
                          backgroundColor: 'rgba(148,163,184,0.18)',
                          '& .MuiLinearProgress-bar': { borderRadius: 999, background: 'linear-gradient(90deg, #38bdf8, #34d399)' },
                        }}
                      />
                      <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.8)' }}>
                        {cashUsagePercent.toFixed(1)}% utnyttjat
                      </Typography>
                    </Stack>
                  ) : (
                    <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.8)' }}>
                      Lägg till budget för att följa kassaanvändning.
                    </Typography>
                  )}
                </Stack>
                <Divider sx={{ borderColor: 'rgba(148,163,184,0.18)' }} />
                <Stack spacing={0.5}>
                  <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.8)' }}>Återstående kassa</Typography>
                  <Typography sx={{ fontWeight: 700 }}>{fmtCurrency(remainingCash)}</Typography>
                </Stack>
                <Stack spacing={0.5}>
                  <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.8)' }}>Kapacitet vid kurs</Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(148,163,184,0.75)' }}>
                    {Number.isFinite(sharesAffordable) && Number.isFinite(currentSharePrice)
                      ? `≈ ${fmtNum(sharesAffordable)} aktier vid ${fmtCurrency(currentSharePrice)}`
                      : 'Ingen livekurs tillgänglig.'}
                  </Typography>
                </Stack>
              </Box>
            </Grid>
          )}
        </Grid>
      )}

      {subView === 'ownership' && (
        <Box sx={{ mt: 2 }}>
          <OwnershipView
            isMobile={isMobile}
            evolutionOwnershipData={evolutionOwnershipData}
            ownershipPercentageData={ownershipPercentageData}
            latestEvolutionShares={latestEvolutionShares}
            latestOwnershipPercentage={latestOwnershipPercentage}
            cancelledShares={cancelledShares}
            chartTypeOwnership={chartTypeOwnership}
            onChangeChartTypeOwnership={(_e, v) => v && setChartTypeOwnership(v)}
            yDomain={getYDomain(evolutionOwnershipData, 'shares')}
            yTicks={getYTickValues(evolutionOwnershipData, 'shares', 'yearly')}
            formatYAxisTick={formatYAxisTick}
          />
        </Box>
      )}

      {subView === 'total' && (
        <Box sx={{ mt: 2 }}>
          <TotalSharesView
            isMobile={isMobile}
            totalSharesData={totalSharesData}
            latestTotalShares={totalSharesData.slice(-1)[0]?.totalShares || 0}
            chartTypeTotalShares={chartTypeTotalShares}
            onChangeChartTypeTotalShares={(_e, v) => v && setChartTypeTotalShares(v)}
            yDomain={getYDomain(totalSharesData, 'totalShares')}
            yTicks={getYTickValues(totalSharesData, 'totalShares', 'yearly')}
            formatYAxisTick={formatYAxisTick}
          />
        </Box>
      )}

      {subView === 'history' && (
        <Box sx={{ mt: 2 }}>
          <HistoryView
            isMobile={isMobile}
            viewMode={viewMode}
            onChangeViewMode={(_e, v) => v && setViewMode(v)}
            chartTypeHistory={chartTypeHistory}
            onChangeChartTypeHistory={(_e, v) => v && setChartTypeHistory(v)}
            historyChartData={historyChartData}
            yDomain={getYDomain(historyChartData, 'Antal_aktier')}
            yTicks={getYTickValues(historyChartData, 'Antal_aktier', viewMode)}
            formatYAxisTick={formatYAxisTick}
            sortedData={sortedOldData}
            sortConfig={sortConfig}
            onSort={onSort}
          />
        </Box>
      )}

      {subView === 'returns' && (
        <Box sx={{ mt: 2 }}>
          <ReturnsView
            isMobile={isMobile}
            chartData={chartReturns}
            totalReturns={returns.total}
            totalDividends={returns.totalDividends}
            totalBuybacks={returns.totalBuybacks}
            loadingPrice={loadingPrice}
            directYieldPercentage={directYieldPercentage}
            marketCap={marketCap}
            latestYear={returns.latestYear}
          />
        </Box>
      )}

      <Stack direction={isMobile ? 'column' : 'row'} spacing={{ xs: 1.5, md: 2 }} justifyContent="space-between" sx={{ mt: 2 }}>
        <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.6)' }}>
          {lastUpdatedLabel ? `Senast uppdaterad ${lastUpdatedLabel}` : '—'}
        </Typography>
        <Chip
          label="Uppdatera"
          size="small"
          onClick={fetchData}
          sx={{ backgroundColor: 'rgba(148,163,184,0.12)', color: '#cbd5f5', borderRadius: '999px', alignSelf: isMobile ? 'flex-start' : 'center' }}
        />
      </Stack>
    </Box>
  );
}