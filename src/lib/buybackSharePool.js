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
  secondsElapsed = 0,
} = {}) => {
  const issuedShares = toPositiveNumber(totalShares);
  const verifiedTreasury = Math.min(toPositiveNumber(verifiedTreasuryShares), issuedShares);
  const { dailyShares, sharesPerSecond } = calculateBuybackPace({ latestWeekShares, tradingDays });
  const maximumEstimateSeconds = Math.max(toPositiveNumber(tradingDays), 1) * SECONDS_PER_DAY;
  const elapsed = Math.min(Math.max(Number(secondsElapsed) || 0, 0), maximumEstimateSeconds);
  const illustrativeBoughtSinceWeekStart = Math.min(sharesPerSecond * elapsed, Math.max(issuedShares - verifiedTreasury, 0));
  const illustrativeTreasuryShares = verifiedTreasury + illustrativeBoughtSinceWeekStart;

  return {
    issuedShares,
    verifiedTreasuryShares: verifiedTreasury,
    outstandingShares: issuedShares - verifiedTreasury,
    dailyShares,
    sharesPerSecond,
    illustrativeBoughtSinceWeekStart,
    illustrativeTreasuryShares,
    illustrativeOutstandingShares: issuedShares - illustrativeTreasuryShares,
  };
};
