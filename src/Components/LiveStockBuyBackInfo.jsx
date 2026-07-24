'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
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
import {
  buildBuybackComplianceForecast,
  buildBuybackComplianceSeries,
  buildBuybackWeeklyEstimate,
  trimLeadingPlaceholderComplianceRows,
  summarizeBuybackCompliance,
} from '@/lib/buybackCompliance';
import OwnershipView from './buybacks/OwnershipView';
import TotalSharesView from './buybacks/TotalSharesView';
import HistoryView from './buybacks/HistoryView';
import ReturnsView from './buybacks/ReturnsView';
import FreeFloatView from './buybacks/FreeFloatView';
import SharePoolView from './buybacks/SharePoolView';
import LiveStockBuyBackOverviewSection from './LiveStockBuyBackOverviewSection';
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
  formatBuybackAxisTick,
  buildNiceYAxisConfig,
  totalSharesData,
} from './buybacks/utils';
import { combineBuybackSnapshots } from '@/lib/buybackSnapshots';
import {
  calculateShareholderOverview,
  FREE_FLOAT_PREVIOUS_OWNERS,
  FREE_FLOAT_PREVIOUS_TOTAL_SHARES,
  FREE_FLOAT_PREVIOUS_SNAPSHOT_DATE,
  FREE_FLOAT_SNAPSHOT_DATE,
  FREE_FLOAT_TREASURY_SHARES,
  FREE_FLOAT_OWNER_ASSUMPTIONS,
  buildInsiderOwnershipTrend,
} from '@/lib/buybackFreeFloat';
import buybackDataDefault from "../app/data/buybackData.json";
import oldBuybackDataDefault from "../app/data/oldBuybackData.json";
import insiderTransactionsDefault from "../app/data/insiderTransactions.json";

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
  { value: 'pool', labelSv: 'Aktiepool', labelEn: 'Share pool' },
  { value: 'freeFloat', labelSv: 'Free float', labelEn: 'Free float' },
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
  Number.isFinite(value)
    ? `${(value / 1_000_000).toLocaleString('sv-SE', {
        maximumFractionDigits: value >= 1_000_000_000 ? 0 : 1,
      })} M€`
    : '–';

const BUYBACKS_ACTIVE = process.env.NEXT_PUBLIC_BUYBACKS_ACTIVE !== '0';
const FORECAST_CAPITAL_UPDATE_DATE = '2026-05-18';
const CURRENT_BUYBACK_MANDATE_START_DATE = '2026-05-18';

const toLabel = (datum) => {
  if (!datum) return '';
  if (/^\d{4}-V\d{2}$/.test(datum)) return datum.replace('-V', ' v');
  if (/^\d{4}-\d{2}-\d{2}$/.test(datum)) return datum.slice(5);
  if (/^\d{4}-\d{2}$/.test(datum)) return datum;
  return String(datum);
};

export default function LiveStockBuyBackInfo({ buybackCash = 0, dividendData, financialReports }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const translate = useTranslate();
  const { marketCap, loading: loadingPrice, stockPrice } = useStockPriceContext();
  const { rate: fxRate, meta: fxMeta, lastUpdated: fxUpdated } = useFxRateContext();

  const [subView, setSubView] = useState('overview');
  const [viewMode, setViewMode] = useState('weekly');
  const [showWeeklyEstimate, setShowWeeklyEstimate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [complianceLoading, setComplianceLoading] = useState(false);
  const [complianceError, setComplianceError] = useState('');
  const [tradingVolumeByDate, setTradingVolumeByDate] = useState(new Map());
  const [oldData, setOldData] = useState(oldBuybackDataDefault);
  const [curData, setCurData] = useState(buybackDataDefault);
  const [lastFetchedAt, setLastFetchedAt] = useState(null);

  const fetchData = useCallback(async () => {
    if (!BUYBACKS_ACTIVE) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/buybacks/data');
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

  const fetchCompliance = useCallback(async () => {
    if (!BUYBACKS_ACTIVE) return;
    setComplianceLoading(true);
    setComplianceError('');
    try {
      const res = await fetch('/api/short/activity?days=365', {
        cache: 'no-store',
      });
      const json = await parseJsonResponse(res, { requireOk: false });
      const items = Array.isArray(json?.items) ? json.items : [];
      const volumeMap = new Map();
      for (const item of items) {
        const date = item?.date;
        const volume = Number(item?.volumeShares);
        if (!date || !Number.isFinite(volume) || volume <= 0) continue;
        volumeMap.set(date, volume);
      }
      setTradingVolumeByDate(volumeMap);
      if (json?.ok === false) {
        setComplianceError(json?.error || json?.message || 'Kunde inte hämta handelsvolymer');
      }
    } catch (e) {
      setTradingVolumeByDate(new Map());
      setComplianceError(e instanceof Error ? e.message : String(e));
    } finally {
      setComplianceLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchCompliance();
  }, [fetchCompliance]);

  const currentMandateData = useMemo(
    () =>
      (curData || []).filter((row) => {
        if (!row?.Datum) return false;
        return row.Datum >= CURRENT_BUYBACK_MANDATE_START_DATE && Number(row?.Antal_aktier) > 0;
      }),
    [curData]
  );

  const { weekNow, weekPrev } = useMemo(() => {
    const thisWeek = getLastWeekBuybacks(currentMandateData);
    const prevWeek = getPreviousWeekBuybacks(currentMandateData, thisWeek.periodStart);
    return { weekNow: thisWeek, weekPrev: prevWeek };
  }, [currentMandateData]);
  const weekDeltaShares = useMemo(() => weekNow.totalShares - weekPrev.totalShares, [weekNow.totalShares, weekPrev.totalShares]);
  const weekDeltaSharesPct = useMemo(() => {
    if (!Number.isFinite(weekPrev.totalShares) || weekPrev.totalShares <= 0) return null;
    return (weekDeltaShares / weekPrev.totalShares) * 100;
  }, [weekDeltaShares, weekPrev.totalShares]);

  const avgDaily = useMemo(() => calculateAverageDailyBuyback(currentMandateData), [currentMandateData]);
  const buybackBudgetSek = useMemo(() => {
    if (!Number.isFinite(buybackCash) || buybackCash <= 0) return null;
    const rate = Number(fxRate);
    if (!Number.isFinite(rate) || rate <= 0) return null;
    return buybackCash * rate;
  }, [buybackCash, fxRate]);
  const stats = useMemo(() => calculateBuybackStats(currentMandateData), [currentMandateData]);
  const totalSpent = useMemo(
    () => currentMandateData.reduce((sum, row) => sum + (row?.Transaktionsvärde || 0), 0),
    [currentMandateData]
  );
  const remainingCash = useMemo(
    () => (Number.isFinite(buybackBudgetSek) ? Math.max(buybackBudgetSek - totalSpent, 0) : null),
    [buybackBudgetSek, totalSpent]
  );
  const est = useMemo(
    () =>
      Number.isFinite(remainingCash) && remainingCash > 0
        ? calculateEstimatedCompletion(remainingCash, currentMandateData)
        : null,
    [remainingCash, currentMandateData]
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
  const ttmEps = useMemo(() => {
    const reports = financialReports?.financialReports || [];
    if (!reports.length) return null;
    const qOrder = { Q1: 1, Q2: 2, Q3: 3, Q4: 4 };
    const sorted = reports
      .map((r) => {
        const y = Number(r?.year) || 0;
        const q = qOrder[r?.quarter] || 0;
        return y && q ? { ...r, index: y * 4 + q } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.index - a.index);
    const last4 = sorted.slice(0, 4);
    if (last4.length < 4) return null;
    const sum = last4.reduce(
      (acc, r) => acc + (Number.isFinite(r?.adjustedEarningsPerShare) ? r.adjustedEarningsPerShare : 0),
      0
    );
    return Number.isFinite(sum) ? sum : null;
  }, [financialReports]);
  const fxPairLabel = useMemo(() => {
    const base = fxMeta?.base;
    const quote = fxMeta?.quote;
    if (base && quote) return `${base}/${quote}`;
    return 'EUR/SEK';
  }, [fxMeta]);
  const fxRateDisplay = Number.isFinite(fxRate)
    ? fxRate.toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '–';
  const fxRateValue = Number.isFinite(fxRate) && fxRate > 0 ? fxRate : 11.02;
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
  const combinedBuybacks = useMemo(
    () => combineBuybackSnapshots(oldData, curData),
    [oldData, curData]
  );

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
  const buybackSinceStartSummary = useMemo(() => {
    const positive = combinedBuybacks.filter((row) => Number(row?.Antal_aktier) > 0);
    if (!positive.length) return null;

    const totalSharesRepurchased = positive.reduce(
      (sum, row) => sum + (Number(row?.Antal_aktier) || 0),
      0
    );
    if (!Number.isFinite(totalSharesRepurchased) || totalSharesRepurchased <= 0) return null;

    const startDateRaw = positive[0]?.Datum;
    const startDate = startDateRaw ? new Date(startDateRaw) : null;
    const startYear = Number.isFinite(startDate?.getTime?.()) ? String(startDate.getFullYear()) : null;
    const startBase =
      totalSharesData.find((entry) => String(entry?.date) === startYear)?.totalShares ??
      totalSharesData[0]?.totalShares ??
      null;
    const repurchasedPct =
      Number.isFinite(startBase) && startBase > 0
        ? (totalSharesRepurchased / startBase) * 100
        : null;

    return {
      startDate: startDateRaw || null,
      totalSharesRepurchased,
      repurchasedPct,
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
    if (viewMode === 'daily') base = buildDaily(currentMandateData);
    else if (viewMode === 'weekly') base = buildWeekly(currentMandateData);
    else if (viewMode === 'monthly') base = buildMonthly(currentMandateData);
    else base = buildYearly(currentMandateData);
    return base
      .map((row) => ({ x: toLabel(row.Datum), sharesK: (row.Antal_aktier || 0) / 1_000 }))
      .filter((r) => Number.isFinite(r.sharesK));
  }, [viewMode, currentMandateData]);
  const complianceSeries = useMemo(
    () => buildBuybackComplianceSeries(combinedBuybacks, tradingVolumeByDate, { startDate: CURRENT_BUYBACK_MANDATE_START_DATE }),
    [combinedBuybacks, tradingVolumeByDate]
  );
  const complianceSummary = useMemo(() => summarizeBuybackCompliance(complianceSeries), [complianceSeries]);
  const complianceForecast = useMemo(() => buildBuybackComplianceForecast(tradingVolumeByDate, { horizonTradingDays: 5 }), [tradingVolumeByDate]);
  const weeklyBuybackEstimate = useMemo(
    () => buildBuybackWeeklyEstimate(complianceSeries, tradingVolumeByDate),
    [complianceSeries, tradingVolumeByDate]
  );
  const complianceSeriesWithForecast = useMemo(() => {
    if (!complianceForecast?.rows?.length) return complianceSeries;
    const forecastRows = complianceForecast.rows.map((row) => ({
      date: row.date,
      label: row.label,
      actualShares: null,
      dailyVolume: null,
      averageVolume20: row.averageVolume20,
      maxAllowedShares: row.maxAllowedShares,
      utilizationPct: null,
      remainingCapacity: row.maxAllowedShares,
      nearLimit: false,
      forecast: true,
    }));
    return trimLeadingPlaceholderComplianceRows([...complianceSeries, ...forecastRows]);
  }, [complianceForecast, complianceSeries]);
  const overviewXAxisInterval = useMemo(() => {
    const len = chartData.length;
    if (!len) return 0;
    const targetTicks = isMobile ? 6 : viewMode === 'daily' ? 14 : 18;
    return Math.max(Math.ceil(len / targetTicks) - 1, 0);
  }, [chartData.length, isMobile, viewMode]);
  const overviewXAxisTickFormatter = useMemo(() => {
    if (viewMode !== 'daily') return undefined;
    return (value) => {
      if (typeof value !== 'string') return value;
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return isMobile ? value.slice(5) : value.slice(2);
      return value;
    };
  }, [isMobile, viewMode]);

  // ---- Subview derived data ----
  const evolutionOwnershipData = useMemo(
    () => {
      const series = calculateEvolutionOwnershipPerYear(combinedBuybacks);
      if (!series.length || !Number.isFinite(stats.sharesBought) || stats.sharesBought <= 0) return series;
      return series.map((point, index) => index === series.length - 1 ? { ...point, shares: stats.sharesBought } : point);
    },
    [combinedBuybacks, stats.sharesBought]
  );
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
  const latestEvolutionSnapshotDate = useMemo(
    () => combinedBuybacks.reduce((latest, row) => {
      const date = String(row?.Datum || "").slice(0, 10);
      return date > latest ? date : latest;
    }, ""),
    [combinedBuybacks]
  );
  const latestOwnershipPercentage = useMemo(() => {
    const lastTot = totalSharesData[totalSharesData.length - 1]?.totalShares || 0;
    return lastTot > 0 ? (latestEvolutionShares / lastTot) * 100 : 0;
  }, [latestEvolutionShares]);

  const shareholderOverview = useMemo(
    () => {
      const martinTrend = buildInsiderOwnershipTrend(insiderTransactionsDefault?.items, { person: 'Martin Carlesund' });
      const owners = [
        ...FREE_FLOAT_OWNER_ASSUMPTIONS,
        {
          id: 'evolution-treasury',
          name: 'Evolution AB (egna aktier)',
          shares: Math.max(stats.sharesBought, 0),
          holdingDate: latestEvolutionSnapshotDate || FREE_FLOAT_SNAPSHOT_DATE,
          category: 'Bolagets egna aktier',
          excludeFromStrategicFloat: false,
        },
        {
          id: 'martin-carlesund',
          name: 'Martin Carlesund',
          shares: 784_710,
          holdingDate: '2026-06-26',
          category: 'VD / insider',
          excludeFromStrategicFloat: false,
          trendDirection: martinTrend.direction,
          trendShares: martinTrend.netShares,
          trendTransactions: martinTrend.transactionCount,
        },
      ];
      return calculateShareholderOverview({
        totalShares: latestTotalSharesCount,
        companyTreasuryShares: stats.sharesBought > 0 ? stats.sharesBought : FREE_FLOAT_TREASURY_SHARES,
        owners,
        previousOwners: FREE_FLOAT_PREVIOUS_OWNERS,
        previousTotalShares: FREE_FLOAT_PREVIOUS_TOTAL_SHARES,
      });
    },
    [latestTotalSharesCount, latestEvolutionSnapshotDate, stats.sharesBought]
  );
  const totalBuybackShares = useMemo(
    () => combinedBuybacks.reduce((sum, row) => sum + Math.max(Number(row?.Antal_aktier) || 0, 0), 0),
    [combinedBuybacks]
  );
  const latestVerifiedBuybackDate = useMemo(
    () => currentMandateData.reduce((latest, row) => {
      const date = String(row?.Datum || '').slice(0, 10);
      return date > latest ? date : latest;
    }, ''),
    [currentMandateData]
  );

  const returns = useMemo(() => calculateShareholderReturns(dividendData || {}, combinedBuybacks), [dividendData, combinedBuybacks]);
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

  const getYDomain = (data, key) => {
    return buildNiceYAxisConfig(data, key, viewMode).domain;
  };
  const getYTickValues = (data, key, mode) => {
    return buildNiceYAxisConfig(data, key, mode).ticks;
  };
  const formatYAxisTick = formatBuybackAxisTick;
  const sortedHistoryData = useMemo(() => {
    const arr = Array.isArray(combinedBuybacks) ? [...combinedBuybacks] : [];
    const { key, direction } = sortConfig;
    arr.sort((a, b) => {
      const dir = direction === 'asc' ? 1 : -1;
      if (key === 'Datum') return dir * (new Date(a.Datum) - new Date(b.Datum));
      return dir * (Number(a[key] || 0) - Number(b[key] || 0));
    });
    return arr;
  }, [combinedBuybacks, sortConfig]);
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
        borderRadius: 0,
        border: '1px solid rgba(148,163,184,0.18)',
        boxShadow: '0 20px 45px rgba(15, 23, 42, 0.45)',
        color: '#f8fafc',
        padding: { xs: 3, md: 4 },
        width: '100%',
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
              'Nytt återköpsmandat på 2000 M€ och EST-fördelningen visas här. Jämför senaste veckans återköp, följ takten och se tidslinjen.',
              'The new 2000 M€ buyback mandate and the EST allocation are shown here. Compare the latest week, track pace, and view the timeline.'
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
          {Number.isFinite(buybackCash) && buybackCash > 0 && (
            <Chip
              size="small"
              label={translate(`Nytt mandat: ${fmtEuroMillions(buybackCash)}`, `New mandate: ${fmtEuroMillions(buybackCash)}`)}
              sx={{
                backgroundColor: 'rgba(56,189,248,0.12)',
                color: '#bae6fd',
                borderRadius: '10px',
                border: '1px solid rgba(56,189,248,0.3)',
              }}
            />
          )}
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
        {isMobile ? (
          <Box
            sx={{
              width: '100%',
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 0.8,
            }}
          >
            {SUB_VIEWS.map((opt) => {
              const active = subView === opt.value;
              return (
                <Box
                  key={opt.value}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSubView(opt.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSubView(opt.value);
                    }
                  }}
                  sx={{
                    textAlign: 'center',
                    px: 1.2,
                    py: 1,
                    borderRadius: '12px',
                    border: active ? '1px solid rgba(56,189,248,0.55)' : '1px solid rgba(148,163,184,0.2)',
                    background: active
                      ? 'linear-gradient(135deg, rgba(56,189,248,0.25), rgba(15,23,42,0.55))'
                      : 'rgba(15,23,42,0.38)',
                    color: active ? '#f8fafc' : 'rgba(226,232,240,0.78)',
                    fontSize: '0.88rem',
                    fontWeight: active ? 700 : 600,
                    lineHeight: 1.2,
                    minHeight: 44,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 120ms ease',
                    '&:active': { transform: 'scale(0.99)' },
                  }}
                >
                  {translate(opt.labelSv, opt.labelEn)}
                </Box>
              );
            })}
          </Box>
        ) : (
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
        )}
      </Box>

      {subView === 'overview' && (
        <LiveStockBuyBackOverviewSection
          isMobile={isMobile}
          translate={translate}
          fxRate={fxRate}
          fxUpdatedLabel={fxUpdatedLabel}
          fxPairLabel={fxPairLabel}
          fxRateDisplay={fxRateDisplay}
          buybackBudgetSek={buybackBudgetSek}
          cashUsagePercent={cashUsagePercent}
          remainingCashSharePercent={remainingCashSharePercent}
          buybackCash={buybackCash}
          totalSpent={totalSpent}
          remainingCash={remainingCash}
          sharesAffordable={sharesAffordable}
          currentSharePrice={currentSharePrice}
          est={est}
          FORECAST_CAPITAL_UPDATE_DATE={FORECAST_CAPITAL_UPDATE_DATE}
          fmtNum={fmtNum}
          fmtPercent={fmtPercent}
          fmtCurrency={fmtCurrency}
          fmtEuroMillions={fmtEuroMillions}
          loading={loading}
          error={error}
          chartData={chartData}
          overviewXAxisInterval={overviewXAxisInterval}
          overviewXAxisTickFormatter={overviewXAxisTickFormatter}
          viewMode={viewMode}
          fmtThousands={fmtThousands}
          weekNow={weekNow}
          weekPrev={weekPrev}
          weekDeltaShares={weekDeltaShares}
          weekDeltaSharesPct={weekDeltaSharesPct}
          avgDaily={avgDaily}
          complianceSeries={complianceSeriesWithForecast}
          complianceSummary={complianceSummary}
          complianceLoading={complianceLoading}
          complianceError={complianceError}
        />
      )}

      {subView === 'overview' && (
        <Box
          sx={{
            mt: 2,
            background: 'rgba(15,23,42,0.55)',
            border: '1px solid rgba(148,163,184,0.18)',
            borderRadius: { xs: '14px', md: '16px' },
            mx: { xs: -3, sm: -3, md: -4 },
            px: { xs: 1, sm: 3, md: 4 },
            py: { xs: 2, md: 2.5 },
          }}
        >
          <Stack
            direction={{ xs: 'column', lg: 'row' }}
            spacing={{ xs: 1.4, lg: 3 }}
            alignItems="stretch"
            justifyContent="space-between"
            sx={{ width: '100%' }}
          >
            <Box
              sx={{
                flex: '1 1 0',
                minWidth: { xs: '100%', lg: 440 },
                background: 'rgba(15,23,42,0.45)',
                borderRadius: { xs: '14px', md: '16px' },
                border: '1px solid rgba(148,163,184,0.18)',
                p: { xs: 1.4, md: 2 },
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
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => setShowWeeklyEstimate((value) => !value)}
                    sx={{
                      mt: 0.8,
                      alignSelf: { xs: 'flex-start', lg: 'center' },
                      borderRadius: '999px',
                      textTransform: 'none',
                      px: 1.5,
                      color: '#cbd5f5',
                      borderColor: 'rgba(148,163,184,0.28)',
                      backgroundColor: 'rgba(148,163,184,0.08)',
                      '&:hover': {
                        borderColor: 'rgba(96,165,250,0.42)',
                        backgroundColor: 'rgba(96,165,250,0.12)',
                      },
                    }}
                  >
                    {translate(showWeeklyEstimate ? 'Dölj estimat' : 'Visa veckans estimat', showWeeklyEstimate ? 'Hide estimate' : 'Show weekly estimate')}
                  </Button>
                  {showWeeklyEstimate && (
                    <Box
                      sx={{
                        mt: 1,
                        pt: 1,
                        borderTop: '1px solid rgba(148,163,184,0.12)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 0.3,
                      }}
                    >
                      <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.85)' }}>
                        {translate('Prognos för denna rapportvecka', 'Forecast for this report week')}
                      </Typography>
                      <Typography sx={{ fontWeight: 800, color: '#f8fafc' }}>
                        {weeklyBuybackEstimate
                          ? translate(
                              `≈ ${fmtNum(Math.round(weeklyBuybackEstimate.estimatedShares))} aktier enligt prognosen`,
                              `≈ ${fmtNum(Math.round(weeklyBuybackEstimate.estimatedShares))} shares according to the forecast`
                            )
                          : translate('Ingen estimatdata', 'No estimate data')}
                      </Typography>
                      {weeklyBuybackEstimate && (
                        <Stack spacing={0.15}>
                          <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.85)' }}>
                            {weeklyBuybackEstimate.periodStart && weeklyBuybackEstimate.periodEnd
                              ? translate(
                                  `${weeklyBuybackEstimate.periodStart.toLocaleDateString('sv-SE')}–${weeklyBuybackEstimate.periodEnd.toLocaleDateString('sv-SE')}`,
                                  `${weeklyBuybackEstimate.periodStart.toLocaleDateString('sv-SE')}–${weeklyBuybackEstimate.periodEnd.toLocaleDateString('sv-SE')}`
                                )
                              : '—'}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.85)' }}>
                            {translate(
                              `Baserat på ${fmtNum(weeklyBuybackEstimate.tradingDays)} prognostiserade handelsdagar.`,
                              `Based on ${fmtNum(weeklyBuybackEstimate.tradingDays)} projected trading days.`
                            )}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.85)' }}>
                            {translate(
                              `Antaget snittutnyttjande av 25%-taket, baserat på senaste mätta dagar: ${fmtPercent(weeklyBuybackEstimate.utilizationRate * 100)}`,
                              `Assumed average utilization of the 25% cap, based on the latest measured days: ${fmtPercent(weeklyBuybackEstimate.utilizationRate * 100)}`
                            )}
                          </Typography>
                        </Stack>
                      )}
                    </Box>
                  )}
                </Stack>
              )}
            </Box>

            <Box
              sx={{
                flex: '1 1 0',
                minWidth: { xs: '100%', lg: 440 },
                background: 'rgba(15,23,42,0.45)',
                borderRadius: { xs: '14px', md: '16px' },
                border: '1px solid rgba(148,163,184,0.18)',
                p: { xs: 1.4, md: 2 },
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
        <Box sx={{ mt: 2, mx: { xs: -3, sm: -3, md: 0 } }}>
          <OwnershipView
            isMobile={isMobile}
            evolutionOwnershipData={evolutionOwnershipData}
            ownershipPercentageData={ownershipPercentageData}
            latestEvolutionShares={latestEvolutionShares}
            latestOwnershipPercentage={latestOwnershipPercentage}
            chartTypeOwnership={chartTypeOwnership}
            onChangeChartTypeOwnership={(_e, v) => v && setChartTypeOwnership(v)}
            yDomain={getYDomain(evolutionOwnershipData, 'shares')}
            yTicks={getYTickValues(evolutionOwnershipData, 'shares', 'yearly')}
            formatYAxisTick={formatYAxisTick}
          />
        </Box>
      )}

      {subView === 'total' && (
        <Box sx={{ mt: 2, mx: { xs: -3, sm: -3, md: 0 } }}>
          <TotalSharesView
            isMobile={isMobile}
            totalSharesData={totalSharesData}
            latestTotalShares={totalSharesData.slice(-1)[0]?.totalShares || 0}
            latestEvolutionShares={latestEvolutionShares}
            buybackSinceStartSummary={buybackSinceStartSummary}
            cancelledShares={cancelledShares}
            chartTypeTotalShares={chartTypeTotalShares}
            onChangeChartTypeTotalShares={(_e, v) => v && setChartTypeTotalShares(v)}
            yDomain={getYDomain(totalSharesData, 'totalShares')}
            yTicks={getYTickValues(totalSharesData, 'totalShares', 'yearly')}
          formatYAxisTick={formatYAxisTick}
          />
        </Box>
      )}

      {subView === 'pool' && (
        <Box sx={{ mt: 2, mx: { xs: -3, sm: -3, md: 0 } }}>
          <SharePoolView
            totalShares={latestTotalSharesCount}
            verifiedTreasuryShares={stats.sharesBought}
            latestWeekShares={weeklyBuybackEstimate?.estimatedShares || weekNow.totalShares}
            latestWeekTradingDays={weeklyBuybackEstimate?.tradingDays || weekNow.entries.length}
            latestWeekEnd={latestVerifiedBuybackDate || weekNow.periodEnd}
            displayWeekEnd={weeklyBuybackEstimate?.periodEnd || weekNow.periodEnd}
            isForecast={Boolean(weeklyBuybackEstimate)}
          />
        </Box>
      )}

      {subView === 'freeFloat' && (
        <Box sx={{ mt: 2, mx: { xs: -3, sm: -3, md: 0 } }}>
          <FreeFloatView
            shareholderOverview={shareholderOverview}
            snapshotDate={FREE_FLOAT_SNAPSHOT_DATE}
            treasurySnapshotDate={latestEvolutionSnapshotDate || undefined}
            previousSnapshotDate={FREE_FLOAT_PREVIOUS_SNAPSHOT_DATE}
            currentMandateShares={stats.sharesBought}
            totalBuybackShares={totalBuybackShares}
          />
        </Box>
      )}

      {subView === 'history' && (
        <Box sx={{ mt: 2, mx: { xs: -3, sm: -3, md: 0 } }}>
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
            sortedData={sortedHistoryData}
            sortConfig={sortConfig}
            onSort={onSort}
            historicalPnL={historicalPnL}
            currentSharePrice={currentSharePrice}
            historicalTotals={historicalTotals}
            cancelledShares={cancelledShares}
          />
        </Box>
      )}

      {subView === 'returns' && (
        <Box sx={{ mt: 2, mx: { xs: -3, sm: -3, md: 0 } }}>
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
