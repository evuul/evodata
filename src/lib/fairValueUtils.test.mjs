// Regression tests for the validated fair value engine and scenario invariants.

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  computeFairValueInsights,
  normalizeFairValueReports,
  resolveFairValueReports,
} from './fairValueUtils.js';

const sampleReports = Array.from({ length: 8 }, (_, index) => {
  const year = 2024 + Math.floor(index / 4);
  const quarter = `Q${(index % 4) + 1}`;
  return {
    year,
    quarter,
    adjustedEarningsPerShare: 1 + index * 0.02,
    adjustedOperatingMargin: 58 + index * 0.1,
    operatingRevenues: 500 + index * 4,
    ocfPerShare: 1.15 + index * 0.02,
    cashAndCashEquivalents: 900,
  };
});

const computeSample = (overrides = {}) =>
  computeFairValueInsights({
    reports: sampleReports,
    buybackData: [
      {
        Datum: '2025-02-03',
        Antal_aktier: 1_000_000,
        Transaktionsvärde: 100_000_000,
      },
    ],
    sharesData: [{ date: '2025-01-31', sharesOutstanding: 200 }],
    fxRate: 11,
    currentPriceSEK: 700,
    ...overrides,
  });

test('fair value engine returns ordered scenarios and independent valuation methods', () => {
  const result = computeSample();
  const fair = result.scenarios.find((scenario) => scenario.id === 'fair');
  const bull = result.scenarios.find((scenario) => scenario.id === 'bull');
  const bear = result.scenarios.find((scenario) => scenario.id === 'bear');

  assert.equal(result.dataQuality.status, 'good');
  assert.ok(Number.isFinite(fair.dcfValueSEK));
  assert.ok(Number.isFinite(fair.peValueSEK));
  assert.ok(bear.impliedPriceSEK < fair.impliedPriceSEK);
  assert.ok(fair.impliedPriceSEK < bull.impliedPriceSEK);
  assert.equal(result.valuationRange.low, bear.impliedPriceSEK);
  assert.equal(result.valuationRange.midpoint, fair.impliedPriceSEK);
  assert.equal(result.valuationRange.high, bull.impliedPriceSEK);
});

test('only observed buybacks after the share snapshot adjust EPS and cash', () => {
  const result = computeSample({
    buybackData: [
      { Datum: '2025-01-15', Antal_aktier: 5_000_000, Transaktionsvärde: 500_000_000 },
      { Datum: '2025-02-03', Antal_aktier: 1_000_000, Transaktionsvärde: 100_000_000 },
    ],
  });

  assert.equal(result.buybackInfo.reportedShares, 200_000_000);
  assert.equal(result.buybackInfo.currentShares, 199_000_000);
  assert.equal(result.buybackInfo.executedSharesAfterSnapshot, 1_000_000);
  assert.equal(result.buybackInfo.executedSpendAfterSnapshotSek, 100_000_000);
  assert.ok(result.buybackInfo.executedEpsBoost > 0);
});

test('missing fundamental values are rejected instead of being treated as zero', () => {
  const reports = sampleReports.map((report, index) =>
    index === 7 ? { ...report, adjustedEarningsPerShare: null } : report
  );
  const result = computeSample({ reports });

  assert.equal(result.scenarios.length, 0);
  assert.ok(result.dataQuality.warnings.includes('invalid_reports'));
  assert.ok(result.dataQuality.warnings.includes('not_enough_reports'));
});

test('duplicate quarters are deduplicated and reported as a quality warning', () => {
  const normalized = normalizeFairValueReports([
    ...sampleReports,
    { ...sampleReports[7], adjustedEarningsPerShare: 9 },
  ]);

  assert.equal(normalized.reports.length, 8);
  assert.equal(normalized.reports.at(-1).adjustedEarningsPerShare, 9);
  assert.ok(normalized.warnings.includes('duplicate_periods'));
});

test('gaps in the latest eight quarters block valuation', () => {
  const reports = sampleReports.filter((report) => !(report.year === 2024 && report.quarter === 'Q4'));
  reports.push({
    ...sampleReports.at(-1),
    year: 2026,
    quarter: 'Q1',
  });
  const result = computeSample({ reports });

  assert.equal(result.scenarios.length, 0);
  assert.ok(result.dataQuality.warnings.includes('non_consecutive_quarters'));
});

test('DCF sensitivity decreases with higher discount rates and rises with terminal growth', () => {
  const result = computeSample();
  const { values } = result.sensitivity;

  assert.ok(values[0][1] < values[1][1]);
  assert.ok(values[1][1] < values[2][1]);
  assert.ok(values[1][0] < values[1][1]);
  assert.ok(values[1][1] < values[1][2]);
});

test('resolveFairValueReports prefers live data and falls back safely', () => {
  const fallbackReports = [{ year: 2025, quarter: 'Q4' }];
  const liveReports = [{ year: 2026, quarter: 'Q1' }];

  assert.deepEqual(resolveFairValueReports(liveReports, fallbackReports), liveReports);
  assert.deepEqual(resolveFairValueReports([], fallbackReports), fallbackReports);
  assert.deepEqual(resolveFairValueReports(null, fallbackReports), fallbackReports);
  assert.deepEqual(resolveFairValueReports([], null), []);
});
