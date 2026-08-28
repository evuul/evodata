// Selects the entitled audience for the one-time Hourly Baseline announcement.

import { isFounderEmail } from "./founderAccess.js";
import { isSubscriberActive } from "./subscriberAccess.js";

export const HOURLY_BASELINE_CAMPAIGN_ID = "hourly-baseline-launch-v1";

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

export function getPremiumFounderCampaignRecipients(users, founderRecords, now = Date.now()) {
  const recipientsByEmail = new Map();

  for (const user of Array.isArray(users) ? users : []) {
    const email = normalizeEmail(user?.email);
    if (!email || recipientsByEmail.has(email)) continue;
    if (!isSubscriberActive(user, now) && !isFounderEmail(email, founderRecords)) continue;

    recipientsByEmail.set(email, {
      email,
      firstName: String(user?.firstName || "").trim() || "there",
    });
  }

  return [...recipientsByEmail.values()];
}
