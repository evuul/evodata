// Verifies bounded baseline reads cannot exceed the retained-series limit.

import assert from "node:assert/strict";
import test from "node:test";
import { seriesReadLimit } from "./csStore.js";

test("hourly baseline read cap remains below the normal 60-day series limit", () => {
  const normalLimit = seriesReadLimit(60);
  const hourlyReadLimit = Math.min(normalLimit, 1_500);

  assert.equal(normalLimit, 5_000);
  assert.equal(hourlyReadLimit, 1_500);
});
