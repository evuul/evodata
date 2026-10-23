// Verifies immutable forecast comparisons, exact percentage bases and missing-data handling.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { revenueForecastHistory } from "../app/data/revenueForecastHistory.js";
import { buildRevenueForecastOutcomes, compareForecastMetric } from "./revenueForecastOutcome.js";

const reports = JSON.parse(readFileSync(new URL("../app/data/financialReports.json", import.meta.url))).financialReports;

test("Q3 documented estimates stay unchanged and reconcile with actual Live, RNG and total revenue", () => {
  const [outcome] = buildRevenueForecastOutcomes(revenueForecastHistory, reports);
  assert.equal(outcome.total.estimated, 564.8);
  assert.equal(outcome.live.estimated, 481.8);
  assert.equal(outcome.rng.estimated, 83);
  assert.equal(outcome.total.actual, 526.125);
  assert.equal(outcome.live.actual, 443.038);
  assert.equal(outcome.rng.actual, 83.087);
  assert.ok(Math.abs(outcome.total.difference - 38.675) < 1e-9);
  assert.equal(outcome.total.errorPercent.toFixed(2), "7.35");
  assert.equal(outcome.live.errorPercent.toFixed(2), "8.75");
  assert.equal(outcome.rng.errorPercent.toFixed(2), "-0.10");
  assert.equal(outcome.total.outcomeVsEstimatePercent.toFixed(2), "-6.85");
  assert.equal(outcome.withinRange, false);
  assert.equal(outcome.days, 88);
  assert.equal(revenueForecastHistory[0].total, 564.8);
});

test("missing reports or invalid metrics never become zero-percent forecast errors", () => {
  for (const actual of [0, -1, null, undefined, "", "526.125", NaN, Infinity]) {
    assert.equal(compareForecastMetric(500, actual), null);
    assert.equal(compareForecastMetric(actual, 500), null);
  }
  assert.deepEqual(buildRevenueForecastOutcomes(revenueForecastHistory, []), []);
  assert.deepEqual(buildRevenueForecastOutcomes(null, reports), []);
  assert.deepEqual(buildRevenueForecastOutcomes([null], reports), []);
  assert.deepEqual(buildRevenueForecastOutcomes(revenueForecastHistory, [{ year: 2026, quarter: "Q3", operatingRevenues: 526.125 }]), []);
});

test("report revisions update the comparison without changing the documented forecast", () => {
  const [outcome] = buildRevenueForecastOutcomes(revenueForecastHistory, [{ year: 2026, quarter: "Q3", operatingRevenues: 550, liveCasino: 460, rng: 90 }]);
  assert.equal(outcome.total.estimated, 564.8);
  assert.equal(outcome.total.actual, 550);
  assert.ok(compareForecastMetric(100, 110).errorPercent < 0);
});
