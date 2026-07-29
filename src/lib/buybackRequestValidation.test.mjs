// Covers strict validation for buyback API query and synchronization inputs.

import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeComplianceRange,
  normalizeIsoDate,
  normalizeMfnUrl,
} from "./buybackRequestValidation.js";

test("compliance range only accepts supported Yahoo ranges", () => {
  assert.equal(normalizeComplianceRange("6mo"), "6mo");
  assert.equal(normalizeComplianceRange("max"), "1y");
});

test("ISO date validation rejects malformed and impossible dates", () => {
  assert.equal(normalizeIsoDate("2026-05-18", "2026-01-01"), "2026-05-18");
  assert.equal(normalizeIsoDate("2026-02-31", "2026-01-01"), "2026-01-01");
  assert.equal(normalizeIsoDate("../../etc/passwd", "2026-01-01"), "2026-01-01");
});

test("MFN URL validation only permits exact HTTPS hosts", () => {
  assert.equal(normalizeMfnUrl("https://mfn.se/a/evolution/release"), "https://mfn.se/a/evolution/release");
  assert.equal(normalizeMfnUrl("https://www.mfn.se/a/evolution"), "https://www.mfn.se/a/evolution");
  assert.equal(normalizeMfnUrl("http://mfn.se/a/evolution"), null);
  assert.equal(normalizeMfnUrl("https://evil-mfn.se/a/evolution"), null);
  assert.equal(normalizeMfnUrl("not-a-url"), null);
});
