// Normalizes persisted portfolio profiles before they are shown or stored.

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

const normalizeTransaction = (tx, index) => {
  const type = tx?.type === "buy" || tx?.type === "sell" ? tx.type : null;
  const date = normalizeDate(tx?.date);
  const shares = Math.abs(Math.round(Number(tx?.shares)));
  const price = toFiniteNumber(tx?.price);
  const feeValue = toFiniteNumber(tx?.fee);
  const fee = feeValue != null && feeValue > 0 ? feeValue : 0;
  const sourceOrderValue = toFiniteNumber(tx?.sourceOrder);
  const sourceOrder = sourceOrderValue != null ? sourceOrderValue : index;

  if (!type || !date || !(shares > 0)) return null;
  if (type === "buy" && !(price != null && price > 0)) return null;

  return {
    type,
    date,
    shares,
    price: price != null ? price : null,
    fee,
    sourceOrder,
  };
};

const applySellFifo = (lots, sharesToSell) => {
  let remaining = Math.max(0, Number(sharesToSell) || 0);
  const nextLots = [];

  for (const lot of lots) {
    const lotShares = Math.max(0, Number(lot?.shares) || 0);
    if (!(lotShares > 0)) continue;
    if (remaining <= 0) {
      nextLots.push({ ...lot, shares: lotShares });
      continue;
    }
    if (lotShares <= remaining) {
      remaining -= lotShares;
      continue;
    }
    nextLots.push({ ...lot, shares: lotShares - remaining });
    remaining = 0;
  }

  return { nextLots, remaining };
};

const buildProfileFromTransactions = (transactions) => {
  const normalized = transactions
    .map((tx, index) => normalizeTransaction(tx, index))
    .filter(Boolean)
    .sort((a, b) => {
      const byDate = a.date.localeCompare(b.date);
      if (byDate !== 0) return byDate;
      if (a.type !== b.type) return a.type === "buy" ? -1 : 1;
      return a.sourceOrder - b.sourceOrder;
    });

  if (!normalized.length) return null;

  let computedShares = 0;
  let computedAvgCost = 0;
  let computedLots = [];

  for (const tx of normalized) {
    if (tx.type === "buy") {
      const unitPrice = (tx.shares * tx.price + (tx.fee || 0)) / tx.shares;
      const totalCost = computedAvgCost * computedShares + tx.shares * unitPrice;
      computedShares += tx.shares;
      computedAvgCost = computedShares > 0 ? totalCost / computedShares : 0;
      computedLots.push({ shares: tx.shares, price: unitPrice, date: tx.date });
      continue;
    }

    if (tx.shares > computedShares) {
      return null;
    }

    const { nextLots } = applySellFifo(computedLots, tx.shares);
    computedLots = nextLots;
    computedShares = Math.max(computedShares - tx.shares, 0);
    if (computedShares === 0) {
      computedAvgCost = 0;
      computedLots = [];
    } else if (computedLots.length > 0) {
      const remainingCost = computedLots.reduce((sum, lot) => sum + (Number(lot.shares) || 0) * (Number(lot.price) || 0), 0);
      computedAvgCost = remainingCost / computedShares;
    }
  }

  return {
    shares: computedShares,
    avgCost: computedAvgCost,
    acquisitionDate: computedLots.length ? String(computedLots[0].date || "").slice(0, 10) : null,
    lots: computedLots,
    transactions: normalized,
  };
};

export const normalizePortfolioProfile = (profile) => {
  const raw = profile && typeof profile === "object" ? profile : {};
  const normalizedLots = Array.isArray(raw.lots) ? raw.lots.map(normalizeLot).filter(Boolean) : [];
  const normalizedTransactions = Array.isArray(raw.transactions)
    ? raw.transactions
        .map((tx, index) => normalizeTransaction(tx, index))
        .filter(Boolean)
    : [];

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
