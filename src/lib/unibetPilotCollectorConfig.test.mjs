// Keeps the browser collector within the Vercel execution window on slow category pages.

import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_UNIBET_PILOT_TIMEOUT_MS } from "./unibetPilotCollector.js";

test("uses a per-category timeout below the serverless execution limit", () => {
  assert.equal(DEFAULT_UNIBET_PILOT_TIMEOUT_MS, 9_000);
  assert.ok(DEFAULT_UNIBET_PILOT_TIMEOUT_MS < 15_000);
});
