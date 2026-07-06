// Regression tests for buyback formatting helpers.
import assert from "node:assert/strict";
import test from "node:test";
import { buildNiceYAxisConfig, calculateEstimatedCompletion, formatBuybackAxisTick, formatSharesCompact } from "./utils.js";

test("formatSharesCompact renders shares in k with one decimal", () => {
  assert.equal(formatSharesCompact(535802), "535,8k");
  assert.equal(formatSharesCompact(538800), "538,8k");
});

test("formatBuybackAxisTick keeps half-million ticks distinct", () => {
  assert.equal(formatBuybackAxisTick(1_000_000), "1M");
  assert.equal(formatBuybackAxisTick(1_500_000), "1,5M");
  assert.equal(formatBuybackAxisTick(2_000_000), "2M");
  assert.equal(formatBuybackAxisTick(2_500_000), "2,5M");
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

test("buildNiceYAxisConfig uses round monthly ticks for million-scale buybacks", () => {
  const data = [
    { Datum: "2026-05", Antal_aktier: 320000 },
    { Datum: "2026-06", Antal_aktier: 3900000 },
    { Datum: "2026-07", Antal_aktier: 540000 },
  ];

  const config = buildNiceYAxisConfig(data, "Antal_aktier", "monthly");

  assert.deepEqual(config.domain, [0, 4_000_000]);
  assert.deepEqual(config.ticks, [0, 1_000_000, 2_000_000, 3_000_000, 4_000_000]);
});

test("buildNiceYAxisConfig uses round weekly ticks for mid-scale buybacks", () => {
  const data = [
    { Datum: "2026-V24", Antal_aktier: 42000 },
    { Datum: "2026-V25", Antal_aktier: 98000 },
    { Datum: "2026-V26", Antal_aktier: 176000 },
  ];

  const config = buildNiceYAxisConfig(data, "Antal_aktier", "weekly");

  assert.deepEqual(config.domain, [0, 180_000]);
  assert.deepEqual(config.ticks, [0, 20_000, 40_000, 60_000, 80_000, 100_000, 120_000, 140_000, 160_000, 180_000]);
});

test("buildNiceYAxisConfig uses round yearly ticks for large buybacks", () => {
  const data = [
    { Datum: "2024", Antal_aktier: 1_200_000 },
    { Datum: "2025", Antal_aktier: 2_700_000 },
    { Datum: "2026", Antal_aktier: 3_900_000 },
  ];

  const config = buildNiceYAxisConfig(data, "Antal_aktier", "yearly");

  assert.deepEqual(config.domain, [0, 4_000_000]);
  assert.deepEqual(config.ticks, [0, 1_000_000, 2_000_000, 3_000_000, 4_000_000]);
});
