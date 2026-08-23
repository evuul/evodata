// Guards the bounded Redis reads used by short lobby overview windows.

import assert from "node:assert/strict";
import test from "node:test";

import { seriesReadLimit } from "./csStore.js";

test("seriesReadLimit keeps short overview reads bounded", () => {
  assert.equal(seriesReadLimit(3, 5_000), 864);
  assert.equal(seriesReadLimit(1, 5_000), 500);
});

test("seriesReadLimit never requests more than retained samples", () => {
  assert.equal(seriesReadLimit(730, 5_000), 5_000);
});
