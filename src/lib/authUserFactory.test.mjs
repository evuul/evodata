// Regression tests for auth user defaults used during registration.
import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultUserProfile, createRegisteredUser } from "./authUserFactory.js";
import { normalizePortfolioProfile } from "./portfolioProfile.js";

test("createDefaultUserProfile includes all portfolio collections", () => {
  const profile = createDefaultUserProfile("2026-06-10T10:00:00.000Z");

  assert.deepEqual(profile, {
    shares: 0,
    avgCost: 0,
    acquisitionDate: null,
    lots: [],
    transactions: [],
    updatedAt: "2026-06-10T10:00:00.000Z",
  });
});

test("createRegisteredUser returns a normalizable new-account profile", () => {
  const user = createRegisteredUser({
    email: "new@example.com",
    firstName: "New",
    lastName: "User",
    passwordHash: "hash",
    isAdmin: false,
    now: "2026-06-10T10:00:00.000Z",
  });

  assert.equal(user.email, "new@example.com");
  assert.equal(user.isSubscriber, false);
  assert.deepEqual(user.notifications, { athEmail: false });
  assert.deepEqual(normalizePortfolioProfile(user.profile).transactions, []);
});
