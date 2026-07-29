// Verifies deterministic dashboard data-status classification.

import assert from "node:assert/strict";
import test from "node:test";

import { buildDataStatus } from "./dataStatus.js";

const NOW = Date.parse("2026-07-29T12:00:00Z");

test("classifies recent live data as fresh", () => {
  const status = buildDataStatus({
    type: "live",
    source: "Lobby",
    observedAt: "2026-07-29T11:30:00Z",
    maxAgeMs: 60 * 60 * 1000,
    now: NOW,
  });

  assert.equal(status.type, "live");
  assert.equal(status.quality, "fresh");
  assert.equal(status.ageMs, 30 * 60 * 1000);
});

test("marks expired or explicit stale data as stale", () => {
  assert.equal(
    buildDataStatus({ observedAt: "2026-07-28T00:00:00Z", maxAgeMs: 60 * 60 * 1000, now: NOW }).quality,
    "stale"
  );
  assert.equal(buildDataStatus({ stale: true, now: NOW }).quality, "stale");
});

test("fallback takes precedence and invalid dates remain safe", () => {
  const status = buildDataStatus({
    type: "unknown",
    source: "  ",
    observedAt: "not-a-date",
    fallback: true,
    stale: true,
    now: NOW,
  });

  assert.deepEqual(status, {
    type: "reported",
    quality: "fallback",
    source: null,
    observedAt: null,
    observedLabel: null,
    ageMs: null,
  });
});
