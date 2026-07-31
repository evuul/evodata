// Calculates session price changes from current quotes and daily close history.

const STOCKHOLM_TIME_ZONE = "Europe/Stockholm";

function toTradingDateKey(value) {
  if (value == null || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: STOCKHOLM_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return year && month && day ? `${year}-${month}-${day}` : null;
}

function normalizeDailyRows(dailyRows) {
  if (!Array.isArray(dailyRows)) return [];

  return dailyRows
    .map((row) => {
      if (row?.close == null || row.close === "") return null;
      const date = row?.date instanceof Date ? row.date : new Date(row?.date);
      const close = Number(row?.close);
      if (Number.isNaN(date.getTime()) || !Number.isFinite(close)) return null;
      return { date, close };
    })
    .filter(Boolean)
    .sort((a, b) => a.date - b.date);
}

function calculatePercentChange(currentPrice, previousClose) {
  if (!Number.isFinite(currentPrice) || !Number.isFinite(previousClose) || previousClose === 0) {
    return null;
  }

  return ((currentPrice - previousClose) / previousClose) * 100;
}

function countWeekdaysBetween(startDateKey, endDateKey) {
  if (!startDateKey || !endDateKey || startDateKey >= endDateKey) return 0;

  const cursor = new Date(`${startDateKey}T12:00:00.000Z`);
  const end = new Date(`${endDateKey}T12:00:00.000Z`);
  let weekdays = 0;

  cursor.setUTCDate(cursor.getUTCDate() + 1);
  while (cursor < end) {
    const weekday = cursor.getUTCDay();
    if (weekday !== 0 && weekday !== 6) weekdays += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return weekdays;
}

export function calculateDailyCloseChangePercent(dailyRows) {
  const rows = normalizeDailyRows(dailyRows);
  if (rows.length < 2) return null;

  return calculatePercentChange(rows.at(-1).close, rows.at(-2).close);
}

export function calculateQuoteChangePercent({
  currentPrice,
  dailyRows,
  quoteTime,
  previousClose,
}) {
  if (currentPrice == null || currentPrice === "") return null;
  const price = Number(currentPrice);
  if (!Number.isFinite(price)) return null;

  const explicitPreviousClose = Number(previousClose);
  if (Number.isFinite(explicitPreviousClose) && explicitPreviousClose > 0) {
    return calculatePercentChange(price, explicitPreviousClose);
  }

  const rows = normalizeDailyRows(dailyRows);
  if (rows.length === 0) return null;
  const latestRow = rows.at(-1);
  const quoteDate = toTradingDateKey(quoteTime);
  const latestRowDate = toTradingDateKey(latestRow.date);
  if (
    quoteDate &&
    latestRowDate &&
    (latestRowDate > quoteDate || countWeekdaysBetween(latestRowDate, quoteDate) > 0)
  ) {
    return null;
  }

  const dailySeriesIncludesQuoteSession = quoteDate
    ? quoteDate === latestRowDate
    : price === latestRow.close;
  const fallbackPreviousClose = dailySeriesIncludesQuoteSession ? rows.at(-2)?.close : latestRow.close;

  return calculatePercentChange(price, fallbackPreviousClose);
}
