// Verifies the stable financial reports API contract and source metadata.

import assert from "node:assert/strict";
import test from "node:test";

import { buildFinancialReportsPayload } from "./financialReportsResponse.js";

test("preserves report data and attaches source metadata", () => {
  const payload = buildFinancialReportsPayload(
    { financialReports: [{ period: "2026 Q2" }] },
    { source: "remote", servedAt: "2026-07-29T10:00:00.000Z" }
  );

  assert.deepEqual(payload.financialReports, [{ period: "2026 Q2" }]);
  assert.deepEqual(payload._meta, {
    source: "remote",
    fallback: false,
    servedAt: "2026-07-29T10:00:00.000Z",
  });
});

test("rejects malformed financial report payloads", () => {
  assert.throws(
    () => buildFinancialReportsPayload({ financialReports: null }, { source: "remote" }),
    /Invalid financial reports payload/
  );
});
