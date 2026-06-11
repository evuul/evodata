// Regression tests for buyback daily capacity calculations.
import assert from "node:assert/strict";
import test from "node:test";
import { buildBuybackComplianceSeries, summarizeBuybackCompliance } from "./buybackCompliance.js";

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
