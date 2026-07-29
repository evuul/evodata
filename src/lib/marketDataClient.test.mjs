// Verifies bounded and parameter-specific market data request URLs.

import assert from "node:assert/strict";
import test from "node:test";

import {
  buildShortActivityUrl,
  buildShortSnapshotUrl,
  loadMarketResource,
  normalizeShortActivityDays,
} from "./marketDataClient.js";

test("normalizes short activity intervals to the server contract", () => {
  assert.equal(normalizeShortActivityDays("30.9"), 30);
  assert.equal(normalizeShortActivityDays(1), 7);
  assert.equal(normalizeShortActivityDays(999), 365);
  assert.equal(normalizeShortActivityDays("invalid"), 45);
});

test("builds a distinct URL for every normalized activity interval", () => {
  assert.equal(buildShortActivityUrl(30), "/api/short/activity?days=30");
  assert.equal(buildShortActivityUrl(365), "/api/short/activity?days=365");
  assert.notEqual(buildShortActivityUrl(30), buildShortActivityUrl(365));
});

test("requires and safely encodes the issuer LEI", () => {
  assert.equal(
    buildShortSnapshotUrl("549300SUH6ZR1RF6TA88"),
    "/api/short?lei=549300SUH6ZR1RF6TA88"
  );
  assert.throws(() => buildShortSnapshotUrl(""), /LEI is required/);
});

test("returns stale market data when a refresh fails", async () => {
  const resource = {
    refresh: async () => { throw new Error("offline"); },
    load: async () => { throw new Error("offline"); },
    getSnapshot: () => ({ data: { value: "cached" } }),
  };

  assert.deepEqual(
    await loadMarketResource(resource, { force: true }),
    { value: "cached" }
  );
});

test("propagates market data errors when no stale value exists", async () => {
  const resource = {
    refresh: async () => { throw new Error("offline"); },
    load: async () => { throw new Error("offline"); },
    getSnapshot: () => ({ data: null }),
  };

  await assert.rejects(loadMarketResource(resource), /offline/);
});
