// Shared helper for the EUR 2bn buyback mandate assumptions.
import { clamp, MAX_BBY, MIN_BBY } from "./fairValueUtils.js";

const DEFAULT_BUYBACK_MANDATE_CASH_EUR = 2_000_000_000;

const getOutstandingShares = (sharesData = []) => {
  if (!Array.isArray(sharesData) || sharesData.length === 0) return null;
  const latest = sharesData.at(-1);
  const sharesOutstanding = Number(latest?.sharesOutstanding);
  if (!Number.isFinite(sharesOutstanding) || sharesOutstanding <= 0) return null;
  return sharesOutstanding > 1e6 ? sharesOutstanding : sharesOutstanding * 1e6;
};

export const computeBuybackMandateAssumptions = ({
  mandateCashEur = DEFAULT_BUYBACK_MANDATE_CASH_EUR,
  currentPriceSEK,
  fxRate,
  sharesData,
} = {}) => {
  const sharesOutstanding = getOutstandingShares(sharesData);
  const priceSEK = Number(currentPriceSEK);
  const fx = Number(fxRate);
  const mandateEur = Number(mandateCashEur);

  if (
    !Number.isFinite(sharesOutstanding) ||
    sharesOutstanding <= 0 ||
    !Number.isFinite(priceSEK) ||
    priceSEK <= 0 ||
    !Number.isFinite(fx) ||
    fx <= 0 ||
    !Number.isFinite(mandateEur) ||
    mandateEur <= 0
  ) {
    return null;
  }

  const mandateSek = mandateEur * fx;
  const buybackYield = mandateSek / priceSEK / sharesOutstanding;
  const base = clamp(buybackYield, MIN_BBY, MAX_BBY);

  return {
    base,
    bull: clamp(base * 1.2, MIN_BBY, MAX_BBY),
    bear: clamp(base * 0.8, MIN_BBY, MAX_BBY),
    mandateSek,
    buybackYield,
    sharesOutstanding,
  };
};

export { DEFAULT_BUYBACK_MANDATE_CASH_EUR };
