// Validates company-level earnings and cash-flow inputs used by the equity model.

export const quarterToNumber = (quarter) => /^Q[1-4]$/.test(quarter) ? Number(quarter[1]) : 0;
export const periodIndex = (report) => report.year * 4 + quarterToNumber(report.quarter) - 1;
export const reportQuarterEndDate = (report) => {
  const end = { Q1: "03-31", Q2: "06-30", Q3: "09-30", Q4: "12-31" }[report?.quarter];
  return end ? `${report.year}-${end}` : null;
};

export function finiteNumber(value) {
  if (value == null || value === "" || typeof value === "boolean") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function normalizeFairValueReports(reports = []) {
  if (!Array.isArray(reports)) return { reports: [], warnings: ["invalid_reports"] };
  const periods = new Map();
  const warnings = new Set();
  let newestPeriod = -Infinity;
  for (const report of reports) {
    const normalized = {
      ...report,
      year: finiteNumber(report?.year),
      operatingRevenues: finiteNumber(report?.operatingRevenues),
      adjustedProfitForPeriod: finiteNumber(report?.adjustedProfitForPeriod),
      adjustedEarningsPerShare: finiteNumber(report?.adjustedEarningsPerShare),
      cashAndCashEquivalents: finiteNumber(report?.cashAndCashEquivalents),
    };
    const validPeriod = Number.isInteger(normalized.year) && normalized.year >= 1990 && normalized.year <= 2100 && quarterToNumber(report?.quarter) > 0;
    if (validPeriod) newestPeriod = Math.max(newestPeriod, periodIndex(normalized));
    if (!validPeriod || normalized.operatingRevenues == null || normalized.operatingRevenues <= 0 || normalized.adjustedProfitForPeriod == null) {
      warnings.add("invalid_reports");
      continue;
    }
    const key = periodIndex(normalized);
    if (periods.has(key)) warnings.add("duplicate_periods");
    periods.set(key, normalized);
  }
  const result = [...periods.values()].sort((a, b) => periodIndex(a) - periodIndex(b));
  if (result.length && periodIndex(result.at(-1)) < newestPeriod) warnings.add("invalid_latest_report");
  const window = result.slice(-8);
  if (window.length === 8 && window.some((report, index) => index > 0 && periodIndex(report) !== periodIndex(window[index - 1]) + 1)) warnings.add("non_consecutive_quarters");
  return { reports: result, warnings: [...warnings] };
}

export function resolveFairValueReports(liveReports, fallbackReports) {
  const fallback = Array.isArray(fallbackReports) ? fallbackReports : [];
  if (!Array.isArray(liveReports) || !liveReports.length) return fallback;
  return liveReports.map((report) => {
    if (!report || report.valuationInputs) return report;
    const local = fallback.find((candidate) => candidate?.year === report.year && candidate?.quarter === report.quarter);
    const same = (field) => finiteNumber(report[field]) != null && finiteNumber(local?.[field]) != null && Math.abs(Number(report[field]) - Number(local[field])) < 0.000001;
    // Supplement only the same published version; restated fundamentals need new source data.
    if (!local?.valuationInputs || !same("operatingRevenues") || !same("adjustedProfitForPeriod") || !same("cashAndCashEquivalents")) return report;
    return { ...report, valuationInputs: local.valuationInputs };
  });
}

const CASH_FIELDS = ["operatingCashFlow", "capexIntangible", "capexTangible", "leaseRepayments", "interestReceived", "taxPaid", "taxExpense", "profitBeforeTax", "operatingProfit", "nonTaxableNonRecurringProfit", "netBorrowing"];

export function normalizeValuationCashFlow(report) {
  const inputs = report?.valuationInputs;
  if (!inputs) return null;
  const values = Object.fromEntries(CASH_FIELDS.map((key) => [key, finiteNumber(inputs[key])]));
  if (Object.values(values).some((value) => value == null)) return null;
  if (["capexIntangible", "capexTangible", "leaseRepayments", "interestReceived", "taxExpense", "nonTaxableNonRecurringProfit"].some((key) => values[key] < 0)) return null;
  const taxableProfit = values.profitBeforeTax - values.nonTaxableNonRecurringProfit;
  if (taxableProfit <= 0 || values.taxExpense > taxableProfit) return null;
  const coreOperatingProfit = values.operatingProfit - values.nonTaxableNonRecurringProfit;
  const reportedProfit = finiteNumber(report.adjustedProfitForPeriod);
  // All amounts are MEUR; tolerate rounding but reject mismatched report versions.
  if (reportedProfit == null || Math.abs(values.profitBeforeTax - values.taxExpense - reportedProfit) > 0.011) return null;
  const coreProfit = reportedProfit - values.nonTaxableNonRecurringProfit;
  if (coreOperatingProfit <= 0 || coreProfit <= 0) return null;
  const taxRate = values.taxExpense / taxableProfit;
  const interestAfterTax = values.interestReceived * (1 - taxRate);
  if (coreProfit - interestAfterTax <= 0) return null;
  const normalizedOperatingCashFlow = values.operatingCashFlow + values.taxPaid - values.taxExpense - interestAfterTax;
  const capex = values.capexIntangible + values.capexTangible;
  return {
    ...values, capex, coreOperatingProfit, coreProfit: coreProfit - interestAfterTax,
    normalizedOperatingCashFlow,
    equityCashFlow: normalizedOperatingCashFlow - capex - values.leaseRepayments + values.netBorrowing,
  };
}

export function buildValuationFundamentals(reports) {
  const quarters = reports.slice(-4).map(normalizeValuationCashFlow);
  if (quarters.length !== 4 || quarters.some((quarter) => !quarter)) return null;
  const total = (field) => quarters.reduce((sum, quarter) => sum + quarter[field], 0);
  const revenue = reports.slice(-4).reduce((sum, report) => sum + report.operatingRevenues, 0);
  return {
    revenue, profit: total("coreProfit"), operatingProfit: total("coreOperatingProfit"),
    operatingCashFlow: total("operatingCashFlow"), normalizedOperatingCashFlow: total("normalizedOperatingCashFlow"),
    capex: total("capex"), leaseRepayments: total("leaseRepayments"), netBorrowing: total("netBorrowing"),
    equityCashFlow: total("equityCashFlow"), nonRecurringProfit: total("nonTaxableNonRecurringProfit"),
  };
}

export function readValuationBalance(report) {
  const cash = finiteNumber(report?.cashAndCashEquivalents);
  const keys = ["restrictedCash", "netCurrentTaxLiabilities", "financialDebtExcludingLeases"];
  const values = Object.fromEntries(keys.map((key) => [key, finiteNumber(report?.valuationInputs?.[key])]));
  if (cash == null || cash < 0 || Object.values(values).some((value) => value == null || value < 0) || values.restrictedCash > cash) return null;
  return { cash, ...values };
}

export function valuationSourceUrls(reports) {
  const urls = reports.flatMap((report) => Array.isArray(report?.valuationInputs?.sourceUrls) ? report.valuationInputs.sourceUrls : []);
  return [...new Set(urls)].filter((url) => {
    if (typeof url !== "string") return false;
    try {
      const parsed = new URL(url);
      return parsed.protocol === "https:" && !parsed.username && !parsed.password;
    } catch {
      return false;
    }
  });
}
