const normalizeYmd = (value) => {
  const s = String(value || "").trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
};

const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const sumShares = (lots) =>
  (Array.isArray(lots) ? lots : []).reduce((sum, lot) => sum + Math.max(0, Number(lot?.shares) || 0), 0);

const applySellFifoWithCost = (lots, sharesToSell) => {
  let remaining = Math.max(0, Number(sharesToSell) || 0);
  const nextLots = [];
  let costOfSold = 0;

  for (const lot of lots) {
    const lotShares = Math.max(0, Number(lot?.shares) || 0);
    const lotCost = Math.max(0, Number(lot?.costPerShare) || 0);
    if (lotShares <= 0) continue;
    if (remaining <= 0) {
      nextLots.push({ ...lot, shares: lotShares });
      continue;
    }
    const sellFromLot = Math.min(lotShares, remaining);
    costOfSold += sellFromLot * lotCost;
    remaining -= sellFromLot;
    const left = lotShares - sellFromLot;
    if (left > 0) nextLots.push({ ...lot, shares: left });
  }

  return { nextLots, costOfSold, remaining };
};

export function computeTraderPnl({
  transactions,
  currentPrice,
  dividendsReceived = 0,
}) {
  const tx = (Array.isArray(transactions) ? transactions : [])
    .map((t, idx) => {
      const type = t?.type === "buy" || t?.type === "sell" ? t.type : null;
      const date = normalizeYmd(t?.date);
      const shares = Math.abs(Math.round(Number(t?.shares)));
      const price = toNumber(t?.price);
      const fee = Math.max(0, toNumber(t?.fee) || 0);
      if (!type || !date) return null;
      if (!(Number.isFinite(shares) && shares > 0)) return null;
      return { idx, type, date, shares, price, fee };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const c = a.date.localeCompare(b.date);
      if (c !== 0) return c;
      if (a.type !== b.type) return a.type === "buy" ? -1 : 1;
      return a.idx - b.idx;
    });

  let lots = [];
  let realizedPnl = 0;
  let realizedProceeds = 0;
  let realizedCost = 0;
  let feesTotal = 0;
  let missingSellPriceCount = 0;
  let missingSellPriceShares = 0;

  for (const t of tx) {
    feesTotal += t.fee || 0;
    if (t.type === "buy") {
      if (!(t.price > 0)) continue;
      const costPerShare = (t.shares * t.price + (t.fee || 0)) / t.shares;
      lots.push({ shares: t.shares, costPerShare, date: t.date });
      continue;
    }

    // sell
    const { nextLots, costOfSold, remaining } = applySellFifoWithCost(lots, t.shares);
    lots = nextLots;
    realizedCost += costOfSold;

    if (!(t.price > 0)) {
      missingSellPriceCount += 1;
      missingSellPriceShares += t.shares;
      continue;
    }

    const proceeds = t.shares * t.price - (t.fee || 0);
    realizedProceeds += proceeds;
    realizedPnl += proceeds - costOfSold;
  }

  const remainingShares = sumShares(lots);
  const avgCost =
    remainingShares > 0
      ? lots.reduce((sum, l) => sum + (Number(l.shares) || 0) * (Number(l.costPerShare) || 0), 0) / remainingShares
      : 0;
  const live = Number.isFinite(currentPrice) && currentPrice > 0 ? currentPrice : 0;
  const unrealizedPnl = remainingShares > 0 ? remainingShares * (live - avgCost) : 0;

  const dividends = Number.isFinite(dividendsReceived) ? dividendsReceived : 0;
  const totalPnl = realizedPnl + unrealizedPnl + dividends;

  return {
    realizedPnl,
    realizedProceeds,
    realizedCost,
    unrealizedPnl,
    totalPnl,
    feesTotal,
    remainingShares,
    remainingAvgCost: avgCost,
    missingSellPriceCount,
    missingSellPriceShares,
  };
}

