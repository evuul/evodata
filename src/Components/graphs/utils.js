// Shared utilities for graph components
export const formatNumberMEUR = (value, isMobile) => {
  if (value == null) return "-";
  if (isMobile && value >= 1000) return `${(value / 1000).toFixed(1)}k MEUR`;
  return `${value} MEUR`;
};

export const formatPercent = (value) => (value == null ? "-" : `${value}%`);

export const formatSEK = (value) =>
  value == null
    ? "-"
    : `${value.toLocaleString("sv-SE", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })} SEK`;

export const formatSEKDecimal = (value, digits = 2) =>
  value == null
    ? "-"
    : `${value.toLocaleString("sv-SE", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      })} SEK`;

export const formatEPSTick = (value) => `${Number(value ?? 0).toFixed(1)} SEK`;

export const buildAllQuarters = (startYear = 2015, endYear = 2025) => {
  const list = [];
  for (let year = startYear; year <= endYear; year++) {
    ["Q1", "Q2", "Q3", "Q4"].forEach((q) => list.push({ year, quarter: q, date: `${year} ${q}` }));
  }
  return list;
};

// Tick-formatters (fabriker + enkla)
export const makeFormatRevenueTick = (isMobile) => (value) => {
  if (value == null) return '-';
  if (isMobile) {
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k MEURO`;
    return `${value} MEURO`;
  }
  return Number(value).toLocaleString('sv-SE');
};

export const makeFormatLiveCasinoRngTick = (isMobile) => (value) => {
  if (value == null) return '-';
  if (isMobile) {
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return `${value}`;
  }
  return `${value} MEUR`;
};

export const formatMarginTickSimple = (value) => `${value}%`;
export const formatDividendTickSimple = (value) => `${value} SEK`;
export const formatDividendYieldTickSimple = (value) => `${value}%`;
