// Ownership helpers for real and hypothetical buyback scenarios.
import { DEFAULT_BUYBACK_MANDATE_CASH_EUR } from "./buybackMandate.js";

const getLatestOutstandingShares = (sharesData = []) => {
  if (!Array.isArray(sharesData) || sharesData.length === 0) return null;
  const latest = sharesData.at(-1);
  const sharesOutstanding = Number(latest?.sharesOutstanding);
  if (!Number.isFinite(sharesOutstanding) || sharesOutstanding <= 0) return null;
  return sharesOutstanding > 1e6 ? sharesOutstanding : sharesOutstanding * 1e6;
};

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
  const illustrativeBuybackAllocation = ownershipBefore && ownershipBefore > 0 ? mandateSek * ownershipBefore : null;
  const dividendIncome = Number.isFinite(dividendsReceived) && dividendsReceived > 0 ? dividendsReceived : 0;
  const dividendIncomePct =
    Number.isFinite(dividendIncome) && Number.isFinite(totalValue) && totalValue > 0
      ? (dividendIncome / totalValue) * 100
      : null;
  const buybackYieldPct = (repurchasedShares / currentOutstanding) * 100;

  return {
    ownershipBefore,
    ownershipAfter,
    ownershipLiftPct,
    illustrativeBuybackAllocation,
    dividendIncome,
    dividendIncomePct,
    mandateSek,
    buybackYieldPct,
    hasHoldings,
    repurchasedShares,
    currentOutstanding,
    postBuybackOutstanding,
  };
};
