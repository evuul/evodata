// Defines the delayed, frequency-capped donation prompt policy.

export const DEFAULT_DONATION_NUDGE_DELAY_MS = 30_000;
export const DONATION_NUDGE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export function isDonationNudgeDismissalFresh(rawTimestamp, now = Date.now()) {
  const dismissedAt = Number(rawTimestamp);
  if (!Number.isFinite(dismissedAt) || dismissedAt <= 0) return false;
  const elapsed = now - dismissedAt;
  return elapsed >= 0 && elapsed < DONATION_NUDGE_TTL_MS;
}
