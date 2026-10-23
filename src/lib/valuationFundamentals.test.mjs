// Verifies the report-to-equity cash-flow bridge and rejects inconsistent source data.

import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeValuationCashFlow, readValuationBalance, resolveFairValueReports, valuationSourceUrls } from './valuationFundamentals.js';

const report = {
  adjustedProfitForPeriod: 110, cashAndCashEquivalents: 200,
  valuationInputs: {
    operatingCashFlow: 120, capexIntangible: 10, capexTangible: 5,
    leaseRepayments: 3, interestReceived: 10, taxPaid: 5, taxExpense: 20,
    profitBeforeTax: 130, operatingProfit: 125, nonTaxableNonRecurringProfit: 30,
    netBorrowing: 0, restrictedCash: 10, netCurrentTaxLiabilities: 20,
    financialDebtExcludingLeases: 0,
  },
};

test('normalizes cash taxes, removes after-tax interest and strips a non-taxable gain', () => {
  const result = normalizeValuationCashFlow(report);
  assert.equal(result.coreOperatingProfit, 95);
  assert.equal(result.coreProfit, 72);
  assert.equal(result.normalizedOperatingCashFlow, 97);
  assert.equal(result.equityCashFlow, 79);
});

test('missing, impossible and inconsistent report inputs fail validation', () => {
  for (const override of [{ capexTangible: null }, { capexIntangible: -1 }, { taxExpense: 150 }, { profitBeforeTax: 140 }, { interestReceived: 1000 }]) {
    assert.equal(normalizeValuationCashFlow({ ...report, valuationInputs: { ...report.valuationInputs, ...override } }), null);
  }
  assert.equal(normalizeValuationCashFlow({ ...report, adjustedProfitForPeriod: null }), null);
  assert.equal(normalizeValuationCashFlow(null), null);
  assert.equal(readValuationBalance({ ...report, valuationInputs: { ...report.valuationInputs, restrictedCash: 201 } }), null);
});

test('external source links require HTTPS without embedded credentials and tolerate malformed responses', () => {
  const source = 'https://example.com/report.pdf';
  assert.deepEqual(valuationSourceUrls([{ valuationInputs: { sourceUrls: [source, source, 'javascript:alert(1)', 'http://example.com', 'https://user:secret@example.com', null] } }, { valuationInputs: { sourceUrls: 'invalid' } }]), [source]);
  assert.deepEqual(resolveFairValueReports([null], [report]), [null]);
});

test('bundled report PDFs are allowed without accepting external or traversing relative links', () => {
  const local = '/reports/evo-q3-2026-swe-2026-10-23-final.pdf';
  assert.deepEqual(valuationSourceUrls([{ valuationInputs: { sourceUrls: [local, '//example.com/report.pdf', '/reports/../private.pdf', '/reports/test.pdf?redirect=x', '/other/test.pdf', '/reports/test.html'] } }]), [local]);
});
