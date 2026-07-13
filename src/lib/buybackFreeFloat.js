// Stores the dated ownership snapshot used by the buyback analysis.

export const FREE_FLOAT_OWNER_ASSUMPTIONS = Object.freeze([
  Object.freeze({
    id: "dart",
    name: "Candle Lake Ltd (Kenneth Dart)",
    shares: 49_736_705,
    holdingDate: "2026-04-14",
    category: "Strategisk ägare",
    excludeFromStrategicFloat: true,
  }),
  Object.freeze({
    id: "osterbahr",
    name: "Österbahr Ventures AB",
    shares: 21_763_850,
    holdingDate: "2026-02-10",
    category: "Strategisk ägare",
    excludeFromStrategicFloat: true,
  }),
  Object.freeze({ id: "capital-group", name: "Capital Group", shares: 9_950_547, holdingDate: "2026-06-22", category: "Fond" }),
  Object.freeze({ id: "blackrock", name: "BlackRock", shares: 6_746_680, holdingDate: "2026-05-31", category: "Fond" }),
  Object.freeze({ id: "vanguard", name: "Vanguard", shares: 5_736_920, holdingDate: "2026-05-31", category: "Fond" }),
  Object.freeze({ id: "richard-livingstone", name: "Richard Livingstone", shares: 4_056_678, holdingDate: "2026-06-26", category: "Privat ägare" }),
  Object.freeze({ id: "avanza-pension", name: "Avanza Pension", shares: 2_654_713, holdingDate: "2026-06-26", category: "Pension" }),
  Object.freeze({ id: "futur-pension", name: "Futur Pension", shares: 1_778_857, holdingDate: "2026-06-26", category: "Pension" }),
  Object.freeze({ id: "avanza-fonder", name: "Avanza Fonder", shares: 1_731_155, holdingDate: "2026-06-26", category: "Fond" }),
  Object.freeze({ id: "henric-wiman", name: "Henric Wiman privat och genom bolag", shares: 1_708_776, holdingDate: "2026-06-26", category: "Privat ägare" }),
]);

export const FREE_FLOAT_SNAPSHOT_DATE = "2026-06-26";
export const FREE_FLOAT_PREVIOUS_SNAPSHOT_DATE = "2025-03-24";
export const FREE_FLOAT_PREVIOUS_TOTAL_SHARES = 209_562_751;
export const FREE_FLOAT_TREASURY_SHARES = 5_141_528;

export const buildInsiderOwnershipTrend = (items, { person } = {}) => {
  const matchingItems = (Array.isArray(items) ? items : []).filter((item) => {
    const instrument = String(item?.instrumentName || "").toLowerCase();
    return (
      (!person || item?.person === person) &&
      item?.direction &&
      instrument.includes("evolution") &&
      !instrument.includes("warrant") &&
      !instrument.includes("option")
    );
  });
  const buyShares = matchingItems.reduce((sum, item) => sum + (item.direction === "buy" ? toPositiveNumber(item.volume) : 0), 0);
  const sellShares = matchingItems.reduce((sum, item) => sum + (item.direction === "sell" ? toPositiveNumber(item.volume) : 0), 0);
  const netShares = buyShares - sellShares;
  return {
    buyShares,
    sellShares,
    netShares,
    direction: netShares > 0 ? "up" : netShares < 0 ? "down" : "flat",
    transactionCount: matchingItems.length,
  };
};

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const toPositiveNumber = (value) => {
  const number = toNumber(value);
  return number != null && number > 0 ? number : 0;
};

export const buildShareholderRows = ({ owners = FREE_FLOAT_OWNER_ASSUMPTIONS, totalShares, previousOwners = [], previousTotalShares = totalShares } = {}) => {
  const total = toPositiveNumber(totalShares);
  const previousTotal = toPositiveNumber(previousTotalShares) || total;
  const previousById = new Map((Array.isArray(previousOwners) ? previousOwners : []).map((owner) => [owner?.id, owner]));
  return (Array.isArray(owners) ? owners : []).map((owner) => {
    const shares = toPositiveNumber(owner?.shares);
    const previousShares = toNumber(previousById.get(owner?.id)?.shares);
    const changeShares = previousShares != null ? shares - previousShares : null;
    const changePctPoints = previousShares != null && total > 0 && previousTotal > 0
      ? Number(((shares / total - previousShares / previousTotal) * 100).toFixed(6))
      : null;
    return {
      ...owner,
      shares,
      ownershipPct: total > 0 ? (shares / total) * 100 : null,
      previousShares,
      changeShares,
      changePctPoints,
    };
  });
};

export const calculateIndicativeFreeFloat = ({
  totalShares,
  companyTreasuryShares = 0,
  excludedOwners = FREE_FLOAT_OWNER_ASSUMPTIONS,
} = {}) => {
  const total = toPositiveNumber(totalShares);
  const treasury = Math.min(toPositiveNumber(companyTreasuryShares), total);
  const owners = Array.isArray(excludedOwners) ? excludedOwners : [];
  const strategicOwners = owners.filter((owner) => owner?.excludeFromStrategicFloat === true);
  const excludedOwnerShares = strategicOwners.reduce((sum, owner) => sum + toPositiveNumber(owner?.shares), 0);
  const freeFloatShares = Math.max(total - treasury - excludedOwnerShares, 0);

  return {
    totalShares: total,
    companyTreasuryShares: treasury,
    excludedOwnerShares,
    excludedOwners: strategicOwners,
    freeFloatShares,
    freeFloatPct: total > 0 ? (freeFloatShares / total) * 100 : null,
    excludedOwnerPct: total > 0 ? (excludedOwnerShares / total) * 100 : null,
  };
};

export const calculateShareholderOverview = ({
  totalShares,
  companyTreasuryShares = 0,
  owners = FREE_FLOAT_OWNER_ASSUMPTIONS,
  previousOwners = [],
  previousTotalShares,
} = {}) => {
  const rows = buildShareholderRows({ owners, totalShares, previousOwners, previousTotalShares });
  const total = toPositiveNumber(totalShares);
  const treasury = Math.min(toPositiveNumber(companyTreasuryShares), total);
  const namedShares = rows.reduce((sum, owner) => sum + owner.shares, 0);
  const otherShares = Math.max(total - treasury - namedShares, 0);
  return {
    rows,
    otherShares,
    otherOwnershipPct: total > 0 ? (otherShares / total) * 100 : null,
    freeFloat: calculateIndicativeFreeFloat({ totalShares: total, companyTreasuryShares: treasury, excludedOwners: rows }),
  };
};

/*
 * The fields below are kept as a small, manually updateable snapshot. When a
 * new owner list is added, copy the current rows to previousOwners so changes
 * can be shown without guessing from rounded percentages.
 */
export const FREE_FLOAT_PREVIOUS_OWNERS = Object.freeze([
  Object.freeze({ id: "dart", shares: 21_496_365 }),
  Object.freeze({ id: "osterbahr", shares: 22_400_140 }),
  Object.freeze({ id: "capital-group", shares: 33_220_860 }),
  Object.freeze({ id: "blackrock", shares: 7_396_737 }),
  Object.freeze({ id: "vanguard", shares: 7_444_652 }),
  Object.freeze({ id: "richard-livingstone", shares: 4_056_678 }),
  Object.freeze({ id: "avanza-pension", shares: 2_950_664 }),
]);

export const FREE_FLOAT_SOURCE_URL =
  "https://www.evolution.com/investors/share-information/shareholder-structure";

export const calculateBuybackPctOfFreeFloat = (shares, freeFloatShares) => {
  const buybackShares = Number(shares);
  const freeFloat = Number(freeFloatShares);
  if (!Number.isFinite(buybackShares) || buybackShares < 0 || !Number.isFinite(freeFloat) || freeFloat <= 0) return null;
  return (buybackShares / freeFloat) * 100;
};
