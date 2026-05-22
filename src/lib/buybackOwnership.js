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
    !Number.isFinite(shares) ||
    shares <= 0 ||
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

  const ownershipBefore = shares / currentOutstanding;
  const ownershipAfter = shares / postBuybackOutstanding;
  const ownershipLiftPct =
    ownershipBefore > 0 ? ((ownershipAfter / ownershipBefore) - 1) * 100 : null;
  const buybackBenefit = ownershipBefore > 0 ? mandateSek * ownershipBefore : 0;
  const dividendBenefit = Number.isFinite(dividendsReceived) && dividendsReceived > 0 ? dividendsReceived : 0;
  const totalShareholderReturn = dividendBenefit + buybackBenefit;
  const totalShareholderReturnPct =
    Number.isFinite(totalValue) && totalValue > 0 ? (totalShareholderReturn / totalValue) * 100 : null;
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
    repurchasedShares,
    currentOutstanding,
    postBuybackOutstanding,
  };
};
