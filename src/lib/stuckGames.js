// Helpers for detecting game series that have stayed on the same value too long.

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_MIN_RUN = 8;
const DEFAULT_MIN_DAYS = 1;

export function computeTrailingStuckMeta(series, options = {}) {
  if (!Array.isArray(series) || series.length < 2) return null;

  const now = Number.isFinite(Number(options.now)) ? Number(options.now) : Date.now();
  const minRun = Math.max(2, Number(options.minRun) || DEFAULT_MIN_RUN);
  const minDays = Math.max(1, Number(options.minDays) || DEFAULT_MIN_DAYS);

  const latest = series[series.length - 1];
  const latestValue = Number(latest?.value);
  const latestTs = Number(latest?.ts);
  if (!Number.isFinite(latestValue) || !Number.isFinite(latestTs)) return null;

  let startIndex = series.length - 1;
  while (startIndex > 0) {
    const prev = series[startIndex - 1];
    if (Number(prev?.value) !== latestValue) break;
    startIndex -= 1;
  }

  const runLength = series.length - startIndex;
  if (runLength < minRun) return null;

  const start = series[startIndex];
  const startTs = Number(start?.ts);
  if (!Number.isFinite(startTs)) return null;

  const stuckAgeDays = Math.max(0, Math.floor((now - startTs) / DAY_MS));
  if (stuckAgeDays < minDays) return null;

  return {
    stuck: true,
    stuckDays: Math.max(1, stuckAgeDays),
    stuckSince: new Date(startTs).toISOString(),
    stuckLatestAt: new Date(latestTs).toISOString(),
    stuckValue: Math.round(latestValue),
    stuckRunLength: runLength,
  };
}
