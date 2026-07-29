// Normalizes live top-win history options and builds stable request cache keys.

export const LIVE_TOP3_DEFAULT_HISTORY_DAYS = 30;
export const LIVE_TOP3_DEFAULT_HISTORY_PER_DAY = 3;
export const LIVE_TOP3_MAX_HISTORY_DAYS = 90;
export const LIVE_TOP3_MAX_HISTORY_PER_DAY = 20;

const toBoundedInteger = (value, fallback, max) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), max);
};

export function normalizeLiveTop3Options(options = {}, defaults = {}) {
  const fallbackDays = Number(defaults.historyDays) || 0;
  const fallbackPerDay = Number(defaults.historyPerDay) || 0;
  return {
    historyDays: toBoundedInteger(options.historyDays, fallbackDays, LIVE_TOP3_MAX_HISTORY_DAYS),
    historyPerDay: toBoundedInteger(options.historyPerDay, fallbackPerDay, LIVE_TOP3_MAX_HISTORY_PER_DAY),
  };
}

export function buildLiveTop3CacheKey(options = {}) {
  const normalized = normalizeLiveTop3Options(options);
  return `${normalized.historyDays}:${normalized.historyPerDay}`;
}
