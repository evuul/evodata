// Regression tests for financial overview chart scales and time ranges.

import assert from "node:assert/strict";
import test from "node:test";
import {
  REGION_OPTIONS,
  buildAnnualFinancialSeries,
  buildFinancialXAxisTicks,
  buildGeoAnnualSeries,
  buildNiceAxisScale,
  buildProductMixAnnualSeries,
  buildRegulatedAnnualSeries,
  filterFinancialSeriesByRange,
  formatFinancialXAxisTick,
} from "./financialOverviewCard.js";

const quarterlySeries = Array.from({ length: 24 }, (_, index) => {
  const year = 2020 + Math.floor(index / 4);
  const quarter = `Q${(index % 4) + 1}`;
  return {
    year,
    quarter,
    period: `${quarter} ${year}`,
    xLabel: `${quarter}-${String(year).slice(-2)}`,
    revenue: 300 + index * 10,
  };
});

test("buildNiceAxisScale creates readable revenue ticks with a zero baseline", () => {
  assert.deepEqual(buildNiceAxisScale([15.4, 513], { includeZero: true }), {
    domain: [0, 600],
    ticks: [0, 100, 200, 300, 400, 500, 600],
  });
});

test("buildNiceAxisScale creates a focused non-zero scale for recent values", () => {
  assert.deepEqual(buildNiceAxisScale([438.6, 524.3], { targetIntervals: 5 }), {
    domain: [420, 540],
    ticks: [420, 440, 460, 480, 500, 520, 540],
  });
});

test("filterFinancialSeriesByRange keeps the requested number of quarterly periods", () => {
  assert.equal(filterFinancialSeriesByRange(quarterlySeries, "3y", "quarterly").length, 12);
  assert.equal(filterFinancialSeriesByRange(quarterlySeries, "5y", "quarterly").length, 20);
  assert.equal(filterFinancialSeriesByRange(quarterlySeries, "max", "quarterly").length, 24);
});

test("buildFinancialXAxisTicks uses annual anchors and always includes the latest period", () => {
  const ticks = buildFinancialXAxisTicks(quarterlySeries.slice(-20), "quarterly", 8);

  assert.deepEqual(ticks, ["Q1-21", "Q1-22", "Q1-23", "Q1-24", "Q1-25", "Q4-25"]);
  assert.equal(formatFinancialXAxisTick("Q1-24", quarterlySeries, "quarterly"), "2024");
  assert.equal(formatFinancialXAxisTick("Q4-25", quarterlySeries, "quarterly"), "2025");
});

test("annual financial views exclude incomplete reporting years", () => {
  const completeYear = quarterlySeries.slice(-8, -4);
  const partialYear = quarterlySeries.slice(-4, -3);
  const mixedSeries = [...completeYear, ...partialYear];
  const annualFinancial = buildAnnualFinancialSeries(mixedSeries);
  const annualGeo = buildGeoAnnualSeries(
    mixedSeries.map((row) => ({
      ...row,
      europe: 100,
      asia: 80,
      northAmerica: 50,
      latAm: 30,
      other: 20,
      total: 280,
    })),
    REGION_OPTIONS
  );
  const annualProductMix = buildProductMixAnnualSeries(
    mixedSeries.map((row) => ({ ...row, liveCasino: 220, rng: 60, total: 280 }))
  );
  const annualRegulated = buildRegulatedAnnualSeries(
    mixedSeries.map((row) => ({
      year: row.year,
      quarter: row.quarter,
      operatingRevenues: row.revenue,
      regulatedMarket: 50,
    }))
  );

  assert.deepEqual(annualFinancial.map((row) => row.year), [2024]);
  assert.deepEqual(annualGeo.map((row) => row.year), [2024]);
  assert.deepEqual(annualProductMix.map((row) => row.year), [2024]);
  assert.deepEqual(annualRegulated.map((row) => row.year), [2024]);
});
