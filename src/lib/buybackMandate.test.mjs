// Regression tests for observed buyback execution and mandate metadata.

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  computeBuybackMandateAssumptions,
  DEFAULT_BUYBACK_MANDATE_CASH_EUR,
  deriveCurrentOutstandingShares,
  summarizeBuybackExecution,
} from './buybackMandate.js';

test('buyback summary only reduces shares for executions after the latest snapshot', () => {
  const result = summarizeBuybackExecution({
    fxRate: 10,
    cashSnapshotDate: '2026-03-31',
    sharesData: [{ date: '2026-04-30', sharesOutstanding: 200 }],
    buybackData: [
      { Datum: '2026-04-29', Antal_aktier: 2_000_000, Transaktionsvärde: 200_000_000 },
      { Datum: '2026-05-19', Antal_aktier: 1_000_000, Transaktionsvärde: 100_000_000 },
    ],
  });

  assert.equal(result.reportedShares, 200_000_000);
  assert.equal(result.currentShares, 199_000_000);
  assert.equal(result.executedSharesAfterSnapshot, 1_000_000);
  assert.equal(result.executedSpendAfterSnapshotSek, 100_000_000);
  assert.equal(result.executedSpendAfterCashSnapshotSek, 300_000_000);
  assert.ok(Math.abs(result.executedEpsBoost - (200 / 199 - 1)) < 0.000001);
});

test('duplicate transaction snapshots are counted once', () => {
  const row = { Datum: '2026-05-19', Antal_aktier: 1_000_000, Transaktionsvärde: 100_000_000 };
  const result = summarizeBuybackExecution({
    fxRate: 10,
    sharesData: [{ date: '2026-04-30', sharesOutstanding: 200 }],
    buybackData: [row, { ...row }],
  });

  assert.equal(result.validRowCount, 1);
  assert.equal(result.executedSharesAfterSnapshot, 1_000_000);
});

test('counts a verified early share disclosure without inventing transaction value', () => {
  const result = summarizeBuybackExecution({
    fxRate: 10,
    sharesData: [{ date: '2026-04-30', sharesOutstanding: 200 }],
    buybackData: [
      { Datum: '2026-08-03', Antal_aktier: 207_007, reportedEarly: true },
    ],
  });

  assert.equal(result.validRowCount, 1);
  assert.equal(result.executedSharesAfterSnapshot, 207_007);
  assert.equal(result.executedSpendAfterSnapshotSek, 0);
});

test('derives current outstanding shares from a reported share snapshot and early disclosure', () => {
  const result = deriveCurrentOutstandingShares({
    sharesData: [{ date: '2026-06-30', sharesOutstanding: 194.085085 }],
    buybackData: [
      { Datum: '2026-08-03', Antal_aktier: 207_007, reportedEarly: true },
    ],
  });

  assert.deepEqual(result, {
    shares: 193_878_078,
    reportedSnapshotDate: '2026-06-30',
    asOfDate: '2026-08-03',
    includesEarlyDisclosure: true,
  });
});

test('mandate metadata separates observed execution from remaining authorization', () => {
  const result = computeBuybackMandateAssumptions({
    mandateCashEur: DEFAULT_BUYBACK_MANDATE_CASH_EUR,
    currentPriceSEK: 100,
    fxRate: 10,
    sharesData: [{ date: '2026-04-30', sharesOutstanding: 200 }],
    buybackData: [
      { Datum: '2026-05-19', Antal_aktier: 1_000_000, Transaktionsvärde: 100_000_000 },
    ],
  });

  assert.equal(result.mandateSek, 20_000_000_000);
  assert.equal(result.remainingMandateSek, 19_900_000_000);
  assert.equal(result.marketCapSek, 19_900_000_000);
  assert.ok(result.mandateYield > 1);
  assert.equal(result.executedShareReduction, 0.005);
  assert.equal(result.mandateStartDate, "2026-05-18");
  assert.equal(result.executionStartDate, "2026-05-19");
});

test('invalid share and buyback inputs fail safely without inventing execution', () => {
  const result = summarizeBuybackExecution({
    fxRate: 10,
    sharesData: [{ date: 'invalid', sharesOutstanding: 200 }],
    buybackData: [{ Datum: '2026-99-99', Antal_aktier: 1_000_000, Transaktionsvärde: 1 }],
  });

  assert.equal(result.reportedShares, null);
  assert.equal(result.currentShares, null);
  assert.equal(result.validRowCount, 0);
  assert.equal(result.executedSharesAfterSnapshot, 0);
});
