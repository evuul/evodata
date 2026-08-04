// Derives a clearly labelled illustrative intraday share-pool pace from verified buybacks.

export const SECONDS_PER_DAY = 24 * 60 * 60;

const toPositiveNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
};

export const calculateBuybackPace = ({ latestWeekShares = 0, tradingDays = 0 } = {}) => {
  const weeklyShares = toPositiveNumber(latestWeekShares);
  const days = toPositiveNumber(tradingDays);
  const dailyShares = days > 0 ? weeklyShares / days : 0;
  return {
    dailyShares,
    sharesPerSecond: dailyShares / SECONDS_PER_DAY,
  };
};

export const calculateIllustrativeSharePool = ({
  totalShares = 0,
  verifiedTreasuryShares = 0,
  latestWeekShares = 0,
  tradingDays = 0,
  forecastDays = tradingDays,
  verifiedSharesThisWeek = 0,
  secondsElapsed = 0,
} = {}) => {
  const issuedShares = toPositiveNumber(totalShares);
  const verifiedTreasury = Math.min(toPositiveNumber(verifiedTreasuryShares), issuedShares);
  const { dailyShares, sharesPerSecond } = calculateBuybackPace({ latestWeekShares, tradingDays });
  const maximumEstimateSeconds = Math.max(toPositiveNumber(forecastDays), 1) * SECONDS_PER_DAY;
  const elapsed = Math.min(Math.max(Number(secondsElapsed) || 0, 0), maximumEstimateSeconds);
  const illustrativeBoughtSinceWeekStart = Math.min(sharesPerSecond * elapsed, Math.max(issuedShares - verifiedTreasury, 0));
  const illustrativeTreasuryShares = verifiedTreasury + illustrativeBoughtSinceWeekStart;
  const verifiedThisWeek = toPositiveNumber(verifiedSharesThisWeek);

  return {
    issuedShares,
    verifiedTreasuryShares: verifiedTreasury,
    outstandingShares: issuedShares - verifiedTreasury,
    dailyShares,
    sharesPerSecond,
    illustrativeBoughtSinceWeekStart,
    estimatedWeekToDateShares: verifiedThisWeek + illustrativeBoughtSinceWeekStart,
    illustrativeTreasuryShares,
    illustrativeOutstandingShares: issuedShares - illustrativeTreasuryShares,
  };
};

// Creates a bounded forecast window after either a completed week or an early disclosure.
export const buildSharePoolForecastWindow = ({
  verifiedDate,
  reportedEarly = false,
  tradingDays = 5,
  currentDate,
  secondsToday = 0,
} = {}) => {
  const verified = /^\d{4}-\d{2}-\d{2}$/.test(String(verifiedDate || ""))
    ? new Date(`${verifiedDate}T00:00:00.000Z`)
    : null;
  const current = /^\d{4}-\d{2}-\d{2}$/.test(String(currentDate || ""))
    ? new Date(`${currentDate}T00:00:00.000Z`)
    : null;
  const days = Math.max(1, Math.round(toPositiveNumber(tradingDays)) || 5);
  if (!verified || !current || Number.isNaN(verified.getTime()) || Number.isNaN(current.getTime())) {
    return { secondsElapsed: 0, forecastDays: days };
  }

  const weekday = verified.getUTCDay(); // Monday = 1, Friday = 5
  const isMidweekDisclosure = reportedEarly && weekday >= 1 && weekday < 5;
  const start = new Date(verified);
  const forecastDays = isMidweekDisclosure ? Math.max(days - weekday, 1) : days;

  if (isMidweekDisclosure) {
    start.setUTCDate(start.getUTCDate() + 1);
  } else {
    const nextMondayOffset = ((8 - weekday) % 7) || 7;
    start.setUTCDate(start.getUTCDate() + nextMondayOffset);
  }

  const elapsedDays = Math.floor((current.getTime() - start.getTime()) / (SECONDS_PER_DAY * 1_000));
  return {
    secondsElapsed: Math.max(elapsedDays * SECONDS_PER_DAY + Math.max(0, Number(secondsToday) || 0), 0),
    forecastDays,
  };
};
