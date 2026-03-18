import financialReportsData from "@/app/data/financialReports.json";
import amountOfShares from "@/app/data/amountOfShares.json";

const QUARTER_ORDER = { Q1: 1, Q2: 2, Q3: 3, Q4: 4 };
const NO_DIVIDEND_PROPOSAL = {
  announcementDate: "2026-03-18",
  active: true,
};

export const buildDividendEstimate = ({ profileShares, fxRate, payoutRatio = 0.5 }) => {
  const rows = Array.isArray(financialReportsData?.financialReports)
    ? financialReportsData.financialReports
    : [];
  if (!rows.length) return null;

  const byYear = new Map();
  for (const row of rows) {
    const year = Number(row?.year);
    if (!Number.isFinite(year)) continue;
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year).push(row);
  }

  const years = Array.from(byYear.keys()).sort((a, b) => a - b);
  const latestFullYear = [...years]
    .reverse()
    .find((year) => {
      const quarters = byYear.get(year) || [];
      const unique = new Set(quarters.map((q) => String(q?.quarter || "")));
      return unique.has("Q1") && unique.has("Q2") && unique.has("Q3") && unique.has("Q4");
    });
  if (!Number.isFinite(latestFullYear)) return null;

  const latestYearRows = (byYear.get(latestFullYear) || []).sort(
    (a, b) => (QUARTER_ORDER[a?.quarter] || 0) - (QUARTER_ORDER[b?.quarter] || 0)
  );
  const annualProfitEur = latestYearRows.reduce((sum, row) => {
    const val = Number(row?.adjustedProfitForPeriod);
    return Number.isFinite(val) ? sum + val : sum;
  }, 0);
  if (!(annualProfitEur > 0)) return null;

  const latestSharesOutstandingMillions = Number(
    amountOfShares?.[amountOfShares.length - 1]?.sharesOutstanding
  );
  if (!(latestSharesOutstandingMillions > 0)) return null;

  if (NO_DIVIDEND_PROPOSAL.active) {
    return {
      yearLabel: `${latestFullYear + 1} EST`,
      estimatedCashSek: 0,
      estimatedDpsSek: 0,
      sourceYear: latestFullYear,
      payoutRatio: 0,
      status: "no_dividend_proposed",
      announcementDate: NO_DIVIDEND_PROPOSAL.announcementDate,
    };
  }

  const fx = Number.isFinite(Number(fxRate)) && Number(fxRate) > 0 ? Number(fxRate) : 11.02;
  const estimatedDpsSek = (annualProfitEur * payoutRatio * fx) / latestSharesOutstandingMillions;
  if (!(estimatedDpsSek > 0)) return null;

  const estimatedCashSek = (Number(profileShares) || 0) * estimatedDpsSek;

  return {
    yearLabel: `${latestFullYear + 1} EST`,
    estimatedCashSek,
    estimatedDpsSek,
    sourceYear: latestFullYear,
    payoutRatio,
  };
};

export const buildDividendEstimateRange = ({ profileShares, fxRate }) => {
  if (NO_DIVIDEND_PROPOSAL.active) return null;

  const bear = buildDividendEstimate({ profileShares, fxRate, payoutRatio: 0.4 });
  const base = buildDividendEstimate({ profileShares, fxRate, payoutRatio: 0.5 });
  const bull = buildDividendEstimate({ profileShares, fxRate, payoutRatio: 0.6 });

  if (!bear || !base || !bull) return null;

  return {
    yearLabel: base.yearLabel,
    bear,
    base,
    bull,
  };
};
