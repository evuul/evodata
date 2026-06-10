import assert from "node:assert/strict";
import test from "node:test";

import { normalizeShortSnapshotResponse } from "./shortSnapshotClient.js";

test("normalizeShortSnapshotResponse accepts numeric strings", () => {
  assert.deepEqual(normalizeShortSnapshotResponse({
    totalPercent: "5.5",
    observedDate: "2026-06-10",
  }), {
    totalPercent: 5.5,
    observedDate: "2026-06-10",
  });
});

test("normalizeShortSnapshotResponse returns null when totalPercent is invalid", () => {
  assert.equal(normalizeShortSnapshotResponse({ totalPercent: null }), null);
  assert.equal(normalizeShortSnapshotResponse({ totalPercent: "n/a" }), null);
});
