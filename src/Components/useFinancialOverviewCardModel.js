"use client";

// Data- och vylogik för financial overview-kortet.

import { useEffect, useMemo, useState } from "react";
import { useFxRateContext } from "../context/FxRateContext";
import { useTranslate } from "@/context/LocaleContext";
import {
  BASE_METRIC_CONFIGS,
  buildAnnualFinancialSeries,
  buildDividendSeries,
  buildGeoAnnualSeries,
  buildGeoQuarterlySeries,
  buildProductMixAnnualSeries,
  buildProductMixQuarterlySeries,
  buildQuarterlyFinancialSeries,
  buildRegulatedAnnualSeries,
  buildRegulatedQuarterlySeries,
  computeCurrentYearProfit,
  METRIC_TOGGLE_OPTIONS,
  REGION_OPTIONS,
  VIEW_TOGGLE_OPTIONS,
  computeChangeValue,
  CHART_RANGE_OPTIONS,
  buildFinancialXAxisTicks,
  buildNiceAxisScale,
  filterFinancialSeriesByRange,
  formatFinancialXAxisTick,
  formatMetricValue,
  formatQuarterAxisLabel,
  formatChangeValue,
  formatMillion,
  toSortedReports,
} from "@/lib/financialOverviewCard";

export function useFinancialOverviewCardModel({ financialReports, dividendData, isMobile }) {
  const translate = useTranslate();
  const { rate: fxRate } = useFxRateContext();
  const [metric, setMetric] = useState("revenue");
  const [viewMode, setViewMode] = useState("quarterly");
  const [wideMetric, setWideMetric] = useState("revenue");
  const [wideViewMode, setWideViewMode] = useState("quarterly");
  const [wideRange, setWideRange] = useState("5y");
  const [regulatedView, setRegulatedView] = useState("annual");
  const [regulatedChartType, setRegulatedChartType] = useState("line");

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

  const chartRangeOptions = useMemo(
    () =>
      CHART_RANGE_OPTIONS.map((option) => ({
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

  useEffect(() => {
    if (wideMetric === "dividend" && wideViewMode !== "annual") {
      setWideViewMode("annual");
    }
  }, [wideMetric, wideViewMode]);

  const reports = useMemo(
    () => toSortedReports(financialReports?.financialReports),
    [financialReports]
  );

  const reportsAscending = useMemo(() => [...reports].reverse(), [reports]);

  const latestReport = reports[0] || null;
  const previousYearReport = latestReport
    ? reports.find((report) => report.index === latestReport.index - 4) || null
    : null;

  const currentYearProfit = useMemo(
    () => (latestReport ? computeCurrentYearProfit(reports, latestReport.year) : null),
    [latestReport, reports]
  );

  const quarterlySeries = useMemo(
    () => buildQuarterlyFinancialSeries(reportsAscending, formatQuarterAxisLabel),
    [reportsAscending]
  );

  const annualSeries = useMemo(() => buildAnnualFinancialSeries(quarterlySeries), [quarterlySeries]);

  const regulatedQuarterlySeries = useMemo(
    () => buildRegulatedQuarterlySeries(reportsAscending, formatQuarterAxisLabel),
    [reportsAscending]
  );

  const regulatedAnnualSeries = useMemo(
    () => buildRegulatedAnnualSeries(reportsAscending),
    [reportsAscending]
  );

  const regulatedSeries = regulatedView === "quarterly" ? regulatedQuarterlySeries : regulatedAnnualSeries;

  const dividendSeries = useMemo(() => buildDividendSeries(dividendData, fxRate), [dividendData, fxRate]);

  const selectedSeries = useMemo(() => {
    const config = metricConfigs[metric];
    if (!config || config.custom || !config.valueKey) return [];
    const source =
      metric === "dividend"
        ? dividendSeries.filter((item) => Number.isFinite(item.dividend))
        : (viewMode === "annual" ? annualSeries : quarterlySeries).filter((item) =>
            Number.isFinite(item[config.valueKey])
          );
    return source.map((item) => ({ ...item, xLabel: item.xLabel || item.period }));
  }, [metric, viewMode, dividendSeries, annualSeries, quarterlySeries, metricConfigs]);

  const wideFullSeries = useMemo(() => {
    const config = metricConfigs[wideMetric];
    if (!config || config.custom || !config.valueKey) return [];
    const source =
      wideMetric === "dividend"
        ? dividendSeries.filter((item) => Number.isFinite(item.dividend))
        : (wideViewMode === "annual" ? annualSeries : quarterlySeries).filter((item) =>
            Number.isFinite(item[config.valueKey])
          );
    return source.map((item) => ({ ...item, xLabel: item.xLabel || item.period }));
  }, [wideMetric, wideViewMode, dividendSeries, annualSeries, quarterlySeries, metricConfigs]);

  const wideSelectedSeries = useMemo(
    () => filterFinancialSeriesByRange(wideFullSeries, wideRange, wideViewMode),
    [wideFullSeries, wideRange, wideViewMode]
  );

  const widePeak = useMemo(() => {
    if (!wideSelectedSeries.length || !metricConfigs[wideMetric]?.valueKey) return null;
    const key = metricConfigs[wideMetric].valueKey;
    const peak = wideSelectedSeries.reduce((best, item) =>
      Number(item[key]) > Number(best?.[key]) ? item : best
    );
    const latest = wideSelectedSeries.at(-1);
    const peakValue = Number(peak?.[key]);
    const latestValue = Number(latest?.[key]);
    return {
      value: Number.isFinite(peakValue) ? peakValue : null,
      period: peak?.period || null,
      distance:
        Number.isFinite(peakValue) && Number.isFinite(latestValue)
          ? computeChangeValue(metricConfigs, wideMetric, latestValue, peakValue)
          : null,
    };
  }, [wideSelectedSeries, wideMetric, metricConfigs]);

  const chartDomain = useMemo(() => {
    const config = metricConfigs[metric];
    if (!config || config.custom || !config.valueKey || !selectedSeries.length) return [0, 1];
    const values = selectedSeries
      .map((item) => Number(item[config.valueKey]))
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

  const wideAxisScale = useMemo(() => {
    const config = metricConfigs[wideMetric];
    if (!config || config.custom || !config.valueKey || !wideSelectedSeries.length) {
      return { domain: [0, 1], ticks: [0, 1] };
    }
    const values = wideSelectedSeries
      .map((item) => Number(item[config.valueKey]))
      .filter((value) => Number.isFinite(value));
    if (!values.length) return { domain: [0, 1], ticks: [0, 1] };
    if (wideMetric === "margin") {
      return buildNiceAxisScale(values, { targetIntervals: 5, minLimit: 0, maxLimit: 100 });
    }
    return buildNiceAxisScale(values, {
      includeZero: wideRange === "max",
      targetIntervals: isMobile ? 4 : 5,
      minLimit: 0,
    });
  }, [wideMetric, wideSelectedSeries, metricConfigs, wideRange, isMobile]);

  const wideXAxisTicks = useMemo(
    () => buildFinancialXAxisTicks(wideSelectedSeries, wideViewMode, isMobile ? 4 : 8),
    [wideSelectedSeries, wideViewMode, isMobile]
  );

  const formatWideXAxisTick = (value) => formatFinancialXAxisTick(value, wideSelectedSeries, wideViewMode);

  const wideSummary = useMemo(() => {
    const config = metricConfigs[wideMetric];
    if (!config || config.custom || !config.valueKey || !wideSelectedSeries.length) {
      return { latest: null, qoq: null, yoy: null, latestLabel: null, previousLabel: null, yoyLabel: null };
    }
    const key = config.valueKey;
    const latestIndex = wideSelectedSeries.length - 1;
    const latest = wideSelectedSeries[latestIndex];
    const previous = latestIndex > 0 ? wideSelectedSeries[latestIndex - 1] : null;
    const usesAnnualComparison = wideMetric === "dividend" || wideViewMode === "annual";
    const yoyRef =
      usesAnnualComparison
        ? latestIndex - 3 >= 0
          ? wideSelectedSeries[latestIndex - 3]
          : null
        : latestIndex - 4 >= 0
        ? wideSelectedSeries[latestIndex - 4]
        : null;
    const latestValue = Number.isFinite(latest[key]) ? latest[key] : null;
    const previousValue = previous && Number.isFinite(previous[key]) ? previous[key] : null;
    const yoyValue = yoyRef && Number.isFinite(yoyRef[key]) ? yoyRef[key] : null;
    const longTermChange =
      usesAnnualComparison &&
      config.changeMode !== "points" &&
      Number.isFinite(latestValue) &&
      Number.isFinite(yoyValue) &&
      yoyValue > 0
        ? ((latestValue / yoyValue) ** (1 / 3) - 1) * 100
        : computeChangeValue(metricConfigs, wideMetric, latestValue, yoyValue);
    return {
      latest: latestValue,
      qoq: computeChangeValue(metricConfigs, wideMetric, latestValue, previousValue),
      yoy: longTermChange,
      latestLabel: latest?.period || null,
      previousLabel: previous?.period || null,
      yoyLabel: yoyRef?.period || null,
    };
  }, [wideMetric, wideViewMode, wideSelectedSeries, metricConfigs]);

  const wideTrendText = useMemo(() => {
    const config = metricConfigs[wideMetric];
    if (!config || config.custom || !config.valueKey || !wideSelectedSeries.length) {
      return translate("Ingen data att visa ännu.", "No data to display yet.");
    }
    const key = config.valueKey;
    const latestIndex = wideSelectedSeries.length - 1;
    const latest = wideSelectedSeries[latestIndex];
    const previous = latestIndex > 0 ? wideSelectedSeries[latestIndex - 1] : null;
    const yoyRef =
      wideMetric === "dividend" || wideViewMode === "annual"
        ? previous
        : latestIndex - 4 >= 0
        ? wideSelectedSeries[latestIndex - 4]
        : null;
    const latestValue = Number.isFinite(latest?.[key]) ? latest[key] : null;
    const previousValue = previous && Number.isFinite(previous?.[key]) ? previous[key] : null;
    const yoyValue = yoyRef && Number.isFinite(yoyRef?.[key]) ? yoyRef[key] : null;
    const changeQoQ = computeChangeValue(metricConfigs, wideMetric, latestValue, previousValue);
    const changeYoY = computeChangeValue(metricConfigs, wideMetric, latestValue, yoyValue);
    const primaryChange = changeYoY != null ? changeYoY : changeQoQ;
    const primaryLabel = changeYoY != null ? "YoY" : changeQoQ != null ? "QoQ" : null;
    if (primaryChange == null || !primaryLabel) {
      return translate("Saknar referens för att visa trend.", "Missing reference to show trend.");
    }
    const directionSv = primaryChange >= 0 ? "upp" : "ned";
    const directionEn = primaryChange >= 0 ? "up" : "down";
    const amount =
      config.changeMode === "points"
        ? `${Math.abs(primaryChange).toFixed(1)} pp`
        : `${Math.abs(primaryChange).toFixed(1)}%`;
    const latestValueLabel = formatMetricValue(metricConfigs, wideMetric, latestValue);
    return translate(
      `${config.label} är ${directionSv} ${amount} ${primaryLabel} (senaste: ${latestValueLabel} – ${latest?.period}).`,
      `${config.label} is ${directionEn} ${amount} ${primaryLabel} (latest: ${latestValueLabel} – ${latest?.period}).`
    );
  }, [metricConfigs, translate, wideMetric, wideSelectedSeries, wideViewMode]);

  const selectedSeriesTicks = useMemo(() => {
    if (!selectedSeries.length) return undefined;
    const maxTicks = isMobile ? 4 : 8;
    if (selectedSeries.length <= maxTicks) return selectedSeries.map((item) => item.xLabel);
    const step = Math.ceil((selectedSeries.length - 1) / (maxTicks - 1));
    const ticks = [];
    for (let i = 0; i < selectedSeries.length; i += step) {
      ticks.push(selectedSeries[i].xLabel);
    }
    const lastLabel = selectedSeries[selectedSeries.length - 1]?.xLabel;
    if (lastLabel && ticks[ticks.length - 1] !== lastLabel) ticks.push(lastLabel);
    return ticks;
  }, [selectedSeries, isMobile]);

  const regulatedXAxisKey = regulatedView === "quarterly" ? "xLabel" : "year";
  const regulatedXAxisTicks = useMemo(() => {
    if (!regulatedSeries.length) return undefined;
    const maxTicks = isMobile ? 4 : 9;
    if (regulatedSeries.length <= maxTicks) return regulatedSeries.map((item) => item[regulatedXAxisKey]);
    const step = Math.ceil((regulatedSeries.length - 1) / (maxTicks - 1));
    const ticks = [];
    for (let i = 0; i < regulatedSeries.length; i += step) {
      ticks.push(regulatedSeries[i][regulatedXAxisKey]);
    }
    const lastTick = regulatedSeries[regulatedSeries.length - 1]?.[regulatedXAxisKey];
    if (lastTick != null && ticks[ticks.length - 1] !== lastTick) ticks.push(lastTick);
    return ticks;
  }, [regulatedSeries, regulatedXAxisKey, isMobile]);

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
    const key = config.valueKey;
    const latestIndex = selectedSeries.length - 1;
    const latest = selectedSeries[latestIndex];
    const previous = latestIndex > 0 ? selectedSeries[latestIndex - 1] : null;
    const yoyReference =
      metric === "dividend" || viewMode === "annual"
        ? previous
        : latestIndex - 4 >= 0
        ? selectedSeries[latestIndex - 4]
        : null;
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
        const change = computeChangeValue(metricConfigs, value, latest[config.valueKey], previous?.[config.valueKey]);
        const changeLabel = value === "dividend" ? "YoY" : "QoQ";
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

  const geoQuarterlySeries = useMemo(
    () => buildGeoQuarterlySeries(reportsAscending, REGION_OPTIONS, formatQuarterAxisLabel),
    [reportsAscending]
  );
  const geoAnnualSeries = useMemo(() => buildGeoAnnualSeries(geoQuarterlySeries, REGION_OPTIONS), [geoQuarterlySeries]);
  const productMixQuarterlySeries = useMemo(
    () => buildProductMixQuarterlySeries(reportsAscending, formatQuarterAxisLabel),
    [reportsAscending]
  );
  const productMixAnnualSeries = useMemo(
    () => buildProductMixAnnualSeries(productMixQuarterlySeries),
    [productMixQuarterlySeries]
  );
  const selectedGeoSeries = viewMode === "annual" ? geoAnnualSeries : geoQuarterlySeries;
  const selectedProductMixSeries = viewMode === "annual" ? productMixAnnualSeries : productMixQuarterlySeries;
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
        .map((item) => ({ ...item, share: item.value / total }))
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
  const wideGeoSeries = useMemo(
    () =>
      filterFinancialSeriesByRange(
        wideViewMode === "annual" ? geoAnnualSeries : geoQuarterlySeries,
        wideRange,
        wideViewMode
      ),
    [wideViewMode, wideRange, geoAnnualSeries, geoQuarterlySeries]
  );
  const wideProductMixSeries = useMemo(
    () =>
      filterFinancialSeriesByRange(
        wideViewMode === "annual" ? productMixAnnualSeries : productMixQuarterlySeries,
        wideRange,
        wideViewMode
      ),
    [wideViewMode, wideRange, productMixAnnualSeries, productMixQuarterlySeries]
  );
  const wideGeoSnapshot = useMemo(() => {
    const dataset = wideViewMode === "annual" ? geoAnnualSeries : geoQuarterlySeries;
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
        .map((item) => ({ ...item, share: item.value / total }))
        .sort((a, b) => b.value - a.value),
    };
  }, [geoAnnualSeries, geoQuarterlySeries, wideViewMode, translate]);
  const wideProductMixSnapshot = useMemo(() => {
    const dataset = wideViewMode === "annual" ? productMixAnnualSeries : productMixQuarterlySeries;
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
  }, [productMixAnnualSeries, productMixQuarterlySeries, wideViewMode]);
  const isStandardMetric = Boolean(metricConfigs[metric] && !metricConfigs[metric].custom);
  const isWideStandardMetric = Boolean(metricConfigs[wideMetric] && !metricConfigs[wideMetric].custom);
  const yAxisKey = metricConfigs[metric]?.valueKey;
  const formatYAxisTick = (value) => {
    if (!isStandardMetric) return value;
    if (!Number.isFinite(value)) return "";
    if (metric === "revenue") {
      if (isMobile && Math.abs(value) >= 1000) return `${Math.round(value / 1000)}k`;
      return formatMillion(value, value >= 100 ? 0 : 1);
    }
    if (metric === "margin") return `${value.toFixed(0)}%`;
    return value.toFixed(metricConfigs[metric].decimals);
  };
  const formatCompactAxisLabel = (value) => {
    if (!isMobile) return value;
    if (value == null) return "";
    const text = String(value);
    if (text.includes("-")) return text;
    if (/^\d{4}\sQ\d$/.test(text)) return text.replace(" ", " ");
    return text;
  };
  const formatGeoTooltipValue = (value) =>
    Number.isFinite(value) ? `${formatMillion(value, value >= 100 ? 0 : 1)} €M` : "–";
  const formatShare = (value) => (Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : "–");
  const formatChangeColor = (value) => {
    if (!Number.isFinite(value)) return "rgba(226,232,240,0.75)";
    return value >= 0 ? "#34d399" : "#f87171";
  };

  return {
    metric,
    setMetric,
    viewMode,
    setViewMode,
    wideMetric,
    setWideMetric,
    wideViewMode,
    setWideViewMode,
    wideRange,
    setWideRange,
    regulatedView,
    setRegulatedView,
    regulatedChartType,
    setRegulatedChartType,
    metricConfigs,
    metricToggleOptions,
    viewToggleOptions,
    chartRangeOptions,
    reports,
    reportsAscending,
    latestReport,
    previousYearReport,
    currentYearProfit,
    quarterlySeries,
    annualSeries,
    regulatedQuarterlySeries,
    regulatedAnnualSeries,
    regulatedSeries,
    dividendSeries,
    selectedSeries,
    wideSelectedSeries,
    widePeak,
    chartDomain,
    wideChartDomain: wideAxisScale.domain,
    wideChartTicks: wideAxisScale.ticks,
    wideXAxisTicks,
    formatWideXAxisTick,
    wideSummary,
    wideTrendText,
    selectedSeriesTicks,
    regulatedXAxisKey,
    regulatedXAxisTicks,
    selectedSummary,
    metricSummaries,
    geoQuarterlySeries,
    geoAnnualSeries,
    productMixQuarterlySeries,
    productMixAnnualSeries,
    selectedGeoSeries,
    selectedProductMixSeries,
    geoSnapshot,
    productMixSnapshot,
    wideGeoSeries,
    wideProductMixSeries,
    wideGeoSnapshot,
    wideProductMixSnapshot,
    isStandardMetric,
    isWideStandardMetric,
    yAxisKey,
    formatYAxisTick,
    formatCompactAxisLabel,
    formatGeoTooltipValue,
    formatShare,
    formatChangeColor,
  };
}
