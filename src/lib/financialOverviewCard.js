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
  BASE_METRIC_CONFIGS,
  formatMetricValue,
  computeChangeValue,
  formatChangeValue,
  METRIC_TOGGLE_OPTIONS,
  VIEW_TOGGLE_OPTIONS,
  REGION_OPTIONS,
};
