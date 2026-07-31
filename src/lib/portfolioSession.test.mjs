// Verifies safe portfolio hydration from authenticated session data.

import assert from "node:assert/strict";
import test from "node:test";

import { buildPortfolioSessionState } from "./portfolioSession.js";

test("builds Mina sidor state directly from the session user", () => {
  const state = buildPortfolioSessionState({
    email: "user@example.com",
    firstName: "Ada",
    lastName: "Lovelace",
    isAdmin: true,
    isSubscriber: true,
    isFounder: true,
    founderSince: "2026-07-31",
    notifications: {
      lobbyAthEmail: true,
      gameAthEmail: false,
      dailyAvgEmail: false,
    },
    profile: { shares: 10, avgCost: 500, lots: [] },
  });

  assert.deepEqual(state.identity, {
    email: "user@example.com",
    firstName: "Ada",
    lastName: "Lovelace",
  });
  assert.equal(state.profile.shares, 10);
  assert.equal(state.profile.avgCost, 500);
  assert.equal(state.isAdmin, true);
  assert.equal(state.isSubscriber, true);
  assert.equal(state.isFounder, true);
  assert.equal(state.founderSince, "2026-07-31");
  assert.deepEqual(state.notifications, {
    lobbyAthEmail: true,
    gameAthEmail: false,
    dailyAvgEmail: false,
  });
});

test("falls back to an empty safe state for missing session fields", () => {
  const state = buildPortfolioSessionState(null);

  assert.deepEqual(state.identity, { email: "", firstName: "", lastName: "" });
  assert.equal(state.profile.shares, 0);
  assert.equal(state.profile.avgCost, 0);
  assert.equal(state.isAdmin, false);
  assert.equal(state.isFounder, false);
  assert.equal(state.notifications.lobbyAthEmail, false);
  assert.equal(state.notifications.gameAthEmail, false);
});
