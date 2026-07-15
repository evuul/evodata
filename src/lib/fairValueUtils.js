// Builds a validated, driver-based fair value range from quarterly fundamentals.

import { summarizeBuybackExecution } from "./buybackMandate.js";

const REQUIRED_QUARTERS = 8;
const FORECAST_YEARS = 5;
const CAPEX_HAIRCUT = 0.12;
const LIQUIDITY_RESERVE_REVENUE_SHARE = 0.15;
const DCF_WEIGHT = 0.55;
const PE_WEIGHT = 0.45;
const MIN_PE = 9;
const MAX_PE = 28;

export const MIN_FWD_GROWTH = -0.15;
export const MAX_FWD_GROWTH = 0.22;

const SCENARIO_CONFIG = Object.freeze([
  {
    id: "fair",
    label: "Fair Value",
    variant: "base",
    growthDelta: 0,
    marginDelta: 0,
    peDelta: 0,
    discountRate: 0.1,
    terminalGrowth: 0.025,
  },
  {
    id: "bull",
    label: "Bull",
    variant: "bull",
    growthDelta: 0.05,
    marginDelta: 2,
    peDelta: 1,
    discountRate: 0.09,
    terminalGrowth: 0.03,
  },
  {
    id: "bear",
    label: "Bear",
    variant: "bear",
    growthDelta: -0.05,
    marginDelta: -3,
    peDelta: -1,
    discountRate: 0.12,
    terminalGrowth: 0.01,
  },
]);

export const resolveFairValueReports = (liveReports, fallbackReports) =>
  Array.isArray(liveReports) && liveReports.length > 0
    ? liveReports
    : Array.isArray(fallbackReports)
      ? fallbackReports
      : [];

export const quarterToNumber = (quarter) =>
  quarter === "Q1" ? 1 : quarter === "Q2" ? 2 : quarter === "Q3" ? 3 : quarter === "Q4" ? 4 : 0;

export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const toFiniteNumber = (value) => {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const average = (values) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

const sumField = (rows, field) =>
  rows.reduce((sum, row) => sum + row[field], 0);

const weightedAnnualizedAverage = (rows, field) => {
  const weighted = rows.reduce(
    (result, row, index) => {
      const weight = index + 1;
      return {
        sum: result.sum + row[field] * weight,
        weight: result.weight + weight,
      };
    },
    { sum: 0, weight: 0 }
  );
  return weighted.weight ? (weighted.sum / weighted.weight) * 4 : null;
};

const reportPeriodIndex = (report) => report.year * 4 + quarterToNumber(report.quarter) - 1;

const reportQuarterEndDate = (report) => {
  const suffix = {
    Q1: "03-31",
    Q2: "06-30",
    Q3: "09-30",
    Q4: "12-31",
  }[report?.quarter];
  return suffix && Number.isInteger(report?.year) ? `${report.year}-${suffix}` : null;
};

export const normalizeFairValueReports = (reports = []) => {
  if (!Array.isArray(reports)) {
    return { reports: [], warnings: ["invalid_reports"] };
  }

  const warnings = [];
  const periods = new Map();
  let invalidCount = 0;
  let duplicateCount = 0;

  reports.forEach((report) => {
    const year = toFiniteNumber(report?.year);
    const quarter = report?.quarter;
    const normalized = {
      ...report,
      year,
      quarter,
      adjustedEarningsPerShare: toFiniteNumber(report?.adjustedEarningsPerShare),
      adjustedOperatingMargin: toFiniteNumber(report?.adjustedOperatingMargin),
      operatingRevenues: toFiniteNumber(report?.operatingRevenues),
      ocfPerShare: toFiniteNumber(report?.ocfPerShare),
      cashAndCashEquivalents: toFiniteNumber(report?.cashAndCashEquivalents),
    };
    const valid =
      Number.isInteger(year) &&
      quarterToNumber(quarter) > 0 &&
      normalized.adjustedEarningsPerShare != null &&
      normalized.adjustedOperatingMargin != null &&
      normalized.operatingRevenues != null &&
      normalized.operatingRevenues > 0 &&
      normalized.ocfPerShare != null;

    if (!valid) {
      invalidCount += 1;
      return;
    }

    const key = `${year}-${quarter}`;
    if (periods.has(key)) duplicateCount += 1;
    periods.set(key, normalized);
  });

  if (invalidCount) warnings.push("invalid_reports");
  if (duplicateCount) warnings.push("duplicate_periods");

  const normalizedReports = [...periods.values()].sort(
    (a, b) => reportPeriodIndex(a) - reportPeriodIndex(b)
  );
  const latestWindow = normalizedReports.slice(-REQUIRED_QUARTERS);
  const consecutive = latestWindow.every(
    (report, index) => index === 0 || reportPeriodIndex(report) === reportPeriodIndex(latestWindow[index - 1]) + 1
  );
  if (latestWindow.length === REQUIRED_QUARTERS && !consecutive) {
    warnings.push("non_consecutive_quarters");
  }

  return { reports: normalizedReports, warnings };
};

const smoothPeFromFundamentals = (growth, operatingMargin) => {
  const growthContribution = clamp(growth, -0.1, 0.18) * 30;
  const marginContribution = clamp((operatingMargin - 45) * 0.08, -1.5, 2);
  return clamp(14 + growthContribution + marginContribution, MIN_PE, MAX_PE);
};

const projectOwnerEarningsValue = ({
  ownerEarningsPerShareEur,
  nearTermGrowth,
  discountRate,
  terminalGrowth,
  excessCashPerShareEur,
  fxRate,
}) => {
  if (
    ownerEarningsPerShareEur <= 0 ||
    discountRate <= terminalGrowth ||
    fxRate <= 0
  ) {
    return null;
  }

  let ownerEarnings = ownerEarningsPerShareEur;
  let presentValue = 0;
  for (let year = 1; year <= FORECAST_YEARS; year += 1) {
    const fade = (year - 1) / (FORECAST_YEARS - 1);
    const growth = nearTermGrowth + (terminalGrowth - nearTermGrowth) * fade;
    ownerEarnings *= 1 + growth;
    presentValue += ownerEarnings / (1 + discountRate) ** year;
  }

  const terminalValue =
    (ownerEarnings * (1 + terminalGrowth)) / (discountRate - terminalGrowth);
  const discountedTerminal = terminalValue / (1 + discountRate) ** FORECAST_YEARS;
  return (presentValue + discountedTerminal + excessCashPerShareEur) * fxRate;
};

const buildEmptyResult = (warnings = []) => ({
  latestLabel: "",
  annualEpsTTMSEK: null,
  annualEpsNormSEK: null,
  avgMargin: null,
  yoyGrowth: null,
  revenueGrowth: null,
  revTtmMEUR: null,
  ownerEarningsPerShareSEK: null,
  scenarios: [],
  valuationRange: { low: null, midpoint: null, high: null },
  buybackInfo: null,
  dataQuality: { status: "error", warnings, quarterCount: 0 },
  sensitivity: null,
  raw: { ttmEpsEUR: null, normalizedEpsEUR: null },
});

const buildSensitivity = ({
  ownerEarningsPerShareEur,
  nearTermGrowth,
  excessCashPerShareEur,
  fxRate,
}) => {
  const discountRates = [0.11, 0.1, 0.09];
  const terminalGrowthRates = [0.015, 0.025, 0.035];
  return {
    discountRates,
    terminalGrowthRates,
    values: discountRates.map((discountRate) =>
      terminalGrowthRates.map((terminalGrowth) =>
        projectOwnerEarningsValue({
          ownerEarningsPerShareEur,
          nearTermGrowth,
          discountRate,
          terminalGrowth,
          excessCashPerShareEur,
          fxRate,
        })
      )
    ),
  };
};

export const computeFairValueInsights = ({
  reports,
  buybackData = [],
  sharesData = [],
  fxRate,
  currentPriceSEK,
} = {}) => {
  const fx = toFiniteNumber(fxRate);
  if (fx == null || fx <= 0) return buildEmptyResult(["invalid_fx"]);

  const normalized = normalizeFairValueReports(reports);
  const latestEight = normalized.reports.slice(-REQUIRED_QUARTERS);
  const hasGap = normalized.warnings.includes("non_consecutive_quarters");
  if (latestEight.length < REQUIRED_QUARTERS || hasGap) {
    const warnings = latestEight.length < REQUIRED_QUARTERS
      ? [...normalized.warnings, "not_enough_reports"]
      : normalized.warnings;
    return buildEmptyResult([...new Set(warnings)]);
  }

  const previousFour = latestEight.slice(0, 4);
  const latestFour = latestEight.slice(4);
  const latest = latestEight.at(-1);
  const ttmEpsEur = sumField(latestFour, "adjustedEarningsPerShare");
  const previousTtmEpsEur = sumField(previousFour, "adjustedEarningsPerShare");
  const normalizedEpsEur = weightedAnnualizedAverage(latestEight, "adjustedEarningsPerShare");
  const normalizedOcfEur = weightedAnnualizedAverage(latestEight, "ocfPerShare");
  const ownerEarningsPerShareEur = normalizedOcfEur * (1 - CAPEX_HAIRCUT);
  const revenueTtmEurM = sumField(latestFour, "operatingRevenues");
  const previousRevenueTtmEurM = sumField(previousFour, "operatingRevenues");
  const revenueTtmGrowth = previousRevenueTtmEurM > 0
    ? revenueTtmEurM / previousRevenueTtmEurM - 1
    : null;
  const latestRevenueGrowth = latestEight.at(-5).operatingRevenues > 0
    ? latest.operatingRevenues / latestEight.at(-5).operatingRevenues - 1
    : null;
  const baseRevenueGrowth = clamp(
    (revenueTtmGrowth ?? 0) * 0.65 + (latestRevenueGrowth ?? revenueTtmGrowth ?? 0) * 0.35,
    -0.1,
    0.18
  );
  const currentMargin = average(latestFour.map((report) => report.adjustedOperatingMargin));
  const epsGrowth = previousTtmEpsEur > 0 ? ttmEpsEur / previousTtmEpsEur - 1 : null;

  const buybackInfo = summarizeBuybackExecution({
    buybackData,
    sharesData,
    fxRate: fx,
    cashSnapshotDate: reportQuarterEndDate(latest),
  });
  const warnings = [...normalized.warnings];
  if (!buybackInfo.reportedShares) warnings.push("missing_shares");
  if (!buybackInfo.validRowCount) warnings.push("missing_buyback_data");

  const shareAdjustment = buybackInfo.executedEpsBoost > 0
    ? 1 + buybackInfo.executedEpsBoost
    : 1;
  const cashAtLatestReportEurM = latest.cashAndCashEquivalents ?? 0;
  const executedSpendEurM = buybackInfo.executedSpendAfterCashSnapshotSek / fx / 1_000_000;
  const cashAfterObservedBuybacksEurM = Math.max(cashAtLatestReportEurM - executedSpendEurM, 0);
  if (executedSpendEurM > cashAtLatestReportEurM) warnings.push("buybacks_exceed_reported_cash");

  const liquidityReserveEurM = revenueTtmEurM * LIQUIDITY_RESERVE_REVENUE_SHARE;
  const excessCashEurM = Math.max(cashAfterObservedBuybacksEurM - liquidityReserveEurM, 0);
  const excessCashPerShareEur = buybackInfo.currentShares
    ? (excessCashEurM * 1_000_000) / buybackInfo.currentShares
    : 0;
  const adjustedOwnerEarningsPerShareEur = ownerEarningsPerShareEur * shareAdjustment;
  const price = toFiniteNumber(currentPriceSEK);

  const scenarios = SCENARIO_CONFIG.map((config) => {
    const growth = clamp(baseRevenueGrowth + config.growthDelta, MIN_FWD_GROWTH, MAX_FWD_GROWTH);
    const margin = clamp(currentMargin + config.marginDelta, 25, 75);
    const marginAdjustment = currentMargin > 0 ? margin / currentMargin : 1;
    const forwardEpsBeforeBuybackEur = normalizedEpsEur * (1 + growth) * marginAdjustment;
    const forwardEpsEur = forwardEpsBeforeBuybackEur * shareAdjustment;
    const pe = clamp(
      smoothPeFromFundamentals(growth, margin) + config.peDelta,
      MIN_PE,
      MAX_PE
    );
    const peValueSek = forwardEpsEur * pe * fx;
    const dcfValueSek = projectOwnerEarningsValue({
      ownerEarningsPerShareEur: adjustedOwnerEarningsPerShareEur,
      nearTermGrowth: growth,
      discountRate: config.discountRate,
      terminalGrowth: config.terminalGrowth,
      excessCashPerShareEur,
      fxRate: fx,
    });
    const impliedPriceSek = dcfValueSek == null
      ? peValueSek
      : dcfValueSek * DCF_WEIGHT + peValueSek * PE_WEIGHT;

    return {
      id: config.id,
      label: config.label,
      variant: config.variant,
      description: "Driverbaserad prognos med verifierade återköp.",
      impliedPriceSEK: impliedPriceSek,
      upsidePct: price && price > 0 ? ((impliedPriceSek - price) / price) * 100 : null,
      growth,
      margin,
      pe,
      discountRate: config.discountRate,
      terminalGrowth: config.terminalGrowth,
      forwardEpsBeforeBuybackEur,
      fwdEpsEUR: forwardEpsEur,
      fwdEpsSEK: forwardEpsEur * fx,
      peValueSEK: peValueSek,
      dcfValueSEK: dcfValueSek,
      buybackRate: buybackInfo.executedShareReduction,
    };
  });

  const fair = scenarios.find((scenario) => scenario.id === "fair");
  const bull = scenarios.find((scenario) => scenario.id === "bull");
  const bear = scenarios.find((scenario) => scenario.id === "bear");
  if (!(bear.impliedPriceSEK <= fair.impliedPriceSEK && fair.impliedPriceSEK <= bull.impliedPriceSEK)) {
    warnings.push("scenario_ordering");
  }

  return {
    latestLabel: `${latest.year} ${latest.quarter}`,
    annualEpsTTMSEK: ttmEpsEur * fx,
    annualEpsNormSEK: normalizedEpsEur * fx,
    avgMargin: currentMargin,
    yoyGrowth: epsGrowth,
    revenueGrowth: baseRevenueGrowth,
    revTtmMEUR: revenueTtmEurM,
    ownerEarningsPerShareSEK: adjustedOwnerEarningsPerShareEur * fx,
    scenarios,
    valuationRange: {
      low: bear.impliedPriceSEK,
      midpoint: fair.impliedPriceSEK,
      high: bull.impliedPriceSEK,
    },
    buybackInfo: {
      ...buybackInfo,
      shareAdjustment,
      cashAfterObservedBuybacksEurM,
      liquidityReserveEurM,
      excessCashEurM,
    },
    dataQuality: {
      status: warnings.length ? "caution" : "good",
      warnings: [...new Set(warnings)],
      quarterCount: latestEight.length,
    },
    sensitivity: buildSensitivity({
      ownerEarningsPerShareEur: adjustedOwnerEarningsPerShareEur,
      nearTermGrowth: baseRevenueGrowth,
      excessCashPerShareEur,
      fxRate: fx,
    }),
    methodWeights: { dcf: DCF_WEIGHT, pe: PE_WEIGHT },
    raw: {
      ttmEpsEUR: ttmEpsEur,
      normalizedEpsEUR: normalizedEpsEur,
      ownerEarningsPerShareEur: adjustedOwnerEarningsPerShareEur,
    },
  };
};
