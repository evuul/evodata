// Checks account isolation and bounded hourly refreshes, including failures and midnight.

import assert from "node:assert/strict";
import test from "node:test";
import { shouldReuseHourlyRequest } from "./hourlyLobbyClient.js";

const now = Date.parse("2026-09-06T10:00:00Z");
test("reuses the same account's baseline for an hour and never across account changes", () => {
  const previous = { accessKey: "one", at: now };
  assert.equal(shouldReuseHourlyRequest(previous, "one", now + 3599000), true);
  assert.equal(shouldReuseHourlyRequest(previous, "one", now + 3600000), false);
  assert.equal(shouldReuseHourlyRequest(previous, "two", now), false);
  assert.equal(shouldReuseHourlyRequest(previous, null, now), false);
});
test("retries failures after five minutes and refreshes across Stockholm midnight", () => {
  const failed = { accessKey: "one", at: now, failed: true };
  assert.equal(shouldReuseHourlyRequest(failed, "one", now + 60000), true);
  assert.equal(shouldReuseHourlyRequest(failed, "one", now + 300000), false);
  assert.equal(shouldReuseHourlyRequest({ accessKey: "one", at: Date.parse("2026-09-06T21:59:00Z") }, "one", Date.parse("2026-09-06T22:00:00Z")), false);
});
