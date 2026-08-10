// Derives the user-facing Premium period and remaining access time.

const DAY_MS = 24 * 60 * 60 * 1000;

const finiteNonNegative = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

export function buildPremiumStatus(user, now = Date.now()) {
  const paymentSek = finiteNonNegative(user?.subscriberPaymentSek);
  const subscriberUntil = Date.parse(String(user?.subscriberUntil || ""));
  const subscriberStartedAt = Date.parse(String(user?.subscriberStartedAt || ""));
  const remainingDays = Number.isFinite(subscriberUntil)
    ? Math.max(0, Math.ceil((subscriberUntil - now) / DAY_MS))
    : null;

  return {
    paymentSek,
    coveredMonths: paymentSek == null ? null : Math.floor(paymentSek / 30),
    remainingCreditSek: paymentSek == null ? null : paymentSek % 30,
    startedAt: Number.isFinite(subscriberStartedAt) ? new Date(subscriberStartedAt) : null,
    expiresAt: Number.isFinite(subscriberUntil) ? new Date(subscriberUntil) : null,
    remainingDays,
    active: Boolean(user?.isSubscriber) && (remainingDays == null || remainingDays > 0),
  };
}

export const formatPremiumDate = (date, locale = "sv") => {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) return "–";
  return date.toLocaleDateString(locale === "en" ? "en-GB" : "sv-SE");
};
