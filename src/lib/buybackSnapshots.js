// Helpers for merging and normalizing buyback snapshots.

const formatDateKey = (value) => String(value || "").slice(0, 10);

const toFiniteNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeRows = (rows) => {
  const byDate = new Map();

  for (const row of Array.isArray(rows) ? rows : []) {
    const date = formatDateKey(row?.Datum ?? row?.date ?? row?.Date);
    if (!date) continue;

    const normalized = {
      ...row,
      Datum: date,
    };

    const shares = toFiniteNumber(normalized.Antal_aktier);
    if (shares != null) normalized.Antal_aktier = shares;

    const transactionValue = toFiniteNumber(normalized.Transaktionsvärde);
    if (transactionValue != null) normalized.Transaktionsvärde = transactionValue;

    const price = toFiniteNumber(normalized.Snittkurs);
    if (price != null) normalized.Snittkurs = price;

    const volume = toFiniteNumber(normalized.Dagsvolym ?? normalized.volume);
    if (volume != null) normalized.Dagsvolym = volume;

    const existing = byDate.get(date) || {};
    byDate.set(date, { ...existing, ...normalized });
  }

  return byDate;
};

export const combineBuybackSnapshots = (historicalRows, currentRows) => {
  const combined = new Map();

  for (const [date, row] of normalizeRows(historicalRows).entries()) {
    combined.set(date, row);
  }

  for (const [date, row] of normalizeRows(currentRows).entries()) {
    combined.set(date, { ...(combined.get(date) || {}), ...row });
  }

  return Array.from(combined.values()).sort((a, b) => String(a.Datum || "").localeCompare(String(b.Datum || "")));
};
