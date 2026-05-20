// Regression tests for the fair value buyback assumptions.
import assert from 'node:assert/strict';
import test from 'node:test';
import { computeFairValueInsights } from './fairValueUtils.js';

const sampleReports = [
  { year: 2025, quarter: 'Q1', adjustedEarningsPerShare: 1, adjustedOperatingMargin: 59, operatingRevenues: 500 },
  { year: 2025, quarter: 'Q2', adjustedEarningsPerShare: 1, adjustedOperatingMargin: 59, operatingRevenues: 500 },
  { year: 2025, quarter: 'Q3', adjustedEarningsPerShare: 1, adjustedOperatingMargin: 59, operatingRevenues: 500 },
  { year: 2025, quarter: 'Q4', adjustedEarningsPerShare: 1, adjustedOperatingMargin: 59, operatingRevenues: 500 },
  { year: 2026, quarter: 'Q1', adjustedEarningsPerShare: 1, adjustedOperatingMargin: 59, operatingRevenues: 500 },
  { year: 2026, quarter: 'Q2', adjustedEarningsPerShare: 1, adjustedOperatingMargin: 59, operatingRevenues: 500 },
  { year: 2026, quarter: 'Q3', adjustedEarningsPerShare: 1, adjustedOperatingMargin: 59, operatingRevenues: 500 },
  { year: 2026, quarter: 'Q4', adjustedEarningsPerShare: 1, adjustedOperatingMargin: 59, operatingRevenues: 500 },
];

test('default buyback assumptions reflect the updated bull/fair/bear rates', () => {
  const result = computeFairValueInsights({
    reports: sampleReports,
    fxRate: 10,
    currentPriceSEK: 100,
  });

  assert.equal(result.bbInfo.base, 0.04);
  assert.equal(result.bbInfo.bull, 0.07);
  assert.equal(result.bbInfo.bear, 0.03);

  const bull = result.scenarios.find((scenario) => scenario.id === 'bull');
  const fair = result.scenarios.find((scenario) => scenario.id === 'fair');
  const bear = result.scenarios.find((scenario) => scenario.id === 'bear');

  assert.equal(bull.buybackRate, 0.07);
  assert.equal(fair.buybackRate, 0.04);
  assert.equal(bear.buybackRate, 0.03);
});
