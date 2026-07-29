// Verifies lobby overview cache storage without coupling tests to route orchestration.

import assert from "node:assert/strict";
import test from "node:test";

import {
  OVERVIEW_TTL_MS,
  getOverviewCache,
  getOverviewSeriesCache,
  setOverviewCache,
  setOverviewSeriesCache,
} from "./lobbyOverviewCache.js";

test("stores overview payloads with metadata and a bounded expiration", () => {
  const key = `test-overview-${Date.now()}`;
  setOverviewCache(key, { ok: true }, "etag", { source: "test" });
  const cached = getOverviewCache(key);

  assert.deepEqual(cached.data, { ok: true });
  assert.equal(cached.etag, "etag");
  assert.equal(cached.meta.source, "test");
  assert.ok(cached.exp > Date.now());
  assert.ok(OVERVIEW_TTL_MS > 0);
});

test("keeps per-range series entries separate", () => {
  const slug = `test-series-${Date.now()}`;
  setOverviewSeriesCache(slug, 7, [{ value: 7 }]);
  setOverviewSeriesCache(slug, 30, [{ value: 30 }]);

  assert.deepEqual(getOverviewSeriesCache(slug, 7), [{ value: 7 }]);
  assert.deepEqual(getOverviewSeriesCache(slug, 30), [{ value: 30 }]);
});
