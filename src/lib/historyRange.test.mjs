// Verifies history limits and prevents reads for dates before tracking began.

import assert from "node:assert/strict";
import test from "node:test";
import {
  getAvailableHistoryDays,
  limitHistoryReadDays,
} from "./historyRange.js";

test("counts the available tracking period inclusively", () => {
  assert.equal(getAvailableHistoryDays("2025-03-17"), 1);
  assert.equal(getAvailableHistoryDays("2025-03-18"), 2);
});

test("does not read dates before tracking began", () => {
  assert.equal(limitHistoryReadDays(730, "2025-04-15"), 30);
  assert.equal(limitHistoryReadDays(180, "2026-07-31"), 180);
});

test("caps extended reads at two years", () => {
  assert.equal(limitHistoryReadDays(999, "2030-01-01"), 730);
});
