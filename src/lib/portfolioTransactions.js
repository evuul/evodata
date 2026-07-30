// Validates portfolio transactions and rebuilds holdings after ledger changes.

const MAX_TRANSACTIONS = 5_000;
const MAX_SHARES = 1_000_000_000;
const MAX_MONEY_VALUE = 1_000_000_000;
const TRANSACTION_ID_PATTERN = /^tx_[A-Za-z0-9_-]{1,72}$/;

const isValidYmd = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const toFiniteNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const createTransactionId = (index, usedIds) => {
  let suffix = index + 1;
  let id = `tx_${suffix}`;
  while (usedIds.has(id)) {
    suffix += 1;
    id = `tx_${suffix}`;
  }
  return id;
};

const normalizeTransaction = (transaction, index, usedIds) => {
  const type = transaction?.type === "buy" || transaction?.type === "sell" ? transaction.type : null;
  const date = typeof transaction?.date === "string" ? transaction.date.trim().slice(0, 10) : "";
  const shares = Math.abs(Math.round(Number(transaction?.shares)));
  const priceValue = toFiniteNumber(transaction?.price);
  const price = priceValue != null && priceValue > 0 && priceValue <= MAX_MONEY_VALUE ? priceValue : null;
  const feeValue = toFiniteNumber(transaction?.fee);
  const fee = feeValue != null && feeValue >= 0 && feeValue <= MAX_MONEY_VALUE ? feeValue : 0;
  const orderValue = toFiniteNumber(transaction?.sourceOrder);
  const sourceOrder = orderValue != null ? orderValue : index;
  const requestedId = typeof transaction?.id === "string" ? transaction.id.trim() : "";

  if (!type || !isValidYmd(date) || !(shares > 0 && shares <= MAX_SHARES)) return null;
  if (type === "buy" && price == null) return null;

  const id = TRANSACTION_ID_PATTERN.test(requestedId) && !usedIds.has(requestedId)
    ? requestedId
    : createTransactionId(index, usedIds);
  usedIds.add(id);

  return { id, type, date, shares, price, fee, sourceOrder };
};

const isStrictTransactionValid = (transaction) => {
  const shares = Number(transaction?.shares);
  const price = transaction?.price == null || transaction?.price === "" ? null : Number(transaction.price);
  const fee = transaction?.fee == null || transaction?.fee === "" ? 0 : Number(transaction.fee);
  const priceIsValid =
    transaction?.type === "sell" && price == null
      ? true
      : Number.isFinite(price) && price > 0 && price <= MAX_MONEY_VALUE;

  return (
    (transaction?.type === "buy" || transaction?.type === "sell") &&
    isValidYmd(typeof transaction?.date === "string" ? transaction.date.trim().slice(0, 10) : "") &&
    Number.isSafeInteger(shares) &&
    shares > 0 &&
    shares <= MAX_SHARES &&
    priceIsValid &&
    Number.isFinite(fee) &&
    fee >= 0 &&
    fee <= MAX_MONEY_VALUE
  );
};

export function normalizePortfolioTransactions(transactions) {
  const usedIds = new Set();
  return (Array.isArray(transactions) ? transactions : [])
    .map((transaction, index) => normalizeTransaction(transaction, index, usedIds))
    .filter(Boolean);
}

export function buildEditableTransactionLedger(profile) {
  const normalized = normalizePortfolioTransactions(profile?.transactions);
  const rebuilt = rebuildPortfolioFromTransactions(normalized, { strict: false });
  const expectedShares = Math.max(0, Number(profile?.shares) || 0);
  const expectedAvgCost = Math.max(0, Number(profile?.avgCost) || 0);
  const transactionLedgerMatches =
    normalized.length > 0 &&
    rebuilt.ok &&
    rebuilt.profile.shares === expectedShares &&
    Math.abs(rebuilt.profile.avgCost - expectedAvgCost) < 0.01;

  if (transactionLedgerMatches || expectedShares === 0) return normalized;

  const lots = (Array.isArray(profile?.lots) ? profile.lots : [])
    .filter((lot) => Number(lot?.shares) > 0 && Number(lot?.price) >= 0 && isValidYmd(lot?.date))
    .map((lot, index) => ({
      type: "buy",
      date: lot.date,
      shares: lot.shares,
      price: lot.price,
      fee: 0,
      sourceOrder: index,
    }));

  if (lots.length) return normalizePortfolioTransactions(lots);

  const fallbackDate = isValidYmd(profile?.acquisitionDate)
    ? profile.acquisitionDate
    : new Date().toISOString().slice(0, 10);
  return normalizePortfolioTransactions([
    {
      type: "buy",
      date: fallbackDate,
      shares: expectedShares,
      price: expectedAvgCost,
      fee: 0,
    },
  ]);
}

const applySellFifo = (lots, sharesToSell) => {
  let remaining = sharesToSell;
  const nextLots = [];

  for (const lot of lots) {
    if (remaining <= 0) {
      nextLots.push(lot);
      continue;
    }
    if (lot.shares <= remaining) {
      remaining -= lot.shares;
      continue;
    }
    nextLots.push({ ...lot, shares: lot.shares - remaining });
    remaining = 0;
  }

  return { nextLots, remaining };
};

export function rebuildPortfolioFromTransactions(transactions, { strict = true } = {}) {
  if (!Array.isArray(transactions)) {
    return { ok: false, error: "Transaktionshistoriken är ogiltig." };
  }
  if (transactions.length > MAX_TRANSACTIONS) {
    return { ok: false, error: `För många transaktioner (max ${MAX_TRANSACTIONS}).` };
  }
  if (strict && !transactions.every(isStrictTransactionValid)) {
    return { ok: false, error: "En transaktion innehåller ogiltiga värden." };
  }

  const normalized = normalizePortfolioTransactions(transactions);
  if (strict && normalized.length !== transactions.length) {
    return { ok: false, error: "En transaktion innehåller ogiltiga värden." };
  }

  const ordered = normalized.sort((a, b) => {
    const dateOrder = a.date.localeCompare(b.date);
    if (dateOrder !== 0) return dateOrder;
    if (a.type !== b.type) return a.type === "buy" ? -1 : 1;
    return a.sourceOrder - b.sourceOrder;
  });

  let shares = 0;
  let lots = [];

  for (const transaction of ordered) {
    if (transaction.type === "buy") {
      const costPerShare = (transaction.shares * transaction.price + transaction.fee) / transaction.shares;
      lots.push({ shares: transaction.shares, price: costPerShare, date: transaction.date });
      shares += transaction.shares;
      continue;
    }

    if (transaction.shares > shares) {
      return {
        ok: false,
        error: `Försäljningen ${transaction.date} överskrider innehavet vid den tidpunkten.`,
      };
    }
    const result = applySellFifo(lots, transaction.shares);
    lots = result.nextLots;
    shares -= transaction.shares;
  }

  const totalCost = lots.reduce((sum, lot) => sum + lot.shares * lot.price, 0);
  const avgCost = shares > 0 ? totalCost / shares : 0;

  return {
    ok: true,
    profile: {
      shares,
      avgCost,
      acquisitionDate: lots.length ? lots[0].date : null,
      lots,
      transactions: ordered,
    },
  };
}

export function updatePortfolioTransaction(transactions, transactionId, changes) {
  const source = Array.isArray(transactions) ? transactions : [];
  const index = source.findIndex((transaction) => transaction?.id === transactionId);
  if (index < 0) return { ok: false, error: "Transaktionen kunde inte hittas." };

  const next = source.map((transaction, transactionIndex) =>
    transactionIndex === index
      ? {
          ...transaction,
          date: changes?.date,
          shares: changes?.shares,
          price: changes?.price,
          fee: changes?.fee,
        }
      : transaction
  );
  return rebuildPortfolioFromTransactions(next);
}

export function deletePortfolioTransaction(transactions, transactionId) {
  const source = Array.isArray(transactions) ? transactions : [];
  if (!source.some((transaction) => transaction?.id === transactionId)) {
    return { ok: false, error: "Transaktionen kunde inte hittas." };
  }
  return rebuildPortfolioFromTransactions(
    source.filter((transaction) => transaction?.id !== transactionId)
  );
}
