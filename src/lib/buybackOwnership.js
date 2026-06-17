// Ownership helpers for real and hypothetical buyback scenarios.
import { DEFAULT_BUYBACK_MANDATE_CASH_EUR } from "./buybackMandate.js";

const getLatestOutstandingShares = (sharesData = []) => {
  if (!Array.isArray(sharesData) || sharesData.length === 0) return null;
  const latest = sharesData.at(-1);
  const sharesOutstanding = Number(latest?.sharesOutstanding);
  if (!Number.isFinite(sharesOutstanding) || sharesOutstanding <= 0) return null;
  return sharesOutstanding > 1e6 ? sharesOutstanding : sharesOutstanding * 1e6;
};

const getPositiveBuybackRowsFromDate = (buybackRows = [], startDate = null) =>
  (Array.isArray(buybackRows) ? buybackRows : []).filter((row) => {
    const date = String(row?.Datum ?? row?.date ?? "").slice(0, 10);
    const shares = Number(row?.Antal_aktier ?? row?.shares);
    if (!date || !Number.isFinite(shares) || shares <= 0) return false;
    return !startDate || date >= startDate;
  });

const sumBuybackRows = (buybackRows = []) =>
  buybackRows.reduce(
    (totals, row) => {
      totals.repurchasedShares += Number(row?.Antal_aktier ?? row?.shares) || 0;
      totals.buybackSpend += Number(row?.["Transaktionsvärde"] ?? row?.transactionValue ?? row?.value) || 0;
      return totals;
    },
    { repurchasedShares: 0, buybackSpend: 0 }
  );

export const computeFullBuybackMandateSummary = ({
  profileShares,
  currentPriceSEK,
  fxRate,
  sharesData,
  dividendsReceived = 0,
  totalValue = 0,
  mandateCashEur = DEFAULT_BUYBACK_MANDATE_CASH_EUR,
} = {}) => {
  const shares = Number(profileShares);
  const currentPrice = Number(currentPriceSEK);
  const fx = Number(fxRate);
  const currentOutstanding = getLatestOutstandingShares(sharesData);
  const mandateEur = Number(mandateCashEur);

  if (
    !Number.isFinite(currentPrice) ||
    currentPrice <= 0 ||
    !Number.isFinite(fx) ||
    fx <= 0 ||
    !Number.isFinite(currentOutstanding) ||
    currentOutstanding <= 0 ||
    !Number.isFinite(mandateEur) ||
    mandateEur <= 0
  ) {
    return null;
  }

  const mandateSek = mandateEur * fx;
  const repurchasedShares = mandateSek / currentPrice;
  const postBuybackOutstanding = currentOutstanding - repurchasedShares;

  if (!Number.isFinite(postBuybackOutstanding) || postBuybackOutstanding <= 0) {
    return null;
  }

  const hasHoldings = Number.isFinite(shares) && shares > 0;
  const ownershipBefore = hasHoldings ? shares / currentOutstanding : null;
  const ownershipAfter = hasHoldings ? shares / postBuybackOutstanding : null;
  const ownershipLiftPct =
    ownershipBefore && ownershipBefore > 0 && ownershipAfter
      ? ((ownershipAfter / ownershipBefore) - 1) * 100
      : null;
  const buybackBenefit = ownershipBefore && ownershipBefore > 0 ? mandateSek * ownershipBefore : null;
  const dividendBenefit = Number.isFinite(dividendsReceived) && dividendsReceived > 0 ? dividendsReceived : 0;
  const totalShareholderReturn = Number.isFinite(buybackBenefit) ? dividendBenefit + buybackBenefit : null;
  const totalShareholderReturnPct =
    Number.isFinite(totalShareholderReturn) && Number.isFinite(totalValue) && totalValue > 0
      ? (totalShareholderReturn / totalValue) * 100
      : null;
  const buybackYieldPct = (repurchasedShares / currentOutstanding) * 100;

  return {
    ownershipBefore,
    ownershipAfter,
    ownershipLiftPct,
    buybackBenefit,
    dividendBenefit,
    totalShareholderReturn,
    totalShareholderReturnPct,
    mandateSek,
    buybackYieldPct,
    hasHoldings,
    repurchasedShares,
    currentOutstanding,
    postBuybackOutstanding,
  };
};

export const computeCurrentBuybackProgramSummary = ({
  profileShares,
  buybackRows,
  sharesData,
  dividendsReceived = 0,
  totalValue = 0,
  startDate = "2026-05-18",
} = {}) => {
  const shares = Number(profileShares);
  const currentOutstanding = getLatestOutstandingShares(sharesData);
  const programRows = getPositiveBuybackRowsFromDate(buybackRows, startDate);
  const { repurchasedShares, buybackSpend } = sumBuybackRows(programRows);

  if (
    !Number.isFinite(currentOutstanding) ||
    currentOutstanding <= 0 ||
    !Number.isFinite(repurchasedShares) ||
    repurchasedShares <= 0 ||
    !Number.isFinite(buybackSpend) ||
    buybackSpend <= 0
  ) {
    return null;
  }

  const postBuybackOutstanding = currentOutstanding - repurchasedShares;
  if (!Number.isFinite(postBuybackOutstanding) || postBuybackOutstanding <= 0) {
    return null;
  }

  const hasHoldings = Number.isFinite(shares) && shares > 0;
  const ownershipBefore = hasHoldings ? shares / currentOutstanding : null;
  const ownershipAfter = hasHoldings ? shares / postBuybackOutstanding : null;
  const ownershipLiftPct =
    ownershipBefore && ownershipBefore > 0 && ownershipAfter
      ? ((ownershipAfter / ownershipBefore) - 1) * 100
      : null;
  const buybackBenefit = ownershipBefore && ownershipBefore > 0 ? buybackSpend * ownershipBefore : null;
  const dividendBenefit = Number.isFinite(dividendsReceived) && dividendsReceived > 0 ? dividendsReceived : 0;
  const totalShareholderReturn = Number.isFinite(buybackBenefit) ? dividendBenefit + buybackBenefit : null;
  const totalShareholderReturnPct =
    Number.isFinite(totalShareholderReturn) && Number.isFinite(totalValue) && totalValue > 0
      ? (totalShareholderReturn / totalValue) * 100
      : null;

  return {
    ownershipBefore,
    ownershipAfter,
    ownershipLiftPct,
    buybackBenefit,
    dividendBenefit,
    totalShareholderReturn,
    totalShareholderReturnPct,
    buybackYieldPct: (repurchasedShares / currentOutstanding) * 100,
    hasHoldings,
    repurchasedShares,
    buybackSpend,
    currentOutstanding,
    postBuybackOutstanding,
    startDate,
    rowsCount: programRows.length,
  };
};
