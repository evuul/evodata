// Verifies permanent and time-limited subscriber access semantics.

import test from "node:test";
import assert from "node:assert/strict";
import { isSubscriberActive } from "./subscriberAccess.js";

const NOW = Date.parse("2026-08-05T12:00:00.000Z");

test("keeps legacy subscribers active without an expiry", () => {
  assert.equal(isSubscriberActive({ isSubscriber: true }, NOW), true);
});

test("keeps a subscriber active before the expiry", () => {
  assert.equal(
    isSubscriberActive({ isSubscriber: true, subscriberUntil: "2026-08-06T12:00:00.000Z" }, NOW),
    true
  );
});

test("removes access at and after the expiry", () => {
  const user = { isSubscriber: true, subscriberUntil: "2026-08-05T12:00:00.000Z" };
  assert.equal(isSubscriberActive(user, NOW), false);
  assert.equal(isSubscriberActive(user, NOW + 1), false);
});

test("fails closed for an invalid explicit expiry", () => {
  assert.equal(isSubscriberActive({ isSubscriber: true, subscriberUntil: "invalid" }, NOW), false);
});
