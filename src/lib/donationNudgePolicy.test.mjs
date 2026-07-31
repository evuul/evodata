// Regression tests for donation prompt delay and dismissal frequency.

import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_DONATION_NUDGE_DELAY_MS,
  DONATION_NUDGE_TTL_MS,
  isDonationNudgeDismissalFresh,
} from "./donationNudgePolicy.js";

test("donation nudge waits before appearing and stays dismissed for fourteen days", () => {
  assert.equal(DEFAULT_DONATION_NUDGE_DELAY_MS, 30_000);
  assert.equal(DONATION_NUDGE_TTL_MS, 14 * 24 * 60 * 60 * 1000);

  const now = Date.UTC(2026, 6, 31, 12);
  assert.equal(isDonationNudgeDismissalFresh(now - DONATION_NUDGE_TTL_MS + 1, now), true);
  assert.equal(isDonationNudgeDismissalFresh(now - DONATION_NUDGE_TTL_MS, now), false);
});

test("donation nudge ignores malformed and future dismissal timestamps", () => {
  const now = Date.UTC(2026, 6, 31, 12);

  assert.equal(isDonationNudgeDismissalFresh("invalid", now), false);
  assert.equal(isDonationNudgeDismissalFresh(now + 1, now), false);
});
