// Ensures report disclosures keep their period, model type and fallback quality.

import test from "node:test";
import assert from "node:assert/strict";
import { buildReportDataStatus } from "./reportDataStatus.js";

const reports = { financialReports: [{ year: 2026, quarter: "Q2" }, { year: 2025, quarter: "Q4" }] };

test("uses the latest report period rather than the response serving time", () => {
  const status = buildReportDataStatus({ ...reports, _meta: { servedAt: "2026-10-21T12:00:00Z" } });
  assert.equal(status.observedLabel, "Q2 2026");
  assert.equal(status.observedAt, null);
  assert.equal(status.type, "reported");
  assert.equal(buildReportDataStatus(reports, { model: true }).type, "model");
});

test("preserves stale/fallback flags and avoids labelling missing reports", () => {
  assert.equal(buildReportDataStatus({ ...reports, _meta: { fallback: true } }).quality, "fallback");
  assert.equal(buildReportDataStatus({ ...reports, _meta: { stale: true } }).quality, "stale");
  assert.equal(buildReportDataStatus({ financialReports: [{ year: 2026, quarter: "Q5" }] }), null);
  assert.equal(buildReportDataStatus(null), null);
});
