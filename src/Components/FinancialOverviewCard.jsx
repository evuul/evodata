'use client';

import { useEffect, useMemo, useState } from "react";
import { useFxRateContext } from "../context/FxRateContext";
import { useTranslate } from "@/context/LocaleContext";
import {
  Box,
  Typography,
  Grid,
  Chip,
  Divider,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  useTheme,
} from "@mui/material";
import useMediaQuery from "@/lib/useMuiMediaQuery";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];

const quarterToIndex = (year, quarter) => {
  const idx = QUARTERS.indexOf(quarter);
  return idx === -1 ? null : year * 4 + idx;
};

const formatMillion = (value, fractionDigits = 1) =>
  Number.isFinite(value)
    ? value.toLocaleString("sv-SE", { maximumFractionDigits: fractionDigits })
    : "–";

const formatPercent = (value, fractionDigits = 1) =>
  Number.isFinite(value)
    ? `${value > 0 ? "+" : ""}${value.toFixed(fractionDigits)}%`
    : "–";

const safeList = (value) => (Array.isArray(value) ? value : []);

const computeDeltaPercent = (current, reference) => {
  if (!Number.isFinite(current) || !Number.isFinite(reference) || reference === 0) {
    return null;
  }
  return ((current - reference) / reference) * 100;
};

const shortYear = (year) => String(year).slice(-2);

const formatQuarterAxisLabel = (year, quarter) =>
  quarter ? `${quarter}-${shortYear(year)}` : `${shortYear(year)}`;

const toSortedReports = (reports) =>
  safeList(reports)
    .map((report) => {
      const index = quarterToIndex(report.year, report.quarter);
      return index == null ? null : { ...report, index };
    })
    .filter(Boolean)
    .sort((a, b) => b.index - a.index);

const toSortedDividends = (items) =>
  safeList(items)
    .map((item) => ({
      ...item,
      date: item?.date || item?.paymentDate || null,
    }))
    .filter((item) => {
      if (!item.date) return false;
      const time = new Date(item.date).getTime();
      return Number.isFinite(time);
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));

const BASE_METRIC_CONFIGS = {
  revenue: {
    labelSv: "Nettoomsättning",
    labelEn: "Net revenue",
    valueKey: "revenue",
    decimals: 1,
    unit: "€M",
    changeMode: "percent",
    accent: "#60a5fa",
    background: "rgba(59,130,246,0.08)",
    border: "rgba(96,165,250,0.25)",
  },
  margin: {
    labelSv: "Rörelsemarginal (justerad)",
    labelEn: "Operating margin (adjusted)",
    valueKey: "margin",
    decimals: 1,
    unit: "%",
    changeMode: "points",
    accent: "#34d399",
    background: "rgba(16,185,129,0.08)",
    border: "rgba(52,211,153,0.25)",
  },
  eps: {
    labelSv: "Intjäning per aktie (EPS)",
    labelEn: "Earnings per share (EPS)",
    valueKey: "eps",
    decimals: 2,
    unit: "€",
    changeMode: "percent",
    accent: "#f97316",
    background: "rgba(249,115,22,0.08)",
    border: "rgba(251,146,60,0.25)",
  },
  dividend: {
    labelSv: "Utdelning per aktie",
    labelEn: "Dividend per share",
    valueKey: "dividend",
    decimals: 2,
    unit: "€",
    changeMode: "percent",
    accent: "#c4b5fd",
    background: "rgba(167,139,250,0.12)",
    border: "rgba(196,181,253,0.25)",
  },
  geo: {
    labelSv: "Geografisk översikt",
    labelEn: "Geographic overview",
    valueKey: null,
    decimals: 1,
    unit: "%",
    changeMode: "percent",
    accent: "#a855f7",
    background: "rgba(168,85,247,0.12)",
    border: "rgba(168,85,247,0.25)",
    custom: true,
  },
  productMix: {
    labelSv: "Live vs RNG",
    labelEn: "Live vs RNG",
    valueKey: null,
    decimals: 1,
    unit: "%",
    changeMode: "percent",
    accent: "#38bdf8",
    background: "rgba(56,189,248,0.12)",
    border: "rgba(56,189,248,0.25)",
    custom: true,
  },
};

const formatMetricValue = (metricConfigs, metric, value) => {
  if (!Number.isFinite(value)) return "–";
  const config = metricConfigs[metric];
  if (metric === "revenue") {
    return `${formatMillion(value, config.decimals)} ${config.unit}`;
  }
  if (metric === "margin") {
    return `${value.toFixed(config.decimals)}${config.unit}`;
  }
  return `${value.toFixed(config.decimals)} ${config.unit}`;
};

const computeChangeValue = (metricConfigs, metric, current, reference) => {
  if (!Number.isFinite(current) || !Number.isFinite(reference)) return null;
  const config = metricConfigs[metric];
  if (config.changeMode === "points") {
    return current - reference;
  }
  return computeDeltaPercent(current, reference);
};

const formatChangeValue = (metricConfigs, metric, value, label, translate) => {
  const hasLabel = typeof label === "string" && label.length > 0;
  if (value == null) {
    return hasLabel ? translate(`${label} saknas`, `${label} missing`) : translate("Saknas", "Missing");
  }
  const config = metricConfigs[metric];
  if (config.changeMode === "points") {
    const core = `${value >= 0 ? "+" : ""}${value.toFixed(1)} pp`;
    return hasLabel ? `${core} ${label}` : core;
  }
  const core = formatPercent(value);
  return hasLabel ? `${label} ${core}` : core;
};

const METRIC_TOGGLE_OPTIONS = [
  { value: "revenue", labelSv: "Omsättning", labelEn: "Revenue" },
  { value: "margin", labelSv: "Marginal", labelEn: "Margin" },
  { value: "eps", labelSv: "EPS", labelEn: "EPS" },
  { value: "dividend", labelSv: "Utdelning", labelEn: "Dividend" },
  { value: "geo", labelSv: "Geografisk översikt", labelEn: "Geographic overview" },
  { value: "productMix", labelSv: "Live vs RNG", labelEn: "Live vs RNG" },
];

const VIEW_TOGGLE_OPTIONS = [
  { value: "quarterly", labelSv: "Kvartal", labelEn: "Quarter" },
  { value: "annual", labelSv: "Helår", labelEn: "Full year" },
];

const REGION_OPTIONS = [
  { key: "europe", labelSv: "Europa", labelEn: "Europe" },
  { key: "asia", labelSv: "Asien", labelEn: "Asia" },
  { key: "northAmerica", labelSv: "Nordamerika", labelEn: "North America" },
  { key: "latAm", labelSv: "Latinamerika", labelEn: "Latin America" },
  { key: "other", labelSv: "Övrigt", labelEn: "Other" },
];

const FinancialOverviewCard = ({ financialReports, dividendData }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [metric, setMetric] = useState("revenue");
  const [viewMode, setViewMode] = useState("quarterly");
  const translate = useTranslate();

  const metricConfigs = useMemo(() => {
    const entries = {};
    Object.entries(BASE_METRIC_CONFIGS).forEach(([key, config]) => {
      entries[key] = {
        ...config,
        label: translate(config.labelSv, config.labelEn),
      };
    });
    return entries;
  }, [translate]);

  const metricToggleOptions = useMemo(
    () =>
      METRIC_TOGGLE_OPTIONS.map((option) => ({
        value: option.value,
        label: translate(option.labelSv, option.labelEn),
      })),
    [translate]
  );

  const viewToggleOptions = useMemo(
    () =>
      VIEW_TOGGLE_OPTIONS.map((option) => ({
        value: option.value,
        label: translate(option.labelSv, option.labelEn),
      })),
    [translate]
  );

  useEffect(() => {
    if (metric === "dividend" && viewMode !== "annual") {
      setViewMode("annual");
    }
  }, [metric, viewMode]);

  const handleMetricChange = (_event, nextMetric) => {
    if (nextMetric) {
      setMetric(nextMetric);
    }
  };

  const handleViewModeChange = (_event, nextView) => {
    if (nextView) {
      setViewMode(nextView);
    }
  };

  const reports = useMemo(
    () => toSortedReports(financialReports?.financialReports),
    [financialReports]
  );

  const reportsAscending = useMemo(() => [...reports].reverse(), [reports]);

  const latestReport = reports[0] || null;
  const previousYearReport = latestReport
    ? reports.find((report) => report.index === latestReport.index - 4) || null
    : null;
  const currentYearProfit = useMemo(() => {
    if (!latestReport) return null;
    const currentYear = latestReport.year;
    const total = reports
      .filter((report) => report.year === currentYear)
      .reduce(
        (sum, report) =>
          sum +
          (Number.isFinite(report?.adjustedProfitForPeriod)
            ? report.adjustedProfitForPeriod
            : 0),
        0
      );
    return Number.isFinite(total) ? total : null;
  }, [latestReport, reports]);

  const quarterlySeries = useMemo(() => {
    return reportsAscending.map((report) => ({
      period: `${report.quarter} ${report.year}`,
      xLabel: formatQuarterAxisLabel(report.year, report.quarter),
      year: report.year,
      quarter: report.quarter,
      revenue: Number.isFinite(report.operatingRevenues) ? report.operatingRevenues : null,
      margin: Number.isFinite(report.adjustedOperatingMargin) ? report.adjustedOperatingMargin : null,
      eps: Number.isFinite(report.adjustedEarningsPerShare) ? report.adjustedEarningsPerShare : null,
    }));
  }, [reportsAscending]);

  const annualSeries = useMemo(() => {
    const map = new Map();
    quarterlySeries.forEach((item) => {
      if (!Number.isFinite(item.year)) return;
      if (!map.has(item.year)) {
        map.set(item.year, {
          year: item.year,
          revenue: 0,
          marginSum: 0,
          marginCount: 0,
          eps: 0,
          epsCount: 0,
        });
      }
      const entry = map.get(item.year);
      if (Number.isFinite(item.revenue)) entry.revenue += item.revenue;
      if (Number.isFinite(item.margin)) {
        entry.marginSum += item.margin;
        entry.marginCount += 1;
      }
      if (Number.isFinite(item.eps)) {
        entry.eps += item.eps;
        entry.epsCount += 1;
      }
    });

    return Array.from(map.values())
      .map((entry) => ({
        period: `${entry.year}`,
        xLabel: `${entry.year}`,
        year: entry.year,
        revenue: entry.revenue || null,
        margin:
          entry.marginCount > 0
            ? entry.marginSum / entry.marginCount
            : null,
        eps: entry.epsCount > 0 ? entry.eps : null,
      }))
      .sort((a, b) => a.year - b.year);
  }, [quarterlySeries]);

  const { rate: fxRate } = useFxRateContext();

  const dividendSeries = useMemo(() => {
    const items = toSortedDividends([
      ...(dividendData?.historicalDividends || []),
      ...(dividendData?.plannedDividends || []),
    ]);

    return items.map((item) => {
      const date = new Date(item.date);
      const validDate = Number.isFinite(date.getTime());
      const label = validDate
        ? date.toLocaleDateString("sv-SE", { year: "numeric", month: "short" })
        : item.date;
      const year = validDate ? date.getFullYear() : null;
      const isFuture = validDate ? date > new Date() : false;
      const dividendSek = Number.isFinite(item.dividendPerShare)
        ? item.dividendPerShare
        : null;
      const dividendValue =
        Number.isFinite(fxRate) && fxRate > 0 && dividendSek != null
          ? dividendSek / fxRate
          : dividendSek;
      const yieldValue = Number.isFinite(item.sharePriceAtDividend)
        ? (item.dividendPerShare / item.sharePriceAtDividend) * 100
        : Number.isFinite(item.dividendYield)
        ? item.dividendYield
        : null;
      return {
        period: label,
        xLabel: label,
        year,
        dividend: dividendValue,
        yield: yieldValue,
        rawDate: item.date,
        isFuture,
      };
    });
  }, [dividendData, fxRate]);

  const selectedSeries = useMemo(() => {
    const config = metricConfigs[metric];
    if (!config || config.custom || !config.valueKey) {
      return [];
    }
    const source =
      metric === "dividend"
        ? dividendSeries.filter((item) => Number.isFinite(item.dividend))
        : (viewMode === "annual" ? annualSeries : quarterlySeries).filter((item) =>
            Number.isFinite(item[metricConfigs[metric].valueKey])
          );
    return source.map((item) => ({
      ...item,
      xLabel: item.xLabel || item.period,
    }));
  }, [metric, viewMode, dividendSeries, annualSeries, quarterlySeries, metricConfigs]);

  const chartDomain = useMemo(() => {
    const config = metricConfigs[metric];
    if (!config || config.custom || !config.valueKey || !selectedSeries.length) {
      return [0, 1];
    }
    const key = config.valueKey;
    const values = selectedSeries
      .map((item) => Number(item[key]))
      .filter((value) => Number.isFinite(value));
    if (!values.length) return [0, 1];

    let min = Math.min(...values);
    let max = Math.max(...values);

    if (metric === "margin") {
      const padding = 3;
      min = Math.max(0, Math.floor(min - padding));
      max = Math.min(100, Math.ceil(max + padding));
      if (min === max) {
        min = Math.max(0, min - 5);
        max = Math.min(100, max + 5);
      }
    } else {
      const range = max - min;
      const padding = range > 0 ? range * 0.1 : max * 0.1 || 1;
      min = Math.max(0, min - padding);
      max = max + padding;
      if (min === max) {
        min = Math.max(0, min - 1);
        max = max + 1;
      }
    }

    return [min, max];
  }, [metric, selectedSeries, metricConfigs]);

  const xAxisInterval = useMemo(() => {
    const config = metricConfigs[metric];
    if (!config || config.custom) return 0;
    const dataLength = selectedSeries.length;
    if (!dataLength) return 0;
    if (metric === "dividend") return Math.max(dataLength - 12, 0);
    if (viewMode === "quarterly") {
      const divisor = isMobile ? 6 : 10;
      return Math.max(Math.floor(dataLength / divisor) - 1, 0);
    }
    return Math.max(Math.floor(dataLength / (isMobile ? 5 : 8)) - 1, 0);
  }, [selectedSeries, metric, viewMode, isMobile]);

  const selectedSummary = useMemo(() => {
    const config = metricConfigs[metric];
    if (!config || config.custom || !config.valueKey) {
      return {
        latestLabel: null,
        latestValue: null,
        changeQoQ: null,
        changeYoY: null,
        previousLabel: null,
        yoyLabel: null,
        highValue: null,
        highLabel: null,
        lowValue: null,
        lowLabel: null,
        trendText: "",
      };
    }
    const key = config.valueKey;

    if (!selectedSeries.length) {
      return {
        latestLabel: null,
        latestValue: null,
        changeQoQ: null,
        changeYoY: null,
        previousLabel: null,
        yoyLabel: null,
        highValue: null,
        highLabel: null,
        lowValue: null,
        lowLabel: null,
        trendText: translate("Ingen data att visa ännu.", "No data to display yet."),
      };
    }

    const latestIndex = selectedSeries.length - 1;
    const latest = selectedSeries[latestIndex];
    const previous = latestIndex > 0 ? selectedSeries[latestIndex - 1] : null;

    let yoyReference = null;
    if (metric === "dividend" || viewMode === "annual") {
      yoyReference = previous;
    } else {
      const yoyIndex = latestIndex - 4;
      if (yoyIndex >= 0) {
        yoyReference = selectedSeries[yoyIndex];
      }
    }

    const latestValue = Number.isFinite(latest[key]) ? latest[key] : null;
    const previousValue = previous && Number.isFinite(previous[key]) ? previous[key] : null;
    const yoyValue = yoyReference && Number.isFinite(yoyReference[key]) ? yoyReference[key] : null;

    const changeQoQ = computeChangeValue(metricConfigs, metric, latestValue, previousValue);
    const changeYoY = computeChangeValue(metricConfigs, metric, latestValue, yoyValue);

    let highValue = null;
    let lowValue = null;
    let highLabel = null;
    let lowLabel = null;

    selectedSeries.forEach((item) => {
      const value = Number(item[key]);
      if (!Number.isFinite(value)) return;
      if (highValue == null || value > highValue) {
        highValue = value;
        highLabel = item.period;
      }
      if (lowValue == null || value < lowValue) {
        lowValue = value;
        lowLabel = item.period;
      }
    });

    const primaryChange = changeYoY != null ? changeYoY : changeQoQ;
    const primaryLabel = changeYoY != null ? "YoY" : changeQoQ != null ? "QoQ" : null;

    const trendText =
      primaryLabel && primaryChange != null
        ? (() => {
            const directionSv = primaryChange >= 0 ? "upp" : "ned";
            const directionEn = primaryChange >= 0 ? "up" : "down";
            const amount =
              config.changeMode === "points"
                ? `${Math.abs(primaryChange).toFixed(1)} pp`
                : `${Math.abs(primaryChange).toFixed(1)}%`;
            const latestValueLabel = formatMetricValue(metricConfigs, metric, latestValue);
            return translate(
              `${config.label} är ${directionSv} ${amount} ${primaryLabel} (senaste: ${latestValueLabel} – ${latest.period}).`,
              `${config.label} is ${directionEn} ${amount} ${primaryLabel} (latest: ${latestValueLabel} – ${latest.period}).`
            );
          })()
        : translate("Saknar referens för att visa trend.", "Missing reference to show trend.");

    return {
      latestLabel: latest.period,
      latestValue,
      changeQoQ,
      changeYoY,
      previousLabel: previous?.period || null,
      yoyLabel: yoyReference?.period || null,
      highValue,
      highLabel,
      lowValue,
      lowLabel,
      trendText,
    };
  }, [metric, viewMode, selectedSeries, metricConfigs, translate]);

  const metricSummaries = useMemo(() => {
    return metricToggleOptions
      .filter(({ value }) => !metricConfigs[value]?.custom)
      .map(({ value }) => {
        const config = metricConfigs[value];
        const source = value === "dividend" ? dividendSeries : quarterlySeries;
        const filtered = source.filter((item) => Number.isFinite(item[config.valueKey]));
        if (!filtered.length) {
          return {
            metric: value,
            label: config.label,
            valueLabel: "–",
            changeText: translate("Δ saknas", "Δ missing"),
            periodLabel: null,
            active: value === metric,
            accent: config.accent,
            background: config.background,
            border: config.border,
          };
        }
        const latest = filtered[filtered.length - 1];
        const previous = filtered.length > 1 ? filtered[filtered.length - 2] : null;
        const change = computeChangeValue(
          metricConfigs,
          value,
          latest[config.valueKey],
          previous?.[config.valueKey]
        );
        const changeLabel = value === "dividend" ? "Δ" : "QoQ";
        return {
          metric: value,
          label: config.label,
          valueLabel: formatMetricValue(metricConfigs, value, latest[config.valueKey]),
          changeText: formatChangeValue(metricConfigs, value, change, changeLabel, translate),
          periodLabel: latest.period,
          active: value === metric,
          accent: config.accent,
          background: config.background,
          border: config.border,
        };
      });
  }, [metric, quarterlySeries, dividendSeries, metricConfigs, translate, metricToggleOptions]);

  const geoQuarterlySeries = useMemo(() => {
    return reportsAscending
      .map((report) => {
        const entry = {
          period: `${report.quarter} ${report.year}`,
          xLabel: formatQuarterAxisLabel(report.year, report.quarter),
          year: report.year,
          quarter: report.quarter,
        };
        let total = 0;
        REGION_OPTIONS.forEach(({ key }) => {
          const raw = Number(report?.[key]);
          const value = Number.isFinite(raw) && raw > 0 ? raw : 0;
          entry[key] = value;
          total += value;
        });
        entry.total = total;
        return entry;
      })
      .filter((entry) => entry.total > 0);
  }, [reportsAscending]);

  const geoAnnualSeries = useMemo(() => {
    const map = new Map();
    geoQuarterlySeries.forEach((entry) => {
      if (!Number.isFinite(entry.year)) return;
      if (!map.has(entry.year)) {
        map.set(entry.year, {
          year: entry.year,
          xLabel: `${entry.year}`,
          period: `${entry.year}`,
          europe: 0,
          asia: 0,
          northAmerica: 0,
          latAm: 0,
          other: 0,
          total: 0,
        });
      }
      const target = map.get(entry.year);
      REGION_OPTIONS.forEach(({ key }) => {
        const value = Number(entry[key]);
        if (Number.isFinite(value)) {
          target[key] += value;
          target.total += value;
        }
      });
    });
    return Array.from(map.values())
      .filter((entry) => entry.total > 0)
      .sort((a, b) => a.year - b.year);
  }, [geoQuarterlySeries]);

  const productMixQuarterlySeries = useMemo(() => {
    return reportsAscending
      .map((report) => {
        const live = Number.isFinite(report?.liveCasino) ? Math.max(report.liveCasino, 0) : 0;
        const rng = Number.isFinite(report?.rng) ? Math.max(report.rng, 0) : 0;
        const total = live + rng;
        return {
          period: `${report.quarter} ${report.year}`,
          xLabel: formatQuarterAxisLabel(report.year, report.quarter),
          year: report.year,
          quarter: report.quarter,
          liveCasino: live,
          rng,
          total,
        };
      })
      .filter((entry) => entry.total > 0);
  }, [reportsAscending]);

  const productMixAnnualSeries = useMemo(() => {
    const map = new Map();
    productMixQuarterlySeries.forEach((entry) => {
      if (!Number.isFinite(entry.year)) return;
      if (!map.has(entry.year)) {
        map.set(entry.year, {
          year: entry.year,
          xLabel: `${entry.year}`,
          period: `${entry.year}`,
          liveCasino: 0,
          rng: 0,
          total: 0,
        });
      }
      const target = map.get(entry.year);
      const live = Number(entry.liveCasino);
      const rng = Number(entry.rng);
      if (Number.isFinite(live)) {
        target.liveCasino += live;
        target.total += live;
      }
      if (Number.isFinite(rng)) {
        target.rng += rng;
        target.total += rng;
      }
    });
    return Array.from(map.values())
      .filter((entry) => entry.total > 0)
      .sort((a, b) => a.year - b.year);
  }, [productMixQuarterlySeries]);

  const selectedGeoSeries = viewMode === "annual" ? geoAnnualSeries : geoQuarterlySeries;
  const selectedProductMixSeries =
    viewMode === "annual" ? productMixAnnualSeries : productMixQuarterlySeries;

  const geoSnapshot = useMemo(() => {
    const dataset = viewMode === "annual" ? geoAnnualSeries : geoQuarterlySeries;
    if (!dataset.length) return null;
    const latestEntry = dataset[dataset.length - 1];
    const regions = REGION_OPTIONS.map(({ key, labelSv, labelEn }) => {
      const raw = Number(latestEntry?.[key]);
      const value = Number.isFinite(raw) && raw > 0 ? raw : 0;
      return { key, label: translate(labelSv, labelEn), value };
    }).filter((item) => item.value > 0);
    const total = regions.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) return null;
    return {
      period: latestEntry.period,
      total,
      regions: regions
        .map((item) => ({
          ...item,
          share: item.value / total,
        }))
        .sort((a, b) => b.value - a.value),
    };
  }, [geoAnnualSeries, geoQuarterlySeries, viewMode, translate]);

  const productMixSnapshot = useMemo(() => {
    const dataset = viewMode === "annual" ? productMixAnnualSeries : productMixQuarterlySeries;
    if (!dataset.length) return null;
    const latestEntry = dataset[dataset.length - 1];
    const live = Number.isFinite(latestEntry?.liveCasino) ? Math.max(latestEntry.liveCasino, 0) : 0;
    const rng = Number.isFinite(latestEntry?.rng) ? Math.max(latestEntry.rng, 0) : 0;
    const total = live + rng;
    if (total === 0) return null;
    return {
      period: latestEntry.period,
      live,
      rng,
      total,
      liveShare: live / total,
      rngShare: rng / total,
    };
  }, [productMixAnnualSeries, productMixQuarterlySeries, viewMode]);

  const isStandardMetric = Boolean(metricConfigs[metric] && !metricConfigs[metric].custom);
  const gradientId = `financial-${metric}`;
  const yAxisKey = metricConfigs[metric]?.valueKey;

  const formatYAxisTick = (value) => {
    if (!isStandardMetric) return value;
    if (!Number.isFinite(value)) return "";
    if (metric === "revenue") {
      return formatMillion(value, value >= 100 ? 0 : 1);
    }
    if (metric === "margin") {
      return `${value.toFixed(0)}%`;
    }
    return value.toFixed(metricConfigs[metric].decimals);
  };

  const formatGeoTooltipValue = (value) =>
    Number.isFinite(value) ? `${formatMillion(value, value >= 100 ? 0 : 1)} €M` : "–";

  const formatShare = (value) =>
    Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : "–";

  return (
    <Box
      sx={{
        background: "linear-gradient(135deg, #0f172a, #1f2937)",
        borderRadius: { xs: 0, md: "18px" },
        border: "1px solid rgba(148,163,184,0.18)",
        boxShadow: "0 20px 45px rgba(15, 23, 42, 0.45)",
        color: "#f8fafc",

        // BLEED inom sidan/container
        mx: { xs: -2, sm: -3, md: -4 },
        px: { xs: 2, sm: 3, md: 4 },
        py: { xs: 2.5, md: 4 },
        overflow: "visible",
      }}
    >
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
          <Typography
            variant="overline"
            sx={{ letterSpacing: 1, color: "rgba(148,163,184,0.65)" }}
          >
            {translate("Finansiell intelligens", "Financial intelligence")}
          </Typography>
          <Typography
            variant={isMobile ? "h5" : "h4"}
            sx={{ fontWeight: 700, color: "#f8fafc" }}
          >
            {translate("Finansiell översikt", "Financial overview")}
          </Typography>
          <Typography sx={{ color: "rgba(226,232,240,0.7)", mt: 1, maxWidth: 520 }}>
            {translate(
              "Navigera mellan nyckeltal och följ utvecklingen för Evolution genom interaktiva grafer och sammanfattande statistik.",
              "Navigate between key metrics and track Evolution through interactive charts and summary statistics."
            )}
          </Typography>
        </Box>

        <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
          {latestReport && (
            <Chip
              label={translate(
                `Senaste kvartal: ${latestReport.quarter} ${latestReport.year}`,
                `Latest quarter: ${latestReport.quarter} ${latestReport.year}`
              )}
              size="small"
              sx={{
                backgroundColor: "rgba(59,130,246,0.15)",
                color: "#93c5fd",
                fontWeight: 500,
              }}
            />
          )}
          {previousYearReport && (
            <Chip
              label={translate(
                `YoY-jämförelse: ${previousYearReport.quarter} ${previousYearReport.year}`,
                `YoY comparison: ${previousYearReport.quarter} ${previousYearReport.year}`
              )}
              size="small"
              sx={{
                backgroundColor: "rgba(168,85,247,0.15)",
                color: "#d8b4fe",
                fontWeight: 500,
              }}
            />
          )}
          {Number.isFinite(currentYearProfit) && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                background: "linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.08))",
                borderRadius: "12px",
                border: "1px solid rgba(34,197,94,0.35)",
                px: { xs: 1.5, md: 2 },
                py: { xs: 0.7, md: 0.9 },
              }}
            >
              <Box
                sx={{
                  width: 10,
                  height: 40,
                  borderRadius: "999px",
                  background: "linear-gradient(180deg, #22c55e, #16a34a)",
                  boxShadow: "0 0 12px rgba(34,197,94,0.45)",
                }}
              />
              <Box>
                <Typography
                  sx={{
                    color: "rgba(148,163,184,0.75)",
                    fontSize: "0.75rem",
                    letterSpacing: 0.6,
                    textTransform: "uppercase",
                  }}
                >
                  {translate("Årets justerade vinst", "Adjusted profit YTD")}
                </Typography>
                <Typography
                  variant={isMobile ? "h6" : "h5"}
                  sx={{
                    fontWeight: 700,
                    color: "#f8fafc",
                    letterSpacing: 0.4,
                  }}
                >
                  {`${formatMillion(currentYearProfit, 1)} €M`}
                </Typography>
              </Box>
            </Box>
          )}
        </Stack>
      </Box>

      <Divider sx={{ borderColor: "rgba(148,163,184,0.2)", my: { xs: 3, md: 4 } }} />

      <Grid container spacing={isMobile ? 1.5 : 2.5}>
        <Grid item xs={12} md={9}>
          <Box
            sx={{
              background: "rgba(15,23,42,0.55)",
              borderRadius: "16px",
              border: "1px solid rgba(148,163,184,0.18)",
              p: { xs: 2, md: 3 },
              height: "100%",
              display: "flex",
              flexDirection: "column",
              gap: { xs: 2, md: 3 },
            }}
          >
            <Stack
              direction={isMobile ? "column" : "row"}
              spacing={isMobile ? 2 : 3}
              alignItems={isMobile ? "flex-start" : "center"}
              justifyContent="space-between"
            >
              <ToggleButtonGroup
                value={metric}
                exclusive
                onChange={handleMetricChange}
                size={isMobile ? "small" : "medium"}
                sx={{
                  backgroundColor: "rgba(148,163,184,0.12)",
                  borderRadius: "999px",
                  p: 0.5,
                  flexWrap: "wrap",
                }}
              >
                {metricToggleOptions.map((option) => (
                  <ToggleButton
                    key={option.value}
                    value={option.value}
                    sx={{
                      textTransform: "none",
                      color: "rgba(226,232,240,0.75)",
                      border: 0,
                      borderRadius: "999px!important",
                      px: { xs: 1.5, md: 2.5 },
                      py: 0.75,
                      "&.Mui-selected": {
                        color: "#f8fafc",
                        backgroundColor: `${metricConfigs[option.value].accent}22`,
                      },
                      "&.Mui-selected:hover": {
                        backgroundColor: `${metricConfigs[option.value].accent}33`,
                      },
                    }}
                  >
                    {option.label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>

              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={handleViewModeChange}
                size="small"
                sx={{
                  backgroundColor: "rgba(148,163,184,0.12)",
                  borderRadius: "999px",
                  p: 0.5,
                }}
              >
                {viewToggleOptions.map((option) => (
                  <ToggleButton
                    key={option.value}
                    value={option.value}
                    disabled={metric === "dividend" && option.value === "quarterly"}
                    sx={{
                      textTransform: "none",
                      color: "rgba(226,232,240,0.75)",
                      border: 0,
                      borderRadius: "999px!important",
                      px: { xs: 1.5, md: 2 },
                      "&.Mui-selected": {
                        color: "#f8fafc",
                        backgroundColor: "rgba(96,165,250,0.25)",
                      },
                    }}
                  >
                    {option.label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Stack>

            <Box sx={{ height: isMobile ? 280 : 380 }}>
              {isStandardMetric ? (
                selectedSeries.length ? (
                  <ResponsiveContainer>
                    <AreaChart data={selectedSeries} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={metricConfigs[metric].accent} stopOpacity={0.6} />
                          <stop offset="95%" stopColor={metricConfigs[metric].accent} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(148,163,184,0.15)" strokeDasharray="4 4" />
                      <XAxis
                        dataKey="xLabel"
                        tick={{ fontSize: isMobile ? 11 : 12, fill: "rgba(148,163,184,0.75)" }}
                        tickLine={false}
                        axisLine={{ stroke: "rgba(148,163,184,0.25)" }}
                        interval={xAxisInterval}
                        minTickGap={isMobile ? 8 : 16}
                      />
                      <YAxis
                        tick={{ fontSize: isMobile ? 11 : 12, fill: "rgba(148,163,184,0.75)" }}
                        tickLine={false}
                        axisLine={{ stroke: "rgba(148,163,184,0.25)" }}
                        domain={chartDomain}
                        width={isMobile ? 46 : 56}
                        tickFormatter={formatYAxisTick}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          background: "rgba(15,23,42,0.92)",
                          border: "1px solid rgba(96,165,250,0.25)",
                          borderRadius: 12,
                          color: "#f8fafc",
                        }}
                        labelStyle={{ color: "rgba(226,232,240,0.8)" }}
                        labelFormatter={(_label, payload) => {
                          const original = payload && payload[0] && payload[0].payload?.period;
                          return original || _label;
                        }}
                        formatter={(value) => [
                          formatMetricValue(metricConfigs, metric, Number(value)),
                          metricConfigs[metric].label,
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey={yAxisKey}
                        stroke={metricConfigs[metric].accent}
                        strokeWidth={2.5}
                        fill={`url(#${gradientId})`}
                        fillOpacity={1}
                        animationDuration={800}
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
                      {translate("Ingen data att visualisera för valt läge.", "No data to visualize for this mode.")}
                    </Typography>
                  </Box>
                )
              ) : metric === "geo" ? (
                selectedGeoSeries.length ? (
                  <ResponsiveContainer>
                    <AreaChart data={selectedGeoSeries} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="rgba(148,163,184,0.15)" strokeDasharray="4 4" />
                      <XAxis
                        dataKey="xLabel"
                        tick={{ fontSize: isMobile ? 11 : 12, fill: "rgba(148,163,184,0.75)" }}
                        tickLine={false}
                        axisLine={{ stroke: "rgba(148,163,184,0.25)" }}
                        minTickGap={isMobile ? 8 : 16}
                      />
                      <YAxis
                        tick={{ fontSize: isMobile ? 11 : 12, fill: "rgba(148,163,184,0.75)" }}
                        tickLine={false}
                        axisLine={{ stroke: "rgba(148,163,184,0.25)" }}
                        tickFormatter={(value) => formatMillion(value, value >= 100 ? 0 : 1)}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          background: "rgba(15,23,42,0.92)",
                          border: "1px solid rgba(168,85,247,0.25)",
                          borderRadius: 12,
                          color: "#f8fafc",
                        }}
                        labelFormatter={(_label, payload) =>
                          payload && payload[0] && payload[0].payload?.period
                            ? payload[0].payload.period
                            : "–"
                        }
                        formatter={(value, name) => [formatGeoTooltipValue(value), name]}
                      />
                      <Legend
                        verticalAlign="top"
                        height={36}
                        wrapperStyle={{ color: "rgba(226,232,240,0.78)" }}
                      />
                      <Area
                        type="monotone"
                        dataKey="europe"
                        name={translate("Europa", "Europe")}
                        stroke="#60a5fa"
                        fill="#60a5fa44"
                        strokeWidth={2}
                        stackId="regions"
                        dot={false}
                      />
                      <Area
                        type="monotone"
                        dataKey="asia"
                        name={translate("Asien", "Asia")}
                        stroke="#fbbf24"
                        fill="#fbbf2444"
                        strokeWidth={2}
                        stackId="regions"
                        dot={false}
                      />
                      <Area
                        type="monotone"
                        dataKey="northAmerica"
                        name={translate("Nordamerika", "North America")}
                        stroke="#34d399"
                        fill="#34d39944"
                        strokeWidth={2}
                        stackId="regions"
                        dot={false}
                      />
                      <Area
                        type="monotone"
                        dataKey="latAm"
                        name={translate("Latinamerika", "Latin America")}
                        stroke="#f97316"
                        fill="#f9731644"
                        strokeWidth={2}
                        stackId="regions"
                        dot={false}
                      />
                      <Area
                        type="monotone"
                        dataKey="other"
                        name={translate("Övrigt", "Other")}
                        stroke="#a855f7"
                        fill="#a855f744"
                        strokeWidth={2}
                        stackId="regions"
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
                      {translate("Ingen geografisk data tillgänglig.", "No geographic data available.")}
                    </Typography>
                  </Box>
                )
              ) : metric === "productMix" ? (
                selectedProductMixSeries.length ? (
                  <ResponsiveContainer>
                    <AreaChart data={selectedProductMixSeries} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="rgba(148,163,184,0.15)" strokeDasharray="4 4" />
                      <XAxis
                        dataKey="xLabel"
                        tick={{ fontSize: isMobile ? 11 : 12, fill: "rgba(148,163,184,0.75)" }}
                        tickLine={false}
                        axisLine={{ stroke: "rgba(148,163,184,0.25)" }}
                        minTickGap={isMobile ? 8 : 16}
                      />
                      <YAxis
                        tick={{ fontSize: isMobile ? 11 : 12, fill: "rgba(148,163,184,0.75)" }}
                        tickLine={false}
                        axisLine={{ stroke: "rgba(148,163,184,0.25)" }}
                        tickFormatter={(value) => formatMillion(value, value >= 100 ? 0 : 1)}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          background: "rgba(15,23,42,0.92)",
                          border: "1px solid rgba(56,189,248,0.25)",
                          borderRadius: 12,
                          color: "#f8fafc",
                        }}
                        labelFormatter={(_label, payload) =>
                          payload && payload[0] && payload[0].payload?.period
                            ? payload[0].payload.period
                            : "–"
                        }
                        formatter={(value, name) => [formatGeoTooltipValue(value), name]}
                      />
                      <Legend
                        verticalAlign="top"
                        height={36}
                        wrapperStyle={{ color: "rgba(226,232,240,0.78)" }}
                      />
                      <Area
                        type="monotone"
                        dataKey="liveCasino"
                        name={translate("Live Casino", "Live Casino")}
                        stroke="#38bdf8"
                        fill="#38bdf844"
                        strokeWidth={2.2}
                        stackId="products"
                        dot={false}
                      />
                      <Area
                        type="monotone"
                        dataKey="rng"
                        name={translate("RNG", "RNG")}
                        stroke="#f87171"
                        fill="#f8717144"
                        strokeWidth={2.2}
                        stackId="products"
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
                      {translate("Ingen produktmix-data tillgänglig.", "No product mix data available.")}
                    </Typography>
                  </Box>
                )
              ) : null}
            </Box>

            {isStandardMetric ? (
              <>
                <Stack
                  direction={isMobile ? "column" : "row"}
                  spacing={isMobile ? 1.5 : 2}
                >
                  <Box
                    sx={{
                      flex: 1,
                      background: "rgba(148,163,184,0.08)",
                      borderRadius: "12px",
                      border: "1px solid rgba(148,163,184,0.12)",
                      p: 2,
                    }}
                  >
                    <Typography sx={{ color: "rgba(148,163,184,0.75)", fontSize: "0.85rem" }}>
                      {translate("Senaste", "Latest")}
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: "#f8fafc" }}>
                      {formatMetricValue(metricConfigs, metric, selectedSummary.latestValue)}
                    </Typography>
                    <Typography sx={{ color: "rgba(148,163,184,0.7)", fontSize: "0.8rem", mt: 0.5 }}>
                      {selectedSummary.latestLabel || "–"}
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      flex: 1,
                      background: "rgba(148,163,184,0.08)",
                      borderRadius: "12px",
                      border: "1px solid rgba(148,163,184,0.12)",
                      p: 2,
                    }}
                  >
                    <Typography sx={{ color: "rgba(148,163,184,0.75)", fontSize: "0.85rem" }}>
                      QoQ
                    </Typography>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 700,
                        color: Number.isFinite(selectedSummary.changeQoQ)
                          ? selectedSummary.changeQoQ >= 0
                            ? "#34d399"
                            : "#f87171"
                          : "rgba(226,232,240,0.75)",
                      }}
                    >
                      {formatChangeValue(
                        metricConfigs,
                        metric,
                        selectedSummary.changeQoQ,
                        "",
                        translate
                      ).replace(/\s$/, "")}
                    </Typography>
                    <Typography sx={{ color: "rgba(148,163,184,0.7)", fontSize: "0.8rem", mt: 0.5 }}>
                      {selectedSummary.previousLabel
                        ? translate(
                            `vs ${selectedSummary.previousLabel}`,
                            `vs ${selectedSummary.previousLabel}`
                          )
                        : "–"}
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      flex: 1,
                      background: "rgba(148,163,184,0.08)",
                      borderRadius: "12px",
                      border: "1px solid rgba(148,163,184,0.12)",
                      p: 2,
                    }}
                  >
                    <Typography sx={{ color: "rgba(148,163,184,0.75)", fontSize: "0.85rem" }}>
                      YoY
                    </Typography>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 700,
                        color: Number.isFinite(selectedSummary.changeYoY)
                          ? selectedSummary.changeYoY >= 0
                            ? "#34d399"
                            : "#f87171"
                          : "rgba(226,232,240,0.75)",
                      }}
                    >
                      {formatChangeValue(
                        metricConfigs,
                        metric,
                        selectedSummary.changeYoY,
                        "",
                        translate
                      ).replace(/\s$/, "")}
                    </Typography>
                    <Typography sx={{ color: "rgba(148,163,184,0.7)", fontSize: "0.8rem", mt: 0.5 }}>
                      {selectedSummary.yoyLabel
                        ? translate(`vs ${selectedSummary.yoyLabel}`, `vs ${selectedSummary.yoyLabel}`)
                        : "–"}
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      flex: 1,
                      background: "rgba(148,163,184,0.08)",
                      borderRadius: "12px",
                      border: "1px solid rgba(148,163,184,0.12)",
                      p: 2,
                    }}
                  >
                    <Typography sx={{ color: "rgba(148,163,184,0.75)", fontSize: "0.85rem" }}>
                      {translate("Spann", "Range")}
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: "#f8fafc" }}>
                      {`${formatMetricValue(metricConfigs, metric, selectedSummary.lowValue)} → ${formatMetricValue(
                        metricConfigs,
                        metric,
                        selectedSummary.highValue
                      )}`}
                    </Typography>
                    <Typography sx={{ color: "rgba(148,163,184,0.7)", fontSize: "0.8rem", mt: 0.5 }}>
                      {selectedSummary.lowLabel && selectedSummary.highLabel
                        ? `${selectedSummary.lowLabel} • ${selectedSummary.highLabel}`
                        : "–"}
                    </Typography>
                  </Box>
                </Stack>

                <Typography sx={{ color: "rgba(226,232,240,0.75)", fontSize: "0.9rem" }}>
                  {selectedSummary.trendText}
                </Typography>
              </>
            ) : metric === "geo" ? (
              <>
                <Typography sx={{ color: "rgba(226,232,240,0.75)", fontSize: "0.9rem" }}>
                  {translate(
                    `Fördelning per region baserat på rapporterade segmentintäkter. Värden anges i miljoner euro (${geoSnapshot?.period ?? "–"}).`,
                    `Regional split based on reported segment revenue. Values are in millions of euro (${geoSnapshot?.period ?? "–"}).`
                  )}
                </Typography>
                {geoSnapshot ? (
                  <Stack
                    direction={isMobile ? "column" : "row"}
                    spacing={isMobile ? 1.5 : 2}
                    sx={{ mt: 1 }}
                  >
                    {geoSnapshot.regions.slice(0, 4).map((region) => (
                      <Box
                        key={region.key}
                        sx={{
                          flex: 1,
                          background: "rgba(168,85,247,0.08)",
                          borderRadius: "12px",
                          border: "1px solid rgba(168,85,247,0.2)",
                          p: 2,
                        }}
                      >
                        <Typography sx={{ color: "rgba(228,228,247,0.75)", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: 0.6 }}>
                          {region.label}
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: "#f8fafc" }}>
                          {`${formatMillion(region.value, region.value >= 100 ? 0 : 1)} €M`}
                        </Typography>
                        <Typography sx={{ color: "rgba(226,232,240,0.65)", fontSize: "0.8rem" }}>
                          {translate(
                            `${formatShare(region.share)} av perioden`,
                            `${formatShare(region.share)} of the period`
                          )}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Typography sx={{ color: "rgba(148,163,184,0.7)", fontSize: "0.85rem", mt: 1 }}>
                    {translate("Ingen geografisk data tillgänglig.", "No geographic data available.")}
                  </Typography>
                )}
              </>
            ) : metric === "productMix" ? (
              <>
                <Typography sx={{ color: "rgba(226,232,240,0.75)", fontSize: "0.9rem" }}>
                  {translate(
                    `Produktmix visar fördelningen mellan Live Casino och RNG-intäkter (${productMixSnapshot?.period ?? "–"}).`,
                    `Product mix shows the split between Live Casino and RNG revenue (${productMixSnapshot?.period ?? "–"}).`
                  )}
                </Typography>
                {productMixSnapshot ? (
                  <Stack
                    direction={isMobile ? "column" : "row"}
                    spacing={isMobile ? 1.5 : 2}
                    sx={{ mt: 1 }}
                  >
                    <Box
                      sx={{
                        flex: 1,
                        background: "rgba(56,189,248,0.08)",
                        borderRadius: "12px",
                        border: "1px solid rgba(56,189,248,0.2)",
                        p: 2,
                      }}
                    >
                      <Typography sx={{ color: "rgba(148,163,184,0.75)", fontSize: "0.85rem" }}>
                        {translate("Live Casino", "Live Casino")}
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: "#f8fafc" }}>
                        {`${formatMillion(productMixSnapshot.live, productMixSnapshot.live >= 100 ? 0 : 1)} €M`}
                      </Typography>
                      <Typography sx={{ color: "rgba(226,232,240,0.65)", fontSize: "0.8rem" }}>
                        {translate(
                          `${formatShare(productMixSnapshot.liveShare)} av mixen`,
                          `${formatShare(productMixSnapshot.liveShare)} of the mix`
                        )}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        flex: 1,
                        background: "rgba(248,113,113,0.1)",
                        borderRadius: "12px",
                        border: "1px solid rgba(248,113,113,0.25)",
                        p: 2,
                      }}
                    >
                      <Typography sx={{ color: "rgba(148,163,184,0.75)", fontSize: "0.85rem" }}>
                        {translate("RNG", "RNG")}
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: "#f8fafc" }}>
                        {`${formatMillion(productMixSnapshot.rng, productMixSnapshot.rng >= 100 ? 0 : 1)} €M`}
                      </Typography>
                      <Typography sx={{ color: "rgba(226,232,240,0.65)", fontSize: "0.8rem" }}>
                        {translate(
                          `${formatShare(productMixSnapshot.rngShare)} av mixen`,
                          `${formatShare(productMixSnapshot.rngShare)} of the mix`
                        )}
                      </Typography>
                    </Box>
                  </Stack>
                ) : (
                  <Typography sx={{ color: "rgba(148,163,184,0.7)", fontSize: "0.85rem", mt: 1 }}>
                    {translate("Ingen produktmix-data tillgänglig.", "No product mix data available.")}
                  </Typography>
                )}
              </>
            ) : null}
          </Box>
        </Grid>

        <Grid item xs={12} md={3}>
          <Stack spacing={2.5} sx={{ height: "100%" }}>
            {metricSummaries.map((summary) => (
              <Box
                key={summary.metric}
                sx={{
                  background: summary.background,
                  borderRadius: "14px",
                  border: summary.active
                    ? `1px solid ${summary.accent}`
                    : "1px solid rgba(148,163,184,0.18)",
                  p: 2.5,
                  display: "flex",
                  flexDirection: "column",
                  gap: 0.75,
                  transition: "border 0.2s ease, transform 0.2s ease",
                  transform: summary.active ? "translateY(-2px)" : "none",
                }}
              >
                <Typography sx={{ color: "rgba(148,163,184,0.75)", fontSize: "0.85rem", fontWeight: 600 }}>
                  {summary.label}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: "#f8fafc" }}>
                  {summary.valueLabel}
                </Typography>
                <Typography sx={{ color: "rgba(148,163,184,0.75)", fontSize: "0.85rem" }}>
                  {summary.changeText}
                </Typography>
                {summary.periodLabel && (
                  <Typography sx={{ color: "rgba(148,163,184,0.65)", fontSize: "0.8rem" }}>
                    {translate("Senast", "Latest")}: {summary.periodLabel}
                  </Typography>
                )}
              </Box>
            ))}
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};

export default FinancialOverviewCard;
