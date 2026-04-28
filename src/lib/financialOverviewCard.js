// Shared helpers and configuration for the financial overview card.

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

const buildQuarterlyFinancialSeries = (reportsAscending, formatQuarterAxisLabel) =>
  safeList(reportsAscending).map((report) => ({
    period: `${report.quarter} ${report.year}`,
    xLabel: formatQuarterAxisLabel(report.year, report.quarter),
    year: report.year,
    quarter: report.quarter,
    revenue: Number.isFinite(report.operatingRevenues) ? report.operatingRevenues : null,
    margin: Number.isFinite(report.adjustedOperatingMargin) ? report.adjustedOperatingMargin : null,
    eps: Number.isFinite(report.adjustedEarningsPerShare) ? report.adjustedEarningsPerShare : null,
  }));

const buildAnnualFinancialSeries = (quarterlySeries) => {
  const map = new Map();
  safeList(quarterlySeries).forEach((item) => {
    if (!Number.isFinite(item?.year)) return;
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
      margin: entry.marginCount > 0 ? entry.marginSum / entry.marginCount : null,
      eps: entry.epsCount > 0 ? entry.eps : null,
    }))
    .sort((a, b) => a.year - b.year);
};

const buildRegulatedQuarterlySeries = (reportsAscending, formatQuarterAxisLabel) =>
  safeList(reportsAscending)
    .map((report) => ({
      period: `${report.quarter} ${report.year}`,
      xLabel: formatQuarterAxisLabel(report.year, report.quarter),
      year: report.year,
      quarter: report.quarter,
      totalRevenue: Number.isFinite(report.operatingRevenues) ? report.operatingRevenues : null,
      regulatedShare: Number.isFinite(report.regulatedMarket) ? report.regulatedMarket : null,
    }))
    .filter((row) => Number.isFinite(row.totalRevenue) || Number.isFinite(row.regulatedShare));

const buildRegulatedAnnualSeries = (reportsAscending) => {
  const map = new Map();
  safeList(reportsAscending).forEach((report) => {
    const year = Number(report?.year);
    if (!Number.isFinite(year)) return;
    if (!map.has(year)) {
      map.set(year, { year, totalRevenue: 0, regulatedRevenue: 0 });
    }
    const entry = map.get(year);
    const total = Number(report.operatingRevenues);
    const regulatedPct = Number(report.regulatedMarket);
    if (Number.isFinite(total)) entry.totalRevenue += total;
    if (Number.isFinite(total) && Number.isFinite(regulatedPct)) {
      entry.regulatedRevenue += (total * regulatedPct) / 100;
    }
  });

  return Array.from(map.values())
    .map((entry) => ({
      year: entry.year,
      totalRevenue: entry.totalRevenue,
      regulatedRevenue: entry.regulatedRevenue,
      regulatedShare:
        Number.isFinite(entry.totalRevenue) && entry.totalRevenue > 0
          ? (entry.regulatedRevenue / entry.totalRevenue) * 100
          : null,
    }))
    .sort((a, b) => a.year - b.year);
};

const buildDividendSeries = (dividendData, fxRate) => {
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
    const dividendSek = Number.isFinite(item.dividendPerShare) ? item.dividendPerShare : null;
    const dividendValue =
      Number.isFinite(fxRate) && fxRate > 0 && dividendSek != null ? dividendSek / fxRate : dividendSek;
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
};

const buildGeoQuarterlySeries = (reportsAscending, regionOptions, formatQuarterAxisLabel) =>
  safeList(reportsAscending)
    .map((report) => {
      const entry = {
        period: `${report.quarter} ${report.year}`,
        xLabel: formatQuarterAxisLabel(report.year, report.quarter),
        year: report.year,
        quarter: report.quarter,
      };
      let total = 0;
      safeList(regionOptions).forEach(({ key }) => {
        const raw = Number(report?.[key]);
        const value = Number.isFinite(raw) && raw > 0 ? raw : 0;
        entry[key] = value;
        total += value;
      });
      entry.total = total;
      return entry;
    })
    .filter((entry) => entry.total > 0);

const buildGeoAnnualSeries = (geoQuarterlySeries, regionOptions) => {
  const map = new Map();
  safeList(geoQuarterlySeries).forEach((entry) => {
    if (!Number.isFinite(entry?.year)) return;
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
    safeList(regionOptions).forEach(({ key }) => {
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
};

const buildProductMixQuarterlySeries = (reportsAscending, formatQuarterAxisLabel) =>
  safeList(reportsAscending)
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

const buildProductMixAnnualSeries = (productMixQuarterlySeries) => {
  const map = new Map();
  safeList(productMixQuarterlySeries).forEach((entry) => {
    if (!Number.isFinite(entry?.year)) return;
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
};

const computeCurrentYearProfit = (reports, year) =>
  safeList(reports).reduce(
    (sum, report) =>
      report.year === year &&
      Number.isFinite(report?.adjustedProfitForPeriod)
        ? sum + report.adjustedProfitForPeriod
        : sum,
    0
  );

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
  freeCashFlow: {
    labelSv: "Fritt kassaflöde",
    labelEn: "Free cash flow",
    valueKey: "freeCashFlow",
    decimals: 1,
    unit: "€M",
    changeMode: "percent",
    accent: "#22d3ee",
    background: "rgba(34,211,238,0.12)",
    border: "rgba(34,211,238,0.25)",
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

export {
  QUARTERS,
  quarterToIndex,
  formatMillion,
  formatPercent,
  safeList,
  computeDeltaPercent,
  shortYear,
  formatQuarterAxisLabel,
  toSortedReports,
  toSortedDividends,
  buildQuarterlyFinancialSeries,
  buildAnnualFinancialSeries,
  buildRegulatedQuarterlySeries,
  buildRegulatedAnnualSeries,
  buildDividendSeries,
  buildGeoQuarterlySeries,
  buildGeoAnnualSeries,
  buildProductMixQuarterlySeries,
  buildProductMixAnnualSeries,
  computeCurrentYearProfit,
  BASE_METRIC_CONFIGS,
  formatMetricValue,
  computeChangeValue,
  formatChangeValue,
  METRIC_TOGGLE_OPTIONS,
  VIEW_TOGGLE_OPTIONS,
  REGION_OPTIONS,
};
