// Verifies Premium period and remaining-time calculations.

import assert from "node:assert/strict";
import test from "node:test";
import { buildPremiumStatus } from "./premiumStatus.js";

const NOW = Date.parse("2026-08-10T00:00:00.000Z");

test("derives six full months and remaining credit from a 200 SEK payment", () => {
  const status = buildPremiumStatus(
    {
      isSubscriber: true,
      subscriberPaymentSek: 200,
      subscriberStartedAt: "2026-08-10T00:00:00.000Z",
      subscriberUntil: "2027-02-06T00:00:00.000Z",
    },
    NOW
  );

  assert.equal(status.coveredMonths, 6);
  assert.equal(status.remainingCreditSek, 20);
  assert.equal(status.remainingDays, 180);
  assert.equal(status.active, true);
});

test("fails closed after the Premium period ends", () => {
  const status = buildPremiumStatus(
    { isSubscriber: true, subscriberUntil: "2026-08-09T00:00:00.000Z" },
    NOW
  );

  assert.equal(status.remainingDays, 0);
  assert.equal(status.active, false);
});
