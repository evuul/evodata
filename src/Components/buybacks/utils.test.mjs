// Regression tests for buyback formatting helpers.
import assert from "node:assert/strict";
import test from "node:test";
import { calculateEstimatedCompletion, formatSharesCompact } from "./utils.js";

test("formatSharesCompact renders shares in k with one decimal", () => {
  assert.equal(formatSharesCompact(535802), "535,8k");
  assert.equal(formatSharesCompact(538800), "538,8k");
});

test("calculateEstimatedCompletion returns a stable completion date from a fixed reference day", () => {
  const transactions = [
    { Datum: "2026-05-19", Antal_aktier: 100, Transaktionsvärde: 10000 },
    { Datum: "2026-05-20", Antal_aktier: 100, Transaktionsvärde: 10000 },
  ];

  const result = calculateEstimatedCompletion(20000, transactions, new Date("2026-05-22T12:00:00.000Z"));

  assert.ok(result);
  assert.equal(result.daysToCompletion, 2);
  assert.equal(result.estimatedCompletionDate, "26 maj 2026");
});
