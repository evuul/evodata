// Covers recipient eligibility for the private Premium and Founder announcement.

import assert from "node:assert/strict";
import test from "node:test";
import { getPremiumFounderCampaignRecipients } from "./premiumFounderCampaign.js";

const NOW = Date.parse("2026-08-28T12:00:00.000Z");
const FOUNDERS = [{ id: "f1", accountEmail: "founder@example.com", qualified: true }];

test("campaign includes active Premium members and verified Founders once", () => {
  const recipients = getPremiumFounderCampaignRecipients([
    { email: "premium@example.com", firstName: "Premium", isSubscriber: true, subscriberUntil: "2026-09-01T00:00:00.000Z" },
    { email: "founder@example.com", firstName: "Founder", isSubscriber: false },
    { email: "expired@example.com", isSubscriber: true, subscriberUntil: "2026-08-01T00:00:00.000Z" },
    { email: "FOUNDER@example.com", firstName: "Duplicate", isSubscriber: true },
    { email: "admin@example.com", isAdmin: true },
  ], FOUNDERS, NOW);

  assert.deepEqual(recipients, [
    { email: "premium@example.com", firstName: "Premium" },
    { email: "founder@example.com", firstName: "Founder" },
  ]);
});
