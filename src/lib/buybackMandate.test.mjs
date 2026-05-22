// Regression tests for the shared EUR 2bn buyback mandate helper.
import assert from "node:assert/strict";
import test from "node:test";
import { computeBuybackMandateAssumptions, DEFAULT_BUYBACK_MANDATE_CASH_EUR } from "./buybackMandate.js";

test("buyback mandate helper computes yield and scenario rates from market cap", () => {
  const result = computeBuybackMandateAssumptions({
    mandateCashEur: DEFAULT_BUYBACK_MANDATE_CASH_EUR,
    currentPriceSEK: 100,
    fxRate: 1,
    sharesData: [{ date: "2026-04-30", sharesOutstanding: 200 }],
  });

  assert.ok(result);
  assert.equal(result.mandateSek, 2_000_000_000);
  assert.equal(result.sharesOutstanding, 200_000_000);
  assert.ok(Math.abs(result.buybackYield - 0.1) < 0.0001);
  assert.ok(Math.abs(result.base - 0.1) < 0.0001);
  assert.ok(Math.abs(result.bull - 0.12) < 0.0001);
  assert.ok(Math.abs(result.bear - 0.08) < 0.0001);
});
