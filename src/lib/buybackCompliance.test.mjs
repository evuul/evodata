// Regression tests for buyback daily capacity calculations.
import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBuybackComplianceForecast,
  buildBuybackComplianceSeries,
  summarizeBuybackCompliance,
} from "./buybackCompliance.js";

const makeVolumeByDate = () =>
  new Map(
    Array.from({ length: 25 }, (_, index) => {
      const day = String(index + 1).padStart(2, "0");
      return [`2026-05-${day}`, 1_000 + index * 10];
    })
  );

const makeRows = () => [
  { Datum: "2026-05-21", Antal_aktier: 125 },
];

test("buildBuybackComplianceSeries uses the previous 20 trading volumes and includes zero-buyback days", () => {
  const series = buildBuybackComplianceSeries(makeRows(), makeVolumeByDate(), { startDate: "2026-05-21" });

  assert.equal(series.length, 5);
  assert.deepEqual(
    series.map((row) => ({ date: row.date, actualShares: row.actualShares })),
    [
      { date: "2026-05-21", actualShares: 125 },
      { date: "2026-05-22", actualShares: 0 },
      { date: "2026-05-23", actualShares: 0 },
      { date: "2026-05-24", actualShares: 0 },
      { date: "2026-05-25", actualShares: 0 },
    ]
  );
  assert.equal(series[0].averageVolume20, 1_095);
  assert.equal(series[0].maxAllowedShares, 273);
  assert.equal(series[0].remainingCapacity, 148);
  assert.equal(series[0].utilizationPct, (125 / 273) * 100);
});

test("buildBuybackComplianceSeries does not double-count duplicate dates", () => {
  const rows = [
    { Datum: "2026-05-21", Antal_aktier: 125 },
    { Datum: "2026-05-21", Antal_aktier: 125 },
  ];
  const series = buildBuybackComplianceSeries(rows, makeVolumeByDate(), { startDate: "2026-05-21" });

  assert.equal(series[0].actualShares, 125);
});

test("summarizeBuybackCompliance returns latest and utilization metrics", () => {
  const series = [
    { actualShares: 90, maxAllowedShares: 100, utilizationPct: 90, nearLimit: true },
    { actualShares: 50, maxAllowedShares: 100, utilizationPct: 50, nearLimit: false },
  ];

  assert.deepEqual(summarizeBuybackCompliance(series), {
    latest: series[1],
    averageUtilizationPct: 70,
    maxUtilizationPct: 90,
    nearLimitDays: 1,
  });
});

test("buildBuybackComplianceForecast projects the next trading days from the latest volume baseline", () => {
  const volumeByDate = new Map([
    ["2026-05-18", 1_000],
    ["2026-05-19", 1_010],
    ["2026-05-20", 1_020],
    ["2026-05-21", 1_030],
    ["2026-05-22", 1_040],
    ["2026-05-25", 1_050],
    ["2026-05-26", 1_060],
    ["2026-05-27", 1_070],
    ["2026-05-28", 1_080],
    ["2026-05-29", 1_090],
    ["2026-06-01", 1_100],
    ["2026-06-02", 1_110],
    ["2026-06-03", 1_120],
    ["2026-06-04", 1_130],
    ["2026-06-05", 1_140],
    ["2026-06-08", 1_150],
    ["2026-06-09", 1_160],
    ["2026-06-10", 1_170],
    ["2026-06-11", 1_180],
    ["2026-06-12", 1_190],
  ]);

  const forecast = buildBuybackComplianceForecast(volumeByDate, { horizonTradingDays: 5 });

  assert.ok(forecast);
  assert.equal(forecast.rows.length, 5);
  assert.deepEqual(
    forecast.rows.map((row) => row.date),
    ["2026-06-15", "2026-06-16", "2026-06-17", "2026-06-18", "2026-06-22"]
  );
  assert.equal(forecast.summary.currentAverageVolume20, 1_095);
  assert.equal(forecast.summary.currentMaxAllowedShares, 273);
  assert.equal(forecast.rows[0].maxAllowedShares, 273);
  assert.equal(forecast.rows[1].maxAllowedShares, 275);
  assert.equal(forecast.summary.projectedTotalMaxShares, 1_385);
});
