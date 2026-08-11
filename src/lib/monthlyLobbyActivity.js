// Groups daily lobby averages into comparable calendar-month activity series.

const MONTHS = [
  { key: "01", sv: "Jan", en: "Jan" },
  { key: "02", sv: "Feb", en: "Feb" },
  { key: "03", sv: "Mar", en: "Mar" },
  { key: "04", sv: "Apr", en: "Apr" },
  { key: "05", sv: "Maj", en: "May" },
  { key: "06", sv: "Jun", en: "Jun" },
  { key: "07", sv: "Jul", en: "Jul" },
  { key: "08", sv: "Aug", en: "Aug" },
  { key: "09", sv: "Sep", en: "Sep" },
  { key: "10", sv: "Okt", en: "Oct" },
  { key: "11", sv: "Nov", en: "Nov" },
  { key: "12", sv: "Dec", en: "Dec" },
];

const toFiniteNumber = (value) => {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeHistoryRow = (row) => {
  const date = String(row?.date ?? row?.Datum ?? "").slice(0, 10);
  const avgPlayers = toFiniteNumber(
    row?.avgPlayers ?? row?.players ?? row?.Players ?? row?.avg
  );
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || avgPlayers == null || avgPlayers < 0) {
    return null;
  }
  return { date, avgPlayers };
};

const normalizeDailyRows = (rows) =>
  (Array.isArray(rows) ? rows : [])
    .map(normalizeHistoryRow)
    .filter(Boolean)
    .map((row) => ({ date: row.date, players: row.avgPlayers }))
    .sort((left, right) => left.date.localeCompare(right.date));

export function mergeDailyLobbyHistory(historicalRows, liveRows) {
  const rowsByDate = new Map();
  for (const source of [historicalRows, liveRows]) {
    for (const row of Array.isArray(source) ? source : []) {
      const normalized = normalizeHistoryRow(row);
      if (normalized) rowsByDate.set(normalized.date, normalized);
    }
  }
  return Array.from(rowsByDate.values()).sort((left, right) =>
    left.date.localeCompare(right.date)
  );
}

export function filterMonthlyComparisonRows(rows, { year = 2025, fromMonth = 11 } = {}) {
  return normalizeDailyRows(rows).filter((row) => {
    const rowYear = Number(row.date.slice(0, 4));
    const rowMonth = Number(row.date.slice(5, 7));
    return rowYear !== year || rowMonth >= fromMonth;
  });
}

export function resolveMonthlyComparisonYears(rows, maximumYears = 2) {
  const years = Array.from(
    new Set(normalizeDailyRows(rows).map((row) => Number(row.date.slice(0, 4))))
  ).sort((left, right) => right - left);

  return years.slice(0, Math.max(1, maximumYears)).sort((left, right) => left - right);
}

export function buildMonthlyLobbyActivity(rows, years = resolveMonthlyComparisonYears(rows)) {
  const selectedYears = Array.from(new Set((Array.isArray(years) ? years : []).map(Number)))
    .filter((year) => Number.isInteger(year) && year >= 2000 && year <= 9999)
    .sort((left, right) => left - right);
  const buckets = new Map();

  for (const row of normalizeDailyRows(rows)) {
    const year = Number(row.date.slice(0, 4));
    if (!selectedYears.includes(year)) continue;
    const month = row.date.slice(5, 7);
    const key = `${year}-${month}`;
    const entry = buckets.get(key) ?? { total: 0, days: 0 };
    entry.total += row.players;
    entry.days += 1;
    buckets.set(key, entry);
  }

  return MONTHS.map((month, index) => {
    const item = {
      month: index + 1,
      monthSv: month.sv,
      monthEn: month.en,
    };
    for (const year of selectedYears) {
      const entry = buckets.get(`${year}-${month.key}`);
      item[String(year)] = entry?.days ? Math.round(entry.total / entry.days) : null;
      item[`${year}Days`] = entry?.days ?? 0;
    }
    return item;
  });
}

export function findLatestMonthlyComparison(activity, years) {
  const selectedYears = Array.from(new Set((Array.isArray(years) ? years : []).map(String)))
    .filter((year) => /^\d{4}$/.test(year));
  if (selectedYears.length !== 2) return null;

  const [previousYear, currentYear] = selectedYears;
  const rows = Array.isArray(activity) ? activity : [];
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const row = rows[index];
    const previousValue = toFiniteNumber(row?.[previousYear]);
    const currentValue = toFiniteNumber(row?.[currentYear]);
    if (previousValue == null || currentValue == null || previousValue <= 0) continue;
    return {
      ...row,
      previousYear,
      currentYear,
      changePct: ((currentValue - previousValue) / previousValue) * 100,
    };
  }
  return null;
}
