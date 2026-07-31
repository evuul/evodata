// Defines history access limits and avoids database reads before tracking began.

export const STANDARD_HISTORY_MAX_DAYS = 180;
export const EXTENDED_HISTORY_MAX_DAYS = 730;
export const HISTORY_TRACKING_STARTED_YMD = "2025-03-17";

const DAY_MS = 24 * 60 * 60 * 1000;

export function getAvailableHistoryDays(todayYmd, startedYmd = HISTORY_TRACKING_STARTED_YMD) {
  const today = Date.parse(`${todayYmd}T00:00:00Z`);
  const started = Date.parse(`${startedYmd}T00:00:00Z`);
  if (!Number.isFinite(today) || !Number.isFinite(started) || today < started) return 1;
  return Math.floor((today - started) / DAY_MS) + 1;
}

export function limitHistoryReadDays(requestedDays, todayYmd) {
  const requested = Number(requestedDays);
  const safeRequested = Number.isFinite(requested)
    ? Math.max(1, Math.min(Math.floor(requested), EXTENDED_HISTORY_MAX_DAYS))
    : 1;
  return Math.min(safeRequested, getAvailableHistoryDays(todayYmd));
}
