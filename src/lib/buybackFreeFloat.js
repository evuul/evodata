// Calculates an indicative free-float share base for the buyback analysis.

export const FREE_FLOAT_OWNER_ASSUMPTIONS = Object.freeze([
  Object.freeze({
    name: "Candle Lake Ltd (Kenneth Dart)",
    shares: 49_736_705,
    holdingDate: "2026-04-14",
  }),
  Object.freeze({
    name: "Österbahr Ventures AB",
    shares: 21_763_850,
    holdingDate: "2026-02-10",
  }),
]);

export const FREE_FLOAT_SOURCE_URL =
  "https://www.evolution.com/investors/share-information/shareholder-structure";

const toPositiveNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
};

export const calculateIndicativeFreeFloat = ({
  totalShares,
  companyTreasuryShares = 0,
  excludedOwners = FREE_FLOAT_OWNER_ASSUMPTIONS,
} = {}) => {
  const total = toPositiveNumber(totalShares);
  const treasury = Math.min(toPositiveNumber(companyTreasuryShares), total);
  const owners = Array.isArray(excludedOwners) ? excludedOwners : [];
  const excludedOwnerShares = owners.reduce((sum, owner) => sum + toPositiveNumber(owner?.shares), 0);
  const freeFloatShares = Math.max(total - treasury - excludedOwnerShares, 0);

  return {
    totalShares: total,
    companyTreasuryShares: treasury,
    excludedOwnerShares,
    excludedOwners: owners,
    freeFloatShares,
    freeFloatPct: total > 0 ? (freeFloatShares / total) * 100 : null,
    excludedOwnerPct: total > 0 ? (excludedOwnerShares / total) * 100 : null,
  };
};

export const calculateBuybackPctOfFreeFloat = (shares, freeFloatShares) => {
  const buybackShares = Number(shares);
  const freeFloat = Number(freeFloatShares);
  if (!Number.isFinite(buybackShares) || buybackShares < 0 || !Number.isFinite(freeFloat) || freeFloat <= 0) return null;
  return (buybackShares / freeFloat) * 100;
};
