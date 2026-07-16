// Normalizes buyback execution and share-count changes for valuation models.

export const DEFAULT_BUYBACK_MANDATE_CASH_EUR = 2_000_000_000;
export const CURRENT_BUYBACK_MANDATE_START_DATE = "2026-05-18";
export const CURRENT_BUYBACK_EXECUTION_START_DATE = "2026-05-19";

const toFiniteNumber = (value) => {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const toAbsoluteShares = (value) => {
  const shares = toFiniteNumber(value);
  if (shares == null || shares <= 0) return null;
  return shares > 1_000_000 ? shares : shares * 1_000_000;
};

const normalizeDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(timestamp) ? value : null;
};

const latestShareSnapshot = (sharesData = []) => {
  if (!Array.isArray(sharesData)) return null;

  return sharesData
    .map((row) => ({
      date: normalizeDate(row?.date),
      shares: toAbsoluteShares(row?.sharesOutstanding),
    }))
    .filter((row) => row.date && row.shares)
    .sort((a, b) => a.date.localeCompare(b.date))
    .at(-1) ?? null;
};

export const normalizeBuybackExecutions = (buybackData = []) => {
  if (!Array.isArray(buybackData)) return [];

  const uniqueRows = new Map();
  buybackData.forEach((row) => {
    const date = normalizeDate(row?.Datum ?? row?.date);
    const shares = toFiniteNumber(row?.Antal_aktier ?? row?.shares);
    const spendSek = toFiniteNumber(row?.Transaktionsvärde ?? row?.valueSek);
    if (!date || shares == null || shares <= 0 || spendSek == null || spendSek < 0) return;

    const key = `${date}:${shares}:${spendSek}`;
    uniqueRows.set(key, { date, shares, spendSek });
  });

  return [...uniqueRows.values()].sort((a, b) => a.date.localeCompare(b.date));
};

const sumRows = (rows) =>
  rows.reduce(
    (totals, row) => ({
      shares: totals.shares + row.shares,
      spendSek: totals.spendSek + row.spendSek,
    }),
    { shares: 0, spendSek: 0 }
  );

export const summarizeBuybackExecution = ({
  buybackData = [],
  sharesData = [],
  fxRate,
  cashSnapshotDate,
  mandateCashEur = DEFAULT_BUYBACK_MANDATE_CASH_EUR,
  mandateStartDate = CURRENT_BUYBACK_MANDATE_START_DATE,
} = {}) => {
  const snapshot = latestShareSnapshot(sharesData);
  const rows = normalizeBuybackExecutions(buybackData);
  const fx = toFiniteNumber(fxRate);
  const mandateEur = toFiniteNumber(mandateCashEur);

  const rowsAfterSnapshot = snapshot
    ? rows.filter((row) => row.date > snapshot.date)
    : [];
  const normalizedCashSnapshotDate = normalizeDate(cashSnapshotDate);
  const rowsAfterCashSnapshot = normalizedCashSnapshotDate
    ? rows.filter((row) => row.date > normalizedCashSnapshotDate)
    : rowsAfterSnapshot;
  const mandateRows = rows.filter((row) => row.date >= mandateStartDate);
  const afterSnapshot = sumRows(rowsAfterSnapshot);
  const afterCashSnapshot = sumRows(rowsAfterCashSnapshot);
  const mandateExecution = sumRows(mandateRows);

  const reportedShares = snapshot?.shares ?? null;
  const currentShares = reportedShares
    ? Math.max(reportedShares - afterSnapshot.shares, 1)
    : null;
  const mandateSek = fx && mandateEur && fx > 0 && mandateEur > 0
    ? mandateEur * fx
    : null;
  const remainingMandateSek = mandateSek == null
    ? null
    : Math.max(mandateSek - mandateExecution.spendSek, 0);

  return {
    snapshotDate: snapshot?.date ?? null,
    reportedShares,
    currentShares,
    latestBuybackDate: rows.at(-1)?.date ?? null,
    executedSharesAfterSnapshot: afterSnapshot.shares,
    executedSpendAfterSnapshotSek: afterSnapshot.spendSek,
    cashSnapshotDate: normalizedCashSnapshotDate,
    executedSpendAfterCashSnapshotSek: afterCashSnapshot.spendSek,
    executedSharesInMandate: mandateExecution.shares,
    executedSpendInMandateSek: mandateExecution.spendSek,
    executedShareReduction:
      reportedShares && reportedShares > 0 ? afterSnapshot.shares / reportedShares : 0,
    executedEpsBoost:
      reportedShares && currentShares ? reportedShares / currentShares - 1 : 0,
    mandateSek,
    remainingMandateSek,
    validRowCount: rows.length,
  };
};

// Kept for existing consumers; rates now describe observed execution, not a promised mandate.
export const computeBuybackMandateAssumptions = ({
  mandateCashEur = DEFAULT_BUYBACK_MANDATE_CASH_EUR,
  currentPriceSEK,
  fxRate,
  sharesData,
  buybackData = [],
} = {}) => {
  const summary = summarizeBuybackExecution({
    buybackData,
    sharesData,
    fxRate,
    mandateCashEur,
  });
  const priceSek = toFiniteNumber(currentPriceSEK);
  const mandateSek = summary.mandateSek;
  const marketCapSek = priceSek && summary.currentShares
    ? priceSek * summary.currentShares
    : null;

  return {
    ...summary,
    marketCapSek,
    mandateYield:
      mandateSek && marketCapSek && marketCapSek > 0 ? mandateSek / marketCapSek : null,
  };
};
