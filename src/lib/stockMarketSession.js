// Selects the verified opening price from Yahoo's intraday candle series.

const STOCKHOLM_TIME_ZONE = "Europe/Stockholm";

function getStockholmDateKey(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
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

function isAtOrAfterStockholmMarketOpen(date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: STOCKHOLM_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value || "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value || "0");
  return hour > 9 || (hour === 9 && minute >= 0);
}

export function findIntradayMarketOpen({ timestamps, opens, referenceDate = new Date() }) {
  if (!Array.isArray(timestamps) || !Array.isArray(opens)) return null;
  const referenceDateKey = getStockholmDateKey(referenceDate);
  if (!referenceDateKey) return null;

  for (let index = 0; index < timestamps.length; index += 1) {
    const timestamp = Number(timestamps[index]);
    const openingPrice = Number(opens[index]);
    if (!Number.isFinite(timestamp) || !Number.isFinite(openingPrice) || openingPrice <= 0) continue;

    const candleTime = new Date(timestamp * 1000);
    if (
      getStockholmDateKey(candleTime) === referenceDateKey &&
      isAtOrAfterStockholmMarketOpen(candleTime)
    ) {
      return openingPrice;
    }
  }

  return null;
}
