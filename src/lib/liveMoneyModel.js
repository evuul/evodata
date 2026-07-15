// Pure calculations for the report-based Live Money visualization.

const QUARTER_ORDER = { Q1: 1, Q2: 2, Q3: 3, Q4: 4 };
const SECONDS_PER_DAY = 24 * 60 * 60;

export const quarterDayCount = (year, quarter) => {
  const quarterNumber = QUARTER_ORDER[quarter];
  if (!Number.isFinite(Number(year)) || !quarterNumber) return 92;

  const start = Date.UTC(Number(year), (quarterNumber - 1) * 3, 1);
  const end = Date.UTC(Number(year), quarterNumber * 3, 0);
  return Math.max(1, Math.round((end - start) / (24 * 60 * 60 * 1000)) + 1);
};

export const buildLiveMoneyModel = ({ reports = [], fxRate = 11.02 } = {}) => {
  const latestReport = [...reports]
    .filter((report) => report?.year && QUARTER_ORDER[report?.quarter])
    .sort((a, b) => Number(a.year) - Number(b.year) || QUARTER_ORDER[a.quarter] - QUARTER_ORDER[b.quarter])
    .at(-1) || null;

  const fx = Number(fxRate);
  const safeFx = Number.isFinite(fx) && fx > 0 ? fx : 11.02;
  const profitMEUR = Number(latestReport?.adjustedProfitForPeriod) || 0;
  const quarterDays = quarterDayCount(Number(latestReport?.year), latestReport?.quarter);
  const quarterProfitSEK = profitMEUR * 1_000_000 * safeFx;
  const perDay = quarterProfitSEK / quarterDays;
  const perSecond = perDay / SECONDS_PER_DAY;

  const year = latestReport?.year;
  const yearReports = reports.filter((report) => Number(report?.year) === Number(year));
  const ytdProfitMEUR = yearReports.reduce((sum, report) => {
    const value = Number(report?.adjustedProfitForPeriod);
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);

  return {
    latestReport,
    fx: safeFx,
    profitMEUR,
    quarterDays,
    quarterProfitSEK,
    perSecond,
    perMinute: perSecond * 60,
    perHour: perSecond * 60 * 60,
    perDay,
    ytdProfitMEUR: Number.isFinite(ytdProfitMEUR) ? ytdProfitMEUR : null,
    reportedQuarters: yearReports.length,
    totalQuarters: 4,
    eps: Number(latestReport?.adjustedEarningsPerShare) || null,
  };
};
