import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLiveMoneyModel, quarterDayCount } from './liveMoneyModel.js';

test('calculates a report-based pace and preserves the report period', () => {
  const model = buildLiveMoneyModel({
    reports: [{ year: 2026, quarter: 'Q1', adjustedProfitForPeriod: 251.932, adjustedEarningsPerShare: 1.26 }],
    fxRate: 11,
  });

  assert.equal(model.quarterDays, 90);
  assert.equal(model.quarterProfitSEK, 2771252000);
  assert.equal(model.reportedQuarters, 1);
  assert.equal(model.eps, 1.26);
});

test('uses a safe FX fallback and ignores invalid reports', () => {
  const model = buildLiveMoneyModel({ reports: [{ year: 2026, quarter: 'Q2', adjustedProfitForPeriod: 100 }, { year: 2026, quarter: 'invalid' }], fxRate: 0 });
  assert.equal(model.fx, 11.02);
  assert.equal(model.latestReport.quarter, 'Q2');
  assert.equal(quarterDayCount(2026, 'Q2'), 91);
});
