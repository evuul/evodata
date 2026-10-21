// Combines company-level equity cash-flow and P/E scenarios using current outstanding shares.

import { summarizeBuybackExecution, normalizeBuybackExecutions } from "./buybackMandate.js";
import { finiteNumber, normalizeFairValueReports, buildValuationFundamentals, readValuationBalance, reportQuarterEndDate, valuationSourceUrls } from "./valuationFundamentals.js";
import { projectEquityCashFlows, discountEquityCashFlows } from "./valuationProjection.js";

export { quarterToNumber, normalizeFairValueReports, resolveFairValueReports } from "./valuationFundamentals.js";

const REQUIRED_QUARTERS = 8;
const LIQUIDITY_RESERVE_REVENUE_SHARE = 0.15;
const DCF_WEIGHT = 0.55;
const PE_WEIGHT = 0.45;
const MIN_PE = 9;
const MAX_PE = 28;

export const MIN_FWD_GROWTH = -0.15;
export const MAX_FWD_GROWTH = 0.22;
export const CUSTOM_SCENARIO_LIMITS = Object.freeze({
  growth: Object.freeze({ min: MIN_FWD_GROWTH, max: MAX_FWD_GROWTH }),
  margin: Object.freeze({ min: 25, max: 75 }),
  pe: Object.freeze({ min: MIN_PE, max: MAX_PE }),
  discountRate: Object.freeze({ min: 0.07, max: 0.18 }),
  terminalGrowth: Object.freeze({ min: 0, max: 0.05 }),
});

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

export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const toFiniteNumber = finiteNumber;

export const normalizeCustomScenarioAssumptions = (input = {}, defaults = {}) => {
  const resolve = (key, fallback) => toFiniteNumber(input?.[key]) ?? toFiniteNumber(defaults?.[key]) ?? fallback;
  const discountRate = clamp(
    resolve("discountRate", 0.1),
    CUSTOM_SCENARIO_LIMITS.discountRate.min,
    CUSTOM_SCENARIO_LIMITS.discountRate.max
  );
  const terminalGrowthMax = Math.min(
    CUSTOM_SCENARIO_LIMITS.terminalGrowth.max,
    discountRate - 0.005
  );

  return {
    growth: clamp(resolve("growth", 0.05), CUSTOM_SCENARIO_LIMITS.growth.min, CUSTOM_SCENARIO_LIMITS.growth.max),
    margin: clamp(resolve("margin", 55), CUSTOM_SCENARIO_LIMITS.margin.min, CUSTOM_SCENARIO_LIMITS.margin.max),
    pe: clamp(resolve("pe", 16), CUSTOM_SCENARIO_LIMITS.pe.min, CUSTOM_SCENARIO_LIMITS.pe.max),
    discountRate,
    terminalGrowth: clamp(
      resolve("terminalGrowth", 0.025),
      CUSTOM_SCENARIO_LIMITS.terminalGrowth.min,
      terminalGrowthMax
    ),
  };
};


const sumField = (rows, field) => rows.reduce((sum, report) => sum + report[field], 0);

const emptyResult = (warnings) => ({
  latestLabel: "", annualEpsTTMSEK: null, annualEpsNormSEK: null, avgMargin: null,
  yoyGrowth: null, revenueGrowth: null, revTtmMEUR: null, ownerEarningsPerShareSEK: null,
  scenarios: [], valuationRange: { low: null, midpoint: null, high: null }, buybackInfo: null,
  dataQuality: { status: "error", warnings: [...new Set(warnings)], quarterCount: 0 },
  sensitivity: null, customScenarioDefaults: null, customScenarioAssumptions: null,
  raw: { ttmEpsEUR: null, normalizedEpsEUR: null },
});

function smoothPeFromFundamentals(growth, margin) {
  return clamp(14 + clamp(growth, -0.1, 0.18) * 30 + clamp((margin - 45) * 0.08, -1.5, 2), MIN_PE, MAX_PE);
}

function sensitivityForScenario(context, assumptions) {
  const discountRates = [assumptions.discountRate + 0.01, assumptions.discountRate, assumptions.discountRate - 0.01];
  const terminalGrowthRates = [assumptions.terminalGrowth - 0.01, assumptions.terminalGrowth, assumptions.terminalGrowth + 0.01];
  const values = discountRates.map((discountRate) => terminalGrowthRates.map((terminalGrowth) => {
    const forecast = projectEquityCashFlows({ ...context, ...assumptions, terminalGrowth });
    return discountEquityCashFlows({ ...context, forecast, discountRate, terminalGrowth })?.valueSEK ?? null;
  }));
  return { discountRates, terminalGrowthRates, values };
}

function buildScenario(config, defaults, context, currentPrice) {
  const custom = config.id === "custom";
  const assumptions = custom ? config : {
    growth: clamp(defaults.growth + config.growthDelta, MIN_FWD_GROWTH, MAX_FWD_GROWTH),
    margin: clamp(defaults.margin + config.marginDelta, 25, 75),
    discountRate: config.discountRate,
    terminalGrowth: config.terminalGrowth,
  };
  const pe = custom ? config.pe : clamp(smoothPeFromFundamentals(assumptions.growth, assumptions.margin) + config.peDelta, MIN_PE, MAX_PE);
  const forecast = projectEquityCashFlows({ ...context, ...assumptions });
  const dcf = discountEquityCashFlows({ ...context, ...assumptions, forecast });
  if (!dcf) return null;
  const peValueSEK = forecast[0].epsSEK * pe + dcf.excessCashPerShareSEK;
  const value = dcf.valueSEK * DCF_WEIGHT + peValueSEK * PE_WEIGHT;
  return {
    id: config.id, label: config.label, variant: config.variant, ...assumptions, pe,
    impliedPriceSEK: value,
    upsidePct: currentPrice > 0 ? (value / currentPrice - 1) * 100 : null,
    fwdEpsSEK: forecast[0].epsSEK, fwdEpsEUR: forecast[0].epsSEK / context.fxRate,
    peValueSEK, dcfValueSEK: dcf.valueSEK,
    dcfBreakdown: dcf,
    forecast, sensitivity: sensitivityForScenario(context, assumptions),
  };
}

function resolveCashContext({ latest, balance, fundamentals, buybackInfo, buybackData, fx }) {
  const cashSnapshotDate = reportQuarterEndDate(latest);
  const unpricedBuybacks = normalizeBuybackExecutions(buybackData).some((row) => row.date > cashSnapshotDate && row.spendSek == null);
  const executedSpendEurM = buybackInfo.executedSpendAfterCashSnapshotSek / fx / 1_000_000;
  const cashAfterObservedBuybacksEurM = Math.max(balance.cash - executedSpendEurM, 0);
  const liquidityReserveEurM = fundamentals.revenue * LIQUIDITY_RESERVE_REVENUE_SHARE;
  const cashClaims = balance.restrictedCash + balance.netCurrentTaxLiabilities + liquidityReserveEurM;
  const excessCashEurM = unpricedBuybacks ? 0 : Math.max(cashAfterObservedBuybacksEurM - cashClaims, 0);
  const warnings = [];
  if (unpricedBuybacks) warnings.push("unpriced_buybacks");
  if (executedSpendEurM > balance.cash) warnings.push("buybacks_exceed_reported_cash");
  if (cashAfterObservedBuybacksEurM < cashClaims) warnings.push("cash_below_reserve");
  return {
    cashAfterObservedBuybacksEurM, liquidityReserveEurM, excessCashEurM,
    restrictedCashEurM: balance.restrictedCash, netCurrentTaxLiabilitiesEurM: balance.netCurrentTaxLiabilities,
    warnings,
  };
}

export function computeFairValueInsights({ reports, buybackData = [], sharesData = [], fxRate, currentPriceSEK, customScenario } = {}) {
  const fx = finiteNumber(fxRate);
  if (!(fx > 0)) return emptyResult(["invalid_fx"]);
  const normalized = normalizeFairValueReports(reports);
  const latestEight = normalized.reports.slice(-REQUIRED_QUARTERS);
  const warnings = [...normalized.warnings];
  if (latestEight.length < REQUIRED_QUARTERS) return emptyResult([...warnings, "not_enough_reports"]);
  if (warnings.includes("non_consecutive_quarters") || warnings.includes("invalid_latest_report")) return emptyResult(warnings);
  const latest = latestEight.at(-1);
  const latestFour = latestEight.slice(-4);
  const fundamentals = buildValuationFundamentals(latestFour);
  if (!fundamentals) return emptyResult([...warnings, "missing_cash_flow_inputs"]);
  const balance = readValuationBalance(latest);
  if (!balance) return emptyResult([...warnings, "missing_balance_inputs"]);
  if (balance.financialDebtExcludingLeases > 0 || latestFour.some((report) => finiteNumber(report.valuationInputs.netBorrowing) !== 0)) return emptyResult([...warnings, "unsupported_financial_debt"]);
  if (fundamentals.equityCashFlow <= 0 || fundamentals.profit <= 0 || fundamentals.normalizedOperatingCashFlow <= 0) return emptyResult([...warnings, "non_positive_cash_flow"]);

  const buybackInfo = summarizeBuybackExecution({ buybackData, sharesData, fxRate: fx, cashSnapshotDate: reportQuarterEndDate(latest) });
  if (!buybackInfo.currentShares || buybackInfo.executedSharesAfterSnapshot >= buybackInfo.reportedShares) return emptyResult([...warnings, "missing_shares"]);
  if (!buybackInfo.validRowCount) warnings.push("missing_buyback_data");
  const cashContext = resolveCashContext({ latest, balance, fundamentals, buybackInfo, buybackData, fx });
  warnings.push(...cashContext.warnings);
  const currentShares = buybackInfo.currentShares;
  const revenueGrowth = fundamentals.revenue / sumField(latestEight.slice(0, 4), "operatingRevenues") - 1;
  const recentGrowth = latest.operatingRevenues / latestEight.at(-5).operatingRevenues - 1;
  const growth = clamp(revenueGrowth * 0.65 + recentGrowth * 0.35, -0.1, 0.18);
  const margin = fundamentals.operatingProfit / fundamentals.revenue * 100;
  const defaults = normalizeCustomScenarioAssumptions({}, { growth, margin, pe: smoothPeFromFundamentals(growth, margin), discountRate: 0.1, terminalGrowth: 0.025 });
  const custom = normalizeCustomScenarioAssumptions(customScenario, defaults);
  const context = { fundamentals, currentShares, fxRate: fx, excessCashMEUR: cashContext.excessCashEurM };
  const configs = [...SCENARIO_CONFIG, { id: "custom", label: "Custom", variant: "custom", ...custom }];
  const price = finiteNumber(currentPriceSEK);
  const scenarios = configs.map((config) => buildScenario(config, defaults, context, price));
  if (scenarios.some((scenario) => !scenario || !Number.isFinite(scenario.impliedPriceSEK))) return emptyResult([...warnings, "non_positive_cash_flow"]);
  const [fair, bull, bear] = scenarios;
  if (!(bear.impliedPriceSEK <= fair.impliedPriceSEK && fair.impliedPriceSEK <= bull.impliedPriceSEK)) warnings.push("scenario_ordering");
  const ttmEps = latestFour.every((report) => report.adjustedEarningsPerShare != null) ? sumField(latestFour, "adjustedEarningsPerShare") : null;
  const previous = latestEight.slice(0, 4);
  const previousEps = previous.every((report) => report.adjustedEarningsPerShare != null) ? sumField(previous, "adjustedEarningsPerShare") : null;
  const normalizedEps = fundamentals.profit * 1_000_000 / currentShares;
  return {
    latestLabel: `${latest.year} ${latest.quarter}`,
    annualEpsTTMSEK: ttmEps == null ? null : ttmEps * fx,
    annualEpsNormSEK: normalizedEps * fx,
    avgMargin: margin, yoyGrowth: previousEps > 0 && ttmEps != null ? ttmEps / previousEps - 1 : null,
    revenueGrowth: growth, revTtmMEUR: fundamentals.revenue,
    ownerEarningsPerShareSEK: fundamentals.equityCashFlow * 1_000_000 / currentShares * fx,
    scenarios, valuationRange: { low: bear.impliedPriceSEK, midpoint: fair.impliedPriceSEK, high: bull.impliedPriceSEK },
    buybackInfo: { ...buybackInfo, ...cashContext }, fundamentals,
    dataQuality: { status: warnings.length ? "caution" : "good", warnings: [...new Set(warnings)], quarterCount: latestEight.length, sourceUrls: valuationSourceUrls(latestFour) },
    sensitivity: fair.sensitivity, customScenarioDefaults: defaults, customScenarioAssumptions: custom,
    methodWeights: { dcf: DCF_WEIGHT, pe: PE_WEIGHT },
    raw: { ttmEpsEUR: ttmEps, normalizedEpsEUR: normalizedEps, ownerEarningsPerShareEur: fundamentals.equityCashFlow * 1_000_000 / currentShares },
  };
}
