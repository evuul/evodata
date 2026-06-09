import test from "node:test";
import assert from "node:assert/strict";

import { FI_SHORT_SNAPSHOT_TTL_MS, isFreshShortSnapshot } from "./fiShortSnapshot.js";

test("short snapshot freshness uses a three hour ttl", () => {
  const now = Date.parse("2026-06-05T12:00:00Z");
  const fresh = { fetchedAt: new Date(now - FI_SHORT_SNAPSHOT_TTL_MS + 1000).toISOString() };
  const stale = { fetchedAt: new Date(now - FI_SHORT_SNAPSHOT_TTL_MS - 1000).toISOString() };

  assert.equal(isFreshShortSnapshot(fresh, now), true);
  assert.equal(isFreshShortSnapshot(stale, now), false);
});
