// Resolves time-limited subscriber access while preserving legacy permanent subscribers.

export function isSubscriberActive(user, now = Date.now()) {
  if (!user?.isSubscriber) return false;

  const rawExpiry = user.subscriberUntil;
  if (rawExpiry == null || String(rawExpiry).trim() === "") return true;

  const expiry = Date.parse(String(rawExpiry));
  return Number.isFinite(expiry) && expiry > now;
}
