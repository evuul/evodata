// Verifies that public information pages never start dashboard polling.

import test from "node:test";
import assert from "node:assert/strict";
import { shouldEnableAuthenticatedLiveData, shouldRestoreAuthSession } from "./providerActivity.js";

test("enables live providers only on dashboard routes", () => {
  assert.equal(shouldEnableAuthenticatedLiveData("/"), true);
  assert.equal(shouldEnableAuthenticatedLiveData("/mina-sidor"), true);
  assert.equal(shouldEnableAuthenticatedLiveData("/mina-sidor/settings"), true);
});

test("keeps public and authentication pages free from dashboard polling", () => {
  assert.equal(shouldEnableAuthenticatedLiveData("/founders"), false);
  assert.equal(shouldEnableAuthenticatedLiveData("/disclaimer"), false);
  assert.equal(shouldEnableAuthenticatedLiveData("/login"), false);
  assert.equal(shouldEnableAuthenticatedLiveData(null), false);
});

test("skips session restoration only on standalone public information pages", () => {
  assert.equal(shouldRestoreAuthSession("/founders"), false);
  assert.equal(shouldRestoreAuthSession("/disclaimer"), false);
  assert.equal(shouldRestoreAuthSession("/"), true);
  assert.equal(shouldRestoreAuthSession("/login"), true);
});
