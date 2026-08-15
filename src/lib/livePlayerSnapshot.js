// Normalizes persisted live-player snapshots and evaluates sample freshness.

export const LIVE_PLAYER_FRESHNESS_MS = 20 * 60 * 1000;

export function finiteNumberOrNull(value) {
  if (value == null || (typeof value === "string" && !value.trim())) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isPlayerSampleFresh(timestamp, { now = Date.now(), maxAgeMs } = {}) {
  const sampleTime = typeof timestamp === "number" ? timestamp : Date.parse(String(timestamp || ""));
  const allowedAgeMs = Number(maxAgeMs);
  if (!Number.isFinite(sampleTime) || !Number.isFinite(allowedAgeMs) || allowedAgeMs < 0) return false;

  const ageMs = Number(now) - sampleTime;
  return Number.isFinite(ageMs) && ageMs >= 0 && ageMs <= allowedAgeMs;
}

const roundedOrNull = (value) => {
  const parsed = finiteNumberOrNull(value);
  return parsed == null ? null : Math.round(parsed);
};

export function normalizeLatestPlayerSnapshotItem(item, now = Date.now()) {
  const fetchedAt = typeof item?.fetchedAt === "string" && item.fetchedAt ? item.fetchedAt : null;
  const timestamp = fetchedAt ? Date.parse(fetchedAt) : NaN;
  const players = finiteNumberOrNull(item?.players);
  const stuck = Boolean(item?.stuck);
  const stale = players == null
    || Boolean(item?.stale)
    || !isPlayerSampleFresh(fetchedAt, { now, maxAgeMs: LIVE_PLAYER_FRESHNESS_MS });

  return {
    id: item?.id || null,
    players,
    fetchedAt,
    ageSeconds: Number.isFinite(timestamp) ? Math.max(0, Math.round((now - timestamp) / 1000)) : null,
    stale,
    stuck,
    stuckDays: stuck ? roundedOrNull(item?.stuckDays) : null,
    stuckSince: stuck ? item?.stuckSince || null : null,
    stuckLatestAt: stuck ? item?.stuckLatestAt || null : null,
    stuckValue: stuck ? roundedOrNull(item?.stuckValue) : null,
    stuckRunLength: stuck ? roundedOrNull(item?.stuckRunLength) : 0,
  };
}
