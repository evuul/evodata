// Verifies bounded live top-win parameters and query-specific cache keys.

import assert from "node:assert/strict";
import test from "node:test";

import {
  buildLiveTop3CacheKey,
  normalizeLiveTop3Options,
} from "./liveTop3Request.js";

test("normalizes and bounds live top-win history options", () => {
  assert.deepEqual(
    normalizeLiveTop3Options({ historyDays: "999", historyPerDay: "4.9" }),
    { historyDays: 90, historyPerDay: 4 }
  );
  assert.deepEqual(
    normalizeLiveTop3Options({}, { historyDays: 30, historyPerDay: 3 }),
    { historyDays: 30, historyPerDay: 3 }
  );
});

test("uses a distinct cache key for each normalized history shape", () => {
  assert.equal(buildLiveTop3CacheKey({ historyDays: 7, historyPerDay: 6 }), "7:6");
  assert.equal(buildLiveTop3CacheKey({ historyDays: 30, historyPerDay: 3 }), "30:3");
  assert.notEqual(
    buildLiveTop3CacheKey({ historyDays: 7, historyPerDay: 6 }),
    buildLiveTop3CacheKey({ historyDays: 30, historyPerDay: 3 })
  );
});
