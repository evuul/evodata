// Normalizes persisted portfolio profiles before they are shown or stored.

import {
  normalizePortfolioTransactions,
  rebuildPortfolioFromTransactions,
} from "./portfolioTransactions.js";

const normalizeDate = (value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
};

const toFiniteNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toNonNegativeNumber = (value) => {
  const parsed = toFiniteNumber(value);
  return parsed != null && parsed >= 0 ? parsed : null;
};

const normalizeLot = (lot) => {
  const shares = Math.abs(Math.round(Number(lot?.shares)));
  const price = toFiniteNumber(lot?.price);
  const date = normalizeDate(lot?.date);
  if (!(shares > 0) || !(price != null && price >= 0) || !date) return null;
  return { shares, price, date };
};

const buildProfileFromTransactions = (transactions) => {
  const rebuilt = rebuildPortfolioFromTransactions(transactions, { strict: false });
  return rebuilt.ok && rebuilt.profile.transactions.length ? rebuilt.profile : null;
};

export const normalizePortfolioProfile = (profile) => {
  const raw = profile && typeof profile === "object" ? profile : {};
  const normalizedLots = Array.isArray(raw.lots) ? raw.lots.map(normalizeLot).filter(Boolean) : [];
  const normalizedTransactions = normalizePortfolioTransactions(raw.transactions);

  const fallbackShares = toNonNegativeNumber(raw.shares) ?? 0;
  const fallbackAvgCost = toNonNegativeNumber(raw.avgCost) ?? 0;
  const fallbackAcquisitionDate = normalizeDate(raw.acquisitionDate);

  if (normalizedLots.length > 0) {
    const shares = normalizedLots.reduce((sum, lot) => sum + lot.shares, 0);
    const totalCost = normalizedLots.reduce((sum, lot) => sum + lot.shares * lot.price, 0);
    const avgCost = shares > 0 ? totalCost / shares : 0;
    const acquisitionDate =
      fallbackAcquisitionDate ??
      normalizedLots.reduce((earliest, lot) => (!earliest || lot.date < earliest ? lot.date : earliest), null);

    return {
      ...raw,
      shares,
      avgCost,
      acquisitionDate,
      lots: normalizedLots,
      transactions: normalizedTransactions,
    };
  }

  const derivedFromTransactions = Array.isArray(raw.transactions)
    ? buildProfileFromTransactions(raw.transactions)
    : null;
  if (derivedFromTransactions) {
    return {
      ...raw,
      ...derivedFromTransactions,
    };
  }

  return {
    ...raw,
    shares: fallbackShares,
    avgCost: fallbackAvgCost,
    acquisitionDate: fallbackAcquisitionDate,
    lots: [],
    transactions: normalizedTransactions,
  };
};
