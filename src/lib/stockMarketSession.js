// Applies Stockholm exchange session boundaries to daily stock changes.

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

export function applyMarketSessionBoundary({
  changePercent,
  marketOpen,
  previousClose,
  generatedAt,
  now = new Date(),
}) {
  const phase = getStockholmMarketSessionPhase(now);
  if (phase === "pre-open") {
    return { phase, changePercent: 0, marketOpen: null };
  }

  const openingPrice = Number(marketOpen);
  const normalizedOpen = Number.isFinite(openingPrice) && openingPrice > 0 ? openingPrice : null;
  const closePrice = Number(previousClose);
  const normalizedPreviousClose =
    Number.isFinite(closePrice) && closePrice > 0 ? closePrice : null;
  const parsedChange =
    changePercent == null || changePercent === "" ? null : Number(changePercent);
  const normalizedChange = Number.isFinite(parsedChange) ? parsedChange : null;
  if (phase === "open") {
    const generatedDateKey = getStockholmDateKey(new Date(generatedAt));
    const currentDateKey = getStockholmDateKey(now);
    if (!normalizedPreviousClose || !generatedDateKey || generatedDateKey !== currentDateKey) {
      return { phase, changePercent: null, marketOpen: normalizedOpen };
    }
  }

  return { phase, changePercent: normalizedChange, marketOpen: normalizedOpen };
}

export function isMarketSessionCacheCompatible(payload, now = new Date()) {
  const currentPhase = getStockholmMarketSessionPhase(now);
  const cachedPhase = String(payload?.marketSessionPhase || "");
  return cachedPhase === currentPhase;
}
