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
import { useTranslate } from '@/context/LocaleContext';
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
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
  { value: 'weekly', labelSv: 'Veckor', labelEn: 'Weeks' },
  { value: 'daily', labelSv: 'Dagar', labelEn: 'Days' },
  { value: 'monthly', labelSv: 'Månader', labelEn: 'Months' },
  { value: 'yearly', labelSv: 'År', labelEn: 'Years' },
];
const SUB_VIEWS = [
  { value: 'overview', labelSv: 'Översikt', labelEn: 'Overview' },
  { value: 'ownership', labelSv: 'Evolutions ägande', labelEn: "Evolution's ownership" },
  { value: 'total', labelSv: 'Totala aktier', labelEn: 'Total shares' },
  { value: 'history', labelSv: 'Återköpshistorik', labelEn: 'Buyback history' },
  { value: 'returns', labelSv: 'Återinvestering', labelEn: 'Capital returns' },
];

const fmtNum = (n) => (Number.isFinite(n) ? n.toLocaleString('sv-SE') : '–');
const fmtThousands = (n, digits = 1) =>
  Number.isFinite(n) ? n.toLocaleString('sv-SE', { maximumFractionDigits: digits }) : '–';
const fmtPercent = (value) => {
  if (!Number.isFinite(value)) return '–';
  const digits = value >= 0.1 ? 2 : 3;
  return `${value.toLocaleString('sv-SE', { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;
};

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
  const translate = useTranslate();
  const { marketCap, loading: loadingPrice, stockPrice } = useStockPriceContext();
  const { rate: fxRate, meta: fxMeta, lastUpdated: fxUpdated } = useFxRateContext();

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

  const fxPairLabel = useMemo(() => {
    const base = fxMeta?.base;
    const quote = fxMeta?.quote;
    if (base && quote) return `${base}/${quote}`;
    return 'EUR/SEK';
  }, [fxMeta]);
  const fxRateDisplay = Number.isFinite(fxRate)
    ? fxRate.toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '–';
  const fxUpdatedLabel =
    fxUpdated instanceof Date && Number.isFinite(fxUpdated.getTime())
      ? fxUpdated.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
      : null;
  const latestTotalSharesCount = useMemo(
    () => totalSharesData[totalSharesData.length - 1]?.totalShares || null,
    []
  );
  const getShareBaseForDate = useCallback(
    (date) => {
      if (!(date instanceof Date) || Number.isNaN(date.getTime())) return latestTotalSharesCount;
      const year = date.getFullYear();
      const match = totalSharesData.find((entry) => Number(entry.date) === year);
      return match?.totalShares || latestTotalSharesCount;
    },
    [latestTotalSharesCount]
  );
  const weekNowShareBase = useMemo(
    () => getShareBaseForDate(weekNow.periodStart),
    [getShareBaseForDate, weekNow.periodStart?.getTime()]
  );
  const weekPrevShareBase = useMemo(
    () => getShareBaseForDate(weekPrev.periodStart),
    [getShareBaseForDate, weekPrev.periodStart?.getTime()]
  );
  const weekNowPercentOfShares =
    Number.isFinite(weekNow.totalShares) && Number.isFinite(weekNowShareBase) && weekNowShareBase > 0
      ? (weekNow.totalShares / weekNowShareBase) * 100
      : null;
  const weekPrevPercentOfShares =
    Number.isFinite(weekPrev.totalShares) && Number.isFinite(weekPrevShareBase) && weekPrevShareBase > 0
      ? (weekPrev.totalShares / weekPrevShareBase) * 100
      : null;
  const remainingCashSharePercent =
    Number.isFinite(remainingCash) &&
    Number.isFinite(currentSharePrice) &&
    currentSharePrice > 0 &&
    Number.isFinite(latestTotalSharesCount) &&
    latestTotalSharesCount > 0
      ? (remainingCash / (latestTotalSharesCount * currentSharePrice)) * 100
      : null;

  const combinedBuybacks = useMemo(() => {
    const normalized = new Map();
    const pushRow = (row) => {
      if (!row || !row.Datum) return;
      const safeDate = row.Datum;
      const existing = normalized.get(safeDate) || {};
      normalized.set(safeDate, { ...existing, ...row });
    };
    (Array.isArray(oldData) ? oldData : []).forEach(pushRow);
    (Array.isArray(curData) ? curData : []).forEach(pushRow);
    return Array.from(normalized.values()).sort(
      (a, b) => new Date(a.Datum) - new Date(b.Datum),
    );
  }, [oldData, curData]);

  const historicalTotals = useMemo(() => {
    const positive = combinedBuybacks.filter((row) => Number(row?.Antal_aktier) > 0);
    if (!positive.length) return null;
    const shares = positive.reduce((sum, row) => sum + (Number(row?.Antal_aktier) || 0), 0);
    const value = positive.reduce((sum, row) => sum + (Number(row?.Transaktionsvärde) || 0), 0);
    if (!Number.isFinite(shares) || shares <= 0 || !Number.isFinite(value) || value <= 0) return null;
    return {
      shares,
      value,
      averagePrice: value / shares,
    };
  }, [combinedBuybacks]);

  const historicalPnL = useMemo(() => {
    if (!historicalTotals) return null;
    const { shares, averagePrice, value } = historicalTotals;
    if (!Number.isFinite(currentSharePrice) || currentSharePrice <= 0) return null;
    const diffPerShare = currentSharePrice - averagePrice;
    const absolute = diffPerShare * shares;
    const percent = (diffPerShare / averagePrice) * 100;
    return { absolute, percent, shares, averagePrice, invested: value };
  }, [historicalTotals, currentSharePrice]);

  const chartData = useMemo(() => {
    let base = [];
    if (viewMode === 'daily') base = buildDaily(combinedBuybacks);
    else if (viewMode === 'weekly') base = buildWeekly(combinedBuybacks);
    else if (viewMode === 'monthly') base = buildMonthly(combinedBuybacks);
    else base = buildYearly(combinedBuybacks);
    return base
      .map((row) => ({ x: toLabel(row.Datum), sharesK: (row.Antal_aktier || 0) / 1_000 }))
      .filter((r) => Number.isFinite(r.sharesK));
  }, [viewMode, combinedBuybacks]);

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
    if (viewMode === 'daily') return buildDaily(combinedBuybacks);
    if (viewMode === 'weekly') return buildWeekly(combinedBuybacks);
    if (viewMode === 'monthly') return buildMonthly(combinedBuybacks);
    return buildYearly(combinedBuybacks);
  }, [combinedBuybacks, viewMode]);

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
      <Stack direction={isMobile ? 'column' : 'row'} spacing={isMobile ? 2 : 3} alignItems="center" justifyContent="center">
        <Box sx={{ textAlign: 'center', width: '100%' }}>
          <Typography variant="overline" sx={{ letterSpacing: 1, color: 'rgba(148,163,184,0.65)' }}>
            {translate('Live Buybacks', 'Live Buybacks')}
          </Typography>
          <Typography variant={isMobile ? 'h5' : 'h4'} sx={{ fontWeight: 700 }}>
            {translate('Återköp – fart & takt', 'Buybacks – pace & run rate')}
          </Typography>
          <Typography sx={{ color: 'rgba(226,232,240,0.7)', mt: 1, maxWidth: 560, mx: 'auto' }}>
            {translate(
              'Senaste veckans återköp jämfört med föregående, genomsnittlig takt och en enkel tidslinje. Uppdateras automatiskt.',
              'Compare last week’s buybacks with the prior one, track the average pace, and see a simple timeline. Updates automatically.'
            )}
          </Typography>
        </Box>
      </Stack>

      {(Number.isFinite(fxRate) || fxUpdatedLabel) && (
        <Stack
          direction="row"
          spacing={1.2}
          flexWrap="wrap"
          alignItems="center"
          justifyContent="center"
          sx={{ mt: 1 }}
        >
          {Number.isFinite(fxRate) && (
            <Chip
              size="small"
              icon={<CurrencyExchangeIcon sx={{ color: '#c4b5fd !important' }} />}
              label={`${fxPairLabel} ${fxRateDisplay}`}
              sx={{
                backgroundColor: 'rgba(196,181,253,0.12)',
                color: '#ddd6fe',
                borderRadius: '10px',
                border: '1px solid rgba(196,181,253,0.35)',
              }}
            />
          )}
          {fxUpdatedLabel && (
            <Chip
              size="small"
              icon={<AccessTimeIcon sx={{ color: '#bfdbfe !important' }} />}
              label={translate(`FX uppd: ${fxUpdatedLabel}`, `FX updated: ${fxUpdatedLabel}`)}
              sx={{
                backgroundColor: 'rgba(96,165,250,0.12)',
                color: '#bfdbfe',
                borderRadius: '10px',
                border: '1px solid rgba(96,165,250,0.35)',
              }}
            />
          )}
        </Stack>
      )}

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
              {translate(opt.labelSv, opt.labelEn)}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {subView === 'overview' && Number.isFinite(buybackBudgetSek) && (
        <Box
          sx={{
            mt: 2,
            background: 'rgba(15,23,42,0.55)',
            border: '1px solid rgba(148,163,184,0.18)',
            borderRadius: { xs: 0, md: '16px' },
            mx: { xs: -2, sm: -3, md: -4 },
            px: { xs: 2, sm: 3, md: 4 },
            py: { xs: 2, md: 2.5 },
          }}
        >
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={{ xs: 1.5, md: 2.5 }}
            alignItems="stretch"
            justifyContent="space-between"
            flexWrap="wrap"
          >
            <Stack spacing={0.75} sx={{ minWidth: { md: 220 }, flex: '1 1 220px' }}>
              <Typography variant="subtitle2" sx={{ color: 'rgba(226,232,240,0.85)', fontWeight: 700 }}>
                {translate('Kassaläge', 'Cash position')}
              </Typography>
              <Typography sx={{ fontWeight: 700, fontSize: { xs: '1.05rem', md: '1.18rem' }, color: '#f8fafc' }}>
                {fmtCurrency(totalSpent)}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: '#e2e8f0',
                  fontWeight: 600,
                  letterSpacing: 0.2,
                }}
              >
                {translate('Budget:', 'Budget:')} {fmtEuroMillions(buybackCash)} (≈ {fmtCurrency(buybackBudgetSek)})
              </Typography>
            </Stack>

            <Stack spacing={0.8} sx={{ minWidth: { md: 260 }, flex: '1 1 260px' }}>
              <Typography variant="subtitle2" sx={{ color: 'rgba(226,232,240,0.85)', fontWeight: 700 }}>
                {translate('Återstående kassa', 'Remaining cash')}
              </Typography>
              <Typography sx={{ fontWeight: 700, fontSize: { xs: '1.15rem', md: '1.3rem' }, color: '#f8fafc' }}>{fmtCurrency(remainingCash)}</Typography>
              {Number.isFinite(cashUsagePercent) ? (
                <>
                  <Typography variant="caption" sx={{ color: '#cbd5f5', fontWeight: 600, letterSpacing: 0.3 }}>
                    {translate(
                      `${cashUsagePercent.toFixed(1)}% utnyttjat`,
                      `${cashUsagePercent.toFixed(1)}% used`
                    )}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={cashUsagePercent}
                    sx={{
                      height: 6,
                      width: { xs: '100%', md: '80%' },
                      borderRadius: 999,
                      backgroundColor: 'rgba(148,163,184,0.18)',
                      '& .MuiLinearProgress-bar': { borderRadius: 999, background: 'linear-gradient(90deg, #38bdf8, #34d399)' },
                    }}
                  />

                </>
              ) : (
                <Typography variant="body2" sx={{ color: 'rgba(148,163,184,0.75)' }}>
                  {translate('Lägg till budget för att följa kassaanvändning.', 'Add a budget to track cash usage.')}
                </Typography>
              )}
            </Stack>

            <Stack spacing={0.8} sx={{ minWidth: { md: 260 }, flex: '1 1 280px' }}>
              <Typography variant="subtitle2" sx={{ color: 'rgba(226,232,240,0.85)', fontWeight: 700 }}>
                {translate('Kapacitet vid kurs', 'Capacity at price')}
              </Typography>
              <Typography sx={{ fontWeight: 700, fontSize: { xs: '1.05rem', md: '1.18rem' }, color: '#f8fafc' }}>
                {Number.isFinite(sharesAffordable) && Number.isFinite(currentSharePrice)
                  ? translate(
                      `≈ ${fmtNum(sharesAffordable)} aktier vid ${fmtCurrency(currentSharePrice)}`,
                      `≈ ${fmtNum(sharesAffordable)} shares at ${fmtCurrency(currentSharePrice)}`
                    )
                  : translate('Ingen livekurs tillgänglig.', 'No live price available.')}
              </Typography>
              <Typography sx={{ fontWeight: 700, color: '#f8fafc', fontSize: { xs: '1.05rem', md: '1.18rem' } }}>
                {Number.isFinite(remainingCashSharePercent)
                  ? translate(
                      `${fmtPercent(remainingCashSharePercent)} av aktiestocken`,
                      `${fmtPercent(remainingCashSharePercent)} of share base`
                    )
                  : translate('Beräknas när kurs och budget finns.', 'Calculated when price and budget exist.')}
              </Typography>
            </Stack>

            <Stack spacing={0.8} sx={{ minWidth: { md: 240 }, flex: '1 1 240px' }}>
              <Typography variant="subtitle2" sx={{ color: 'rgba(226,232,240,0.85)', fontWeight: 700 }}>
                {translate('Framåtblick', 'Forward look')}
              </Typography>
              <Typography sx={{ fontWeight: 700, fontSize: { xs: '1.05rem', md: '1.18rem' }, color: '#f8fafc' }}>
                {est && Number.isFinite(est.daysToCompletion)
                  ? translate(
                      `${fmtNum(est.daysToCompletion)} handelsdagar kvar`,
                      `${fmtNum(est.daysToCompletion)} trading days left`
                    )
                  : Number.isFinite(remainingCash) && remainingCash <= 0
                  ? translate('Budget förbrukad', 'Budget spent')
                  : translate('Lägg till budget', 'Add budget')}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: '#cbd5f5',
                  fontWeight: 600,
                }}
              >
                {est?.estimatedCompletionDate
                  ? translate(`Klar: ${est.estimatedCompletionDate}`, `Complete: ${est.estimatedCompletionDate}`)
                  : Number.isFinite(remainingCash) && remainingCash <= 0
                  ? translate('Återköpsbudgeten är förbrukad.', 'The buyback budget is spent.')
                  : translate('Behöver kassainformation för prognos.', 'Need cash information for forecast.')}
              </Typography>
            </Stack>
          </Stack>
        </Box>
      )}

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
              <Typography variant="body2" sx={{ color: 'rgba(148,163,184,0.75)' }}>
                {translate('Laddar tidslinje…', 'Loading timeline…')}
              </Typography>
            </Box>
          ) : error ? (
            <Typography sx={{ color: '#fecaca' }}>
              {translate('Fel', 'Error')}: {error}
            </Typography>
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
                  formatter={(v) => [
                    translate(`${fmtThousands(v, 1)} k aktier`, `${fmtThousands(v, 1)} k shares`),
                    translate('Återköp', 'Buybacks'),
                  ]}
                />
                <Area type="monotone" dataKey="sharesK" stroke="#38bdf8" strokeWidth={2.5} fill="url(#bbGradient)" fillOpacity={1} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(148,163,184,0.75)' }}>
              {translate('Ingen återköpsdata tillgänglig.', 'No buyback data available.')}
            </Box>
          )}
        </Box>
      )}

      {subView === 'overview' && (
        <Box
          sx={{
            mt: 2,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <Stack
            direction={{ xs: 'column', lg: 'row' }}
            spacing={{ xs: 2, lg: 3 }}
            alignItems="stretch"
            justifyContent="center"
            sx={{ width: '100%', maxWidth: 1040 }}
          >
            <Box
              sx={{
                flex: '1 1 0',
                minWidth: { xs: '100%', lg: 440 },
                background: 'rgba(15,23,42,0.45)',
                borderRadius: '16px',
                border: '1px solid rgba(148,163,184,0.18)',
                p: { xs: 1.8, md: 2 },
              }}
            >
              <Typography
                variant="overline"
                sx={{
                  color: 'rgba(148,163,184,0.85)',
                  letterSpacing: 1.2,
                  fontWeight: 600,
                  display: 'block',
                  textAlign: { xs: 'left', lg: 'center' },
                }}
              >
                {translate('Denna vecka', 'This week')}
              </Typography>
              {loading ? (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: { xs: 'flex-start', lg: 'center' },
                    gap: 1,
                    minHeight: 90,
                  }}
                >
                  <CircularProgress size={18} sx={{ color: '#38bdf8' }} />
                  <Typography variant="body2" sx={{ color: 'rgba(148,163,184,0.75)' }}>
                    {translate('Hämtar…', 'Fetching…')}
                  </Typography>
                </Box>
              ) : (
                <Stack spacing={0.35} sx={{ textAlign: { xs: 'left', lg: 'center' } }}>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {translate(`${fmtNum(weekNow.totalShares)} aktier`, `${fmtNum(weekNow.totalShares)} shares`)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(148,163,184,0.75)' }}>
                    {weekNow.periodStart && weekNow.periodEnd
                      ? `${weekNow.periodStart.toLocaleDateString('sv-SE')}–${weekNow.periodEnd.toLocaleDateString('sv-SE')}`
                      : '—'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.85)' }}>
                    {translate('Andel av aktiestocken', 'Share of outstanding stock')}
                  </Typography>
                  <Typography sx={{ fontWeight: 700 }}>{fmtPercent(weekNowPercentOfShares)}</Typography>
                  <Divider sx={{ borderColor: 'rgba(148,163,184,0.12)', my: 1 }} />
                  <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.85)' }}>
                    {translate('Genomsnittlig daglig takt', 'Average daily pace')}
                  </Typography>
                  <Typography sx={{ fontWeight: 700 }}>
                    {translate(
                      `${fmtNum(Math.round(avgDaily.averageDaily))} aktier/dag`,
                      `${fmtNum(Math.round(avgDaily.averageDaily))} shares/day`
                    )}
                  </Typography>
                </Stack>
              )}
            </Box>

            <Box
              sx={{
                flex: '1 1 0',
                minWidth: { xs: '100%', lg: 440 },
                background: 'rgba(15,23,42,0.45)',
                borderRadius: '16px',
                border: '1px solid rgba(148,163,184,0.18)',
                p: { xs: 1.8, md: 2 },
              }}
            >
              <Typography
                variant="overline"
                sx={{
                  color: 'rgba(148,163,184,0.85)',
                  letterSpacing: 1.2,
                  fontWeight: 600,
                  display: 'block',
                  textAlign: { xs: 'left', lg: 'center' },
                }}
              >
                {translate('Föregående vecka', 'Previous week')}
              </Typography>
              {loading ? (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: { xs: 'flex-start', lg: 'center' },
                    gap: 1,
                    minHeight: 90,
                  }}
                >
                  <CircularProgress size={18} sx={{ color: '#34d399' }} />
                  <Typography variant="body2" sx={{ color: 'rgba(148,163,184,0.75)' }}>
                    {translate('Hämtar…', 'Fetching…')}
                  </Typography>
                </Box>
              ) : (
                <Stack spacing={0.35} sx={{ textAlign: { xs: 'left', lg: 'center' } }}>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {translate(`${fmtNum(weekPrev.totalShares)} aktier`, `${fmtNum(weekPrev.totalShares)} shares`)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(148,163,184,0.75)' }}>
                    {weekPrev.periodStart && weekPrev.periodEnd
                      ? `${weekPrev.periodStart.toLocaleDateString('sv-SE')}–${weekPrev.periodEnd.toLocaleDateString('sv-SE')}`
                      : '—'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.85)' }}>
                    {translate('Andel av aktiestocken', 'Share of outstanding stock')}
                  </Typography>
                  <Typography sx={{ fontWeight: 700 }}>{fmtPercent(weekPrevPercentOfShares)}</Typography>
                  <Divider sx={{ borderColor: 'rgba(148,163,184,0.12)', my: 1 }} />
                  <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.85)' }}>
                    {translate('Snittpris i programmet', 'Average program price')}
                  </Typography>
                  <Typography sx={{ fontWeight: 700 }}>{fmtNum(Math.round(stats.averagePrice))} SEK</Typography>
                </Stack>
              )}
            </Box>
          </Stack>
        </Box>
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
            historicalPnL={historicalPnL}
            currentSharePrice={currentSharePrice}
            historicalTotals={historicalTotals}
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
          {lastUpdatedLabel
            ? translate(`Senast uppdaterad ${lastUpdatedLabel}`, `Last updated ${lastUpdatedLabel}`)
            : '—'}
        </Typography>
        <Chip
          label={translate('Uppdatera', 'Refresh')}
          size="small"
          onClick={fetchData}
          sx={{ backgroundColor: 'rgba(148,163,184,0.12)', color: '#cbd5f5', borderRadius: '999px', alignSelf: isMobile ? 'flex-start' : 'center' }}
        />
      </Stack>
    </Box>
  );
}
