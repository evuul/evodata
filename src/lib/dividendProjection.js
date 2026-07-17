// Builds forward dividend scenarios from the latest contiguous quarterly profits.

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];
const PAYOUT_SCENARIOS = [
  { id: "low", payoutRatio: 0.25, labelSv: "25 % av vinsten", labelEn: "25% of profit" },
  { id: "base", payoutRatio: 0.5, labelSv: "50 % av vinsten", labelEn: "50% of profit" },
  { id: "high", payoutRatio: 0.75, labelSv: "75 % av vinsten", labelEn: "75% of profit" },
];

const toPositiveNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const getLatestContiguousYear = (reports) => {
  const byYear = new Map();

  for (const report of Array.isArray(reports) ? reports : []) {
    const year = Number(report?.year);
    const quarter = String(report?.quarter ?? "");
    const profit = Number(report?.adjustedProfitForPeriod);
    if (!Number.isInteger(year) || !QUARTERS.includes(quarter) || !Number.isFinite(profit)) continue;
    if (!byYear.has(year)) byYear.set(year, new Map());
    byYear.get(year).set(quarter, { ...report, adjustedProfitForPeriod: profit });
  }

  const years = [...byYear.keys()].sort((left, right) => right - left);
  for (const year of years) {
    const quarterMap = byYear.get(year);
    const contiguousReports = [];
    for (const quarter of QUARTERS) {
      const report = quarterMap.get(quarter);
      if (!report) break;
      contiguousReports.push(report);
    }
    if (contiguousReports.length) return { year, reports: contiguousReports };
  }

  return null;
};

export const buildAnnualizedDividendProjection = ({
  reports,
  sharesOutstandingMillions,
  fxRate,
  portfolioShares,
} = {}) => {
  const latestYear = getLatestContiguousYear(reports);
  const shareBase = toPositiveNumber(sharesOutstandingMillions);
  const eurSekRate = toPositiveNumber(fxRate);
  if (!latestYear || !shareBase || !eurSekRate) return null;

  const reportedQuarters = latestYear.reports.length;
  const ytdAdjustedProfitEur = latestYear.reports.reduce(
    (sum, report) => sum + report.adjustedProfitForPeriod,
    0
  );
  const annualizedAdjustedProfitEur = (ytdAdjustedProfitEur / reportedQuarters) * QUARTERS.length;
  if (!(annualizedAdjustedProfitEur > 0)) return null;

  const holdingShares = Math.max(0, Number(portfolioShares) || 0);
  const scenarios = PAYOUT_SCENARIOS.map((scenario) => {
    const dividendPerShare =
      (annualizedAdjustedProfitEur * scenario.payoutRatio * eurSekRate) / shareBase;
    return {
      ...scenario,
      dividendPerShare,
      cash: holdingShares * dividendPerShare,
    };
  });

  return {
    sourceYear: latestYear.year,
    latestQuarter: QUARTERS[reportedQuarters - 1],
    reportedQuarters,
    targetYear: latestYear.year + 1,
    ytdAdjustedProfitEur,
    annualizedAdjustedProfitEur,
    sharesOutstandingMillions: shareBase,
    fxRate: eurSekRate,
    scenarios,
  };
};
