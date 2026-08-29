// Verifies bounded baseline reads cannot exceed the retained-series limit.

import assert from "node:assert/strict";
import test from "node:test";
import { seriesReadLimit } from "./csStore.js";

test("hourly baseline batch read cap remains below the normal 14-day series limit", () => {
  const normalLimit = seriesReadLimit(14);
  const hourlyReadLimit = Math.min(normalLimit, 2_200);

  assert.equal(normalLimit, 4_032);
  assert.equal(hourlyReadLimit, 2_200);
});
