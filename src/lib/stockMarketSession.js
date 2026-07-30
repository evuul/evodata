// Selects the verified opening price from Yahoo's intraday candle series.

const STOCKHOLM_TIME_ZONE = "Europe/Stockholm";
const RESET_HOUR = 7;
const MARKET_OPEN_HOUR = 9;
const MARKET_CLOSE_HOUR = 17;
const MARKET_CLOSE_MINUTE = 30;

export function getStockholmDateKey(date) {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: STOCKHOLM_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return year && month && day ? `${year}-${month}-${day}` : null;
}

function getStockholmSessionParts(date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: STOCKHOLM_TIME_ZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "";
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return { weekday, hour, minute };
}

export function getStockholmMarketSessionPhase(date = new Date()) {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return "unknown";

  const { weekday, hour, minute } = getStockholmSessionParts(value);
  if (weekday === "Sat" || weekday === "Sun") return "weekend";
  if (hour < RESET_HOUR) return "previous-session";
  if (hour < MARKET_OPEN_HOUR) return "pre-open";
  if (hour < MARKET_CLOSE_HOUR || (hour === MARKET_CLOSE_HOUR && minute <= MARKET_CLOSE_MINUTE)) {
    return "open";
  }
  return "after-close";
}

export function applyMarketSessionBoundary({ changePercent, marketOpen, generatedAt, now = new Date() }) {
  const phase = getStockholmMarketSessionPhase(now);
  if (phase === "pre-open") {
    return { phase, changePercent: 0, marketOpen: null };
  }

  const openingPrice = Number(marketOpen);
  const normalizedOpen = Number.isFinite(openingPrice) && openingPrice > 0 ? openingPrice : null;
  const normalizedChange = Number.isFinite(Number(changePercent)) ? Number(changePercent) : null;
  if (phase === "open") {
    const generatedDateKey = getStockholmDateKey(new Date(generatedAt));
    const currentDateKey = getStockholmDateKey(now);
    if (!normalizedOpen || !generatedDateKey || generatedDateKey !== currentDateKey) {
      return { phase, changePercent: null, marketOpen: null };
    }
  }

  return { phase, changePercent: normalizedChange, marketOpen: normalizedOpen };
}

export function isMarketSessionCacheCompatible(payload, now = new Date()) {
  const currentPhase = getStockholmMarketSessionPhase(now);
  const cachedPhase = String(payload?.marketSessionPhase || "");
  return cachedPhase === currentPhase;
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
