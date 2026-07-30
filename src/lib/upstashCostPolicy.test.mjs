// Verifies the refresh gates used to avoid unnecessary Upstash commands.

import test from "node:test";
import assert from "node:assert/strict";

import {
  shouldRunScheduledAggregation,
  shouldSkipMaterializedRefresh,
} from "./upstashCostPolicy.js";

test("scheduled aggregation runs only for schedule, preview, or force", () => {
  assert.equal(shouldRunScheduledAggregation({ scheduled: false, dryRun: false, force: false }), false);
  assert.equal(shouldRunScheduledAggregation({ scheduled: true, dryRun: false, force: false }), true);
  assert.equal(shouldRunScheduledAggregation({ scheduled: false, dryRun: true, force: false }), true);
  assert.equal(shouldRunScheduledAggregation({ scheduled: false, dryRun: false, force: true }), true);
});

test("materialized refresh skips only inside the configured interval", () => {
  const materializedAt = "2026-07-30T10:00:00.000Z";
  const now = Date.parse("2026-07-30T10:10:00.000Z");
  assert.equal(shouldSkipMaterializedRefresh({ materializedAt, now, minIntervalMs: 20 * 60 * 1000 }), true);
  assert.equal(shouldSkipMaterializedRefresh({ materializedAt, now, minIntervalMs: 5 * 60 * 1000 }), false);
  assert.equal(shouldSkipMaterializedRefresh({ materializedAt: "invalid", now, minIntervalMs: 20 * 60 * 1000 }), false);
});
