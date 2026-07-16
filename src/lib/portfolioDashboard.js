// Builds the personal portfolio dashboard metrics, scenarios and timeline.

import { normalizeYmd, resolveDividendExDate } from "./dividendEligibility.js";

const toFinite = (value) => {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toNonNegative = (value) => {
  const parsed = toFinite(value);
  return parsed != null && parsed >= 0 ? parsed : 0;
};

export const buildReturnBreakdown = ({ totalCost, totalValue, dividendsReceived } = {}) => {
  const investedCapital = toNonNegative(totalCost);
  const marketValue = toNonNegative(totalValue);
  const dividends = toNonNegative(dividendsReceived);
  const marketReturn = marketValue - investedCapital;
  const totalReturn = marketReturn + dividends;
  const toPercent = (value) => (investedCapital > 0 ? (value / investedCapital) * 100 : null);

  return {
    investedCapital,
    marketValue,
    marketReturn,
    dividends,
    totalReturn,
    marketReturnPct: toPercent(marketReturn),
    dividendReturnPct: toPercent(dividends),
    totalReturnPct: toPercent(totalReturn),
  };
};

const DIVIDEND_SCENARIOS = [
  { id: "low", factor: 0.5, labelSv: "Låg", labelEn: "Low" },
  { id: "base", factor: 0.75, labelSv: "Bas", labelEn: "Base" },
  { id: "high", factor: 1, labelSv: "Hög", labelEn: "High" },
];

export const buildDividendScenarios = ({ shares, lastDividendPerShare, targetYear } = {}) => {
  const holdingShares = toNonNegative(shares);
  const referenceDps = toFinite(lastDividendPerShare);
  const year = Number(targetYear);
  if (!(referenceDps > 0) || !Number.isInteger(year)) return [];

  return DIVIDEND_SCENARIOS.map((scenario) => {
    const dividendPerShare = referenceDps * scenario.factor;
    return {
      ...scenario,
      targetYear: year,
      dividendPerShare,
      cash: holdingShares * dividendPerShare,
    };
  });
};

const normalizeTransactions = (transactions) =>
  (Array.isArray(transactions) ? transactions : [])
    .map((row, index) => {
      const type = row?.type === "buy" || row?.type === "sell" ? row.type : null;
      const date = normalizeYmd(row?.date);
      const shares = Math.abs(Math.round(Number(row?.shares)));
      const price = toFinite(row?.price);
      const sourceOrder = toFinite(row?.sourceOrder) ?? index;
      if (!type || !date || !(shares > 0)) return null;
      return { type, date, shares, price, sourceOrder, index };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const dateOrder = a.date.localeCompare(b.date);
      if (dateOrder !== 0) return dateOrder;
      if (a.type !== b.type) return a.type === "buy" ? -1 : 1;
      return a.sourceOrder - b.sourceOrder;
    });

const normalizeLotsAsBuys = (lots) =>
  (Array.isArray(lots) ? lots : [])
    .map((row, index) => {
      const date = normalizeYmd(row?.date);
      const shares = Math.abs(Math.round(Number(row?.shares)));
      const price = toFinite(row?.price);
      if (!date || !(shares > 0)) return null;
      return { type: "buy", date, shares, price, sourceOrder: index, index };
    })
    .filter(Boolean)
    .sort((a, b) => a.date.localeCompare(b.date) || a.sourceOrder - b.sourceOrder);

const holdingsBeforeDate = (transactions, date) =>
  transactions.reduce((shares, transaction) => {
    if (transaction.date >= date) return shares;
    return Math.max(0, shares + (transaction.type === "buy" ? transaction.shares : -transaction.shares));
  }, 0);

export const buildPortfolioTimeline = ({
  transactions,
  lots,
  historicalDividends,
  calendarEvents,
  todayYmd,
  historyLimit = 8,
} = {}) => {
  const normalizedTransactions = normalizeTransactions(transactions);
  const sourceTransactions = normalizedTransactions.length
    ? normalizedTransactions
    : normalizeLotsAsBuys(lots);
  const today = normalizeYmd(todayYmd);

  const transactionItems = normalizedTransactions.map((transaction) => ({
    id: `transaction-${transaction.index}-${transaction.date}`,
    type: transaction.type,
    date: transaction.date,
    shares: transaction.shares,
    price: transaction.price,
  }));

  const dividendItems = (Array.isArray(historicalDividends) ? historicalDividends : [])
    .map((dividend, index) => {
      const exDate = resolveDividendExDate(dividend);
      const dividendPerShare = toFinite(dividend?.dividendPerShare);
      if (!exDate || !(dividendPerShare > 0)) return null;
      const heldShares = holdingsBeforeDate(sourceTransactions, exDate);
      if (!(heldShares > 0)) return null;
      return {
        id: `dividend-${index}-${exDate}`,
        type: "dividend",
        date: normalizeYmd(dividend?.paymentDate) || exDate,
        exDate,
        shares: heldShares,
        dividendPerShare,
        cash: heldShares * dividendPerShare,
      };
    })
    .filter(Boolean);

  const upcoming = (Array.isArray(calendarEvents) ? calendarEvents : [])
    .map((event) => ({ ...event, date: normalizeYmd(event?.date) }))
    .filter((event) => event.date && today && event.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 2);

  const history = [...transactionItems, ...dividendItems]
    .filter((item) => !today || item.date <= today)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, Math.max(1, Number(historyLimit) || 8));

  return {
    upcoming,
    history,
    source: normalizedTransactions.length ? "transactions" : sourceTransactions.length ? "lots" : "none",
  };
};

export const buildOwnershipImpact = ({ shares, ownershipLiftPct } = {}) => {
  const holdingShares = toNonNegative(shares);
  const lift = toFinite(ownershipLiftPct);
  const equivalentExtraShares = lift != null && lift >= 0 ? holdingShares * (lift / 100) : null;
  return { equivalentExtraShares };
};
