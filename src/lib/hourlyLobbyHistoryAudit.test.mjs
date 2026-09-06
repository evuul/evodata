// Guards offline reconstruction against missing games, double-counted totals, and frozen readings.

import test from "node:test";
import assert from "node:assert/strict";
import { auditHourlyHistory } from "./hourlyLobbyHistoryAudit.js";

const now = Date.parse("2026-09-06T12:00:00Z");
const cohort = { id: "audit", gameIds: ["one", "two"] };
const ts = now - 86400000;

test("sums the fixed cohort only, requires matching times and preserves unknown source quality", () => {
  const result = auditHourlyHistory({
    one: [{ ts, value: 100 }, { ts, value: 100 }, { ts: ts + 600000, value: 120 }],
    two: [{ ts, value: 200 }],
    "cs:lobby-total:v1:samples": [{ ts, value: 300 }],
    "new-game": [{ ts, value: 100000 }],
  }, { now, cohort });
  assert.equal(result.observations.length, 1);
  assert.equal(result.observations[0].value, 300);
  assert.equal(result.observations[0].quality, "reconstructed");
  assert.equal(result.rawSamples, 4);
  assert.equal(result.matchedObservations, 1);
});

test("normalizes numeric strings without introducing false conflicts and rejects invalid timestamps", () => {
  const result = auditHourlyHistory({
    one: [{ ts, value: "100" }, { ts, value: 100 }, { ts: Infinity, value: 10 }],
    two: [{ ts, value: 200 }, { ts: ts + 1000, value: null }],
  }, { now, cohort });
  assert.equal(result.observations.length, 1);
  assert.equal(result.observations[0].value, 300);
});

test("rejects conflicting duplicate timestamps and prolonged identical runs", () => {
  const points = [0, 10, 20, 30].map((minute) => ({ ts: ts + minute * 60000, value: 100 }));
  assert.equal(auditHourlyHistory({ one: points, two: points }, { now, cohort }).observations.length, 0);
  assert.equal(auditHourlyHistory({ one: [{ ts, value: 100 }, { ts, value: 200 }], two: [{ ts, value: 100 }] }, { now, cohort }).observations.length, 0);
});
