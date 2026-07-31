// Verifies forecast period selection, calibration, and uncertainty helpers.

import assert from "node:assert/strict";
import test from "node:test";

import {
  applyQuarterSnapshots,
  buildRobustGrowthProjection,
  buildAllowedPlayerPeriods,
  buildForecastAccuracySummary,
  buildForecastRange,
  buildQuarterlyModelCheckPeriods,
  calculateMedianCalibrationFactor,
  getLatestReportedPeriod,
  pickMedianBaseline,
  pickRecentAverageBaseline,
  resolveForecastPeriod,
  resolvePlayersForEstimate,
} from "./liveShowForecast.js";

test("applyQuarterSnapshots locks raw and adjusted player averages", () => {
  const result = applyQuarterSnapshots(
    {
      "2025 Q4": {
        avgPlayers: 64000,
        adjustedAvgPlayers: 70000,
        days: 92,
      },
    },
    {
      "2025 Q4": {
        rawPlayers: 56310,
        adjustedPlayers: 61941,
      },
    },
    1.1
  );

  assert.equal(result["2025 Q4"].avgPlayers, 56310);
  assert.equal(result["2025 Q4"].adjustedAvgPlayers, 61941);
  assert.equal(result["2025 Q4"].days, 92);
  assert.equal(result["2025 Q4"].snapshot, true);
});

test("applyQuarterSnapshots derives raw players from adjusted snapshots", () => {
  const result = applyQuarterSnapshots(
    {},
    {
      "2026 Q1": {
        adjustedPlayers: 66000,
      },
    },
    1.1
  );

  assert.equal(result["2026 Q1"].avgPlayers, 60000);
  assert.equal(result["2026 Q1"].adjustedAvgPlayers, 66000);
});

test("applyQuarterSnapshots freezes reported Q1 and Q2 player averages", () => {
  const result = applyQuarterSnapshots(
    {
      "2026 Q1": { avgPlayers: 61000, days: 60 },
      "2026 Q2": { avgPlayers: 62000, days: 45 },
    },
    {
      "2026 Q1": { rawPlayers: 61600, days: 86 },
      "2026 Q2": { rawPlayers: 60946, days: 89 },
    },
    1.1
  );

  assert.deepEqual(
    {
      q1Players: result["2026 Q1"].avgPlayers,
      q1Days: result["2026 Q1"].days,
      q2Players: result["2026 Q2"].avgPlayers,
      q2Days: result["2026 Q2"].days,
    },
    {
      q1Players: 61600,
      q1Days: 86,
      q2Players: 60946,
      q2Days: 89,
    }
  );
});

test("buildAllowedPlayerPeriods includes the two-quarters-back comparison period", () => {
  const periods = buildAllowedPlayerPeriods({
    currentPeriod: "2026 Q3",
    previousPeriod: "2026 Q2",
    twoBeforePeriod: "2026 Q1",
    forecastTargetPeriod: "2026 Q2",
  });

  assert.deepEqual([...periods], ["2026 Q3", "2026 Q2", "2026 Q1"]);
});

test("buildQuarterlyModelCheckPeriods includes every quarter from the comparison year", () => {
  const periods = buildQuarterlyModelCheckPeriods({
    basePeriods: ["2026 Q3", "2026 Q2", "2026 Q1", "2025 Q4"],
    historicalYear: 2025,
  });

  assert.deepEqual(periods, [
    "2026 Q3",
    "2026 Q2",
    "2026 Q1",
    "2025 Q4",
    "2025 Q3",
    "2025 Q2",
    "2025 Q1",
  ]);
});

test("resolvePlayersForEstimate defaults to base players", () => {
  const result = resolvePlayersForEstimate(
    {
      avgPlayers: 65769,
      adjustedAvgPlayers: 72346,
    },
    1.1
  );

  assert.equal(result.basePlayers, 65769);
  assert.equal(result.adjustedPlayers, 72346);
  assert.equal(result.playersForEstimate, 65769);
});

test("resolvePlayersForEstimate can explicitly use adjusted players", () => {
  const result = resolvePlayersForEstimate(
    {
      avgPlayers: 69664,
      adjustedAvgPlayers: 76630,
    },
    1.1,
    { useAdjusted: true }
  );

  assert.equal(result.basePlayers, 69664);
  assert.equal(result.adjustedPlayers, 76630);
  assert.equal(result.playersForEstimate, 76630);
});

test("getLatestReportedPeriod returns the newest reported quarter", () => {
  assert.equal(
    getLatestReportedPeriod([
      { year: 2025, quarter: "Q4" },
      { year: 2026, quarter: "Q1" },
      { year: 2025, quarter: "Q3" },
    ]),
    "2026 Q1"
  );
});

test("resolveForecastPeriod targets a closed unreported quarter before current live quarter", () => {
  assert.equal(
    resolveForecastPeriod({
      currentPeriod: "2026 Q3",
      latestReportedPeriod: "2026 Q1",
    }),
    "2026 Q2"
  );
});

test("resolveForecastPeriod uses current quarter when it is next to report", () => {
  assert.equal(
    resolveForecastPeriod({
      currentPeriod: "2026 Q3",
      latestReportedPeriod: "2026 Q2",
    }),
    "2026 Q3"
  );
});

test("pickMedianBaseline uses the median revenue per player before the target period", () => {
  const baseline = pickMedianBaseline(
    [
      { period: "2025 Q1", index: 8100, revenuePerPlayer: 448.7 / 69664 },
      { period: "2025 Q2", index: 8101, revenuePerPlayer: 438.1 / 65769 },
      { period: "2025 Q4", index: 8103, revenuePerPlayer: 438.6 / 56310 },
    ],
    "2026 Q2",
    423.7 / 65769
  );

  assert.equal(baseline.period, "2025 Q2");
  assert.equal(baseline.source, "median");
  assert.equal(baseline.sampleSize, 3);
  assert.equal(Math.round(66720 * baseline.revenuePerPlayer * 10) / 10, 444.4);
});

test("pickRecentAverageBaseline tracks the latest reported quarters", () => {
  const baseline = pickRecentAverageBaseline(
    [
      { period: "2025 Q1", index: 8100, revenuePerPlayer: 448.7 / 69664 },
      { period: "2025 Q4", index: 8103, revenuePerPlayer: 438.6 / 56310 },
      { period: "2026 Q1", index: 8104, revenuePerPlayer: 434.9 / 61600 },
    ],
    "2026 Q2",
    423.7 / 65769,
    { sampleSize: 2 }
  );

  assert.equal(baseline.period, "2026 Q1");
  assert.equal(baseline.source, "recent-average");
  assert.deepEqual(baseline.samplePeriods, ["2026 Q1", "2025 Q4"]);
  assert.equal(Math.round(60655 * baseline.revenuePerPlayer * 10) / 10, 450.3);
});

test("Q3 baseline uses the frozen Q2 and Q1 outcomes", () => {
  const baseline = pickRecentAverageBaseline(
    [
      { period: "2025 Q4", index: 8103, revenuePerPlayer: 438.6 / 56310 },
      { period: "2026 Q1", index: 8104, revenuePerPlayer: 434.883 / 61600 },
      { period: "2026 Q2", index: 8105, revenuePerPlayer: 437.282 / 60946 },
    ],
    "2026 Q3",
    423.7 / 65769,
    { sampleSize: 2 }
  );

  assert.deepEqual(baseline.samplePeriods, ["2026 Q2", "2026 Q1"]);
  assert.equal(Math.round(64543 * baseline.revenuePerPlayer * 10) / 10, 459.4);
});

test("buildRobustGrowthProjection uses the recent median and limits outliers", () => {
  const projection = buildRobustGrowthProjection(
    [70.564, 75.5, 75.7, 78.156, 80.509],
    {
      lookback: 4,
      fallbackGrowth: 1.5,
      minGrowth: 0,
      maxGrowth: 4,
    }
  );

  assert.equal(projection.sampleSize, 4);
  assert.equal(Math.round(projection.baselineGrowth * 100) / 100, 3.13);
  assert.equal(Math.round(projection.projectedGrowth * 100) / 100, 3.13);
  assert.equal(Math.round(projection.projectedValue * 10) / 10, 83);

  const capped = buildRobustGrowthProjection([10, 20, 40], {
    lookback: 2,
    maxGrowth: 4,
  });
  assert.equal(capped.projectedGrowth, 4);
});

test("calculateMedianCalibrationFactor learns the median actual-to-estimate bias", () => {
  const calibration = calculateMedianCalibrationFactor([
    { estimated: 407.9, actual: 448.7 },
    { estimated: 398.3, actual: 438.1 },
    { estimated: 414.0, actual: 438.6 },
  ]);

  assert.equal(calibration.source, "median-actuals");
  assert.equal(calibration.sampleSize, 3);
  assert.equal(Math.round(calibration.factor * 1000) / 1000, 1.1);
});

test("buildForecastRange keeps the exact point estimate and uses historical model error", () => {
  const range = buildForecastRange(500, [
    { estimated: 475, actual: 500 },
    { estimated: 515, actual: 500 },
    { estimated: 560, actual: 500 },
  ]);

  assert.deepEqual(range, {
    low: 475,
    high: 525,
    uncertaintyPercent: 5,
    sampleSize: 3,
    source: "historical-error",
  });
});

test("buildForecastRange uses a safe fallback and rejects invalid estimates", () => {
  assert.deepEqual(buildForecastRange(500, []), {
    low: 475,
    high: 525,
    uncertaintyPercent: 5,
    sampleSize: 0,
    source: "fallback",
  });
  assert.equal(buildForecastRange(null, []), null);
  assert.equal(buildForecastRange(-1, []), null);
});

test("buildForecastRange ignores rows without a real estimate", () => {
  assert.deepEqual(buildForecastRange(500, [
    { estimated: null, actual: 500 },
    { estimated: 475, actual: 500 },
  ]), {
    low: 475,
    high: 525,
    uncertaintyPercent: 5,
    sampleSize: 1,
    source: "historical-error",
  });
});

test("buildForecastAccuracySummary reports median error, bias, and interval hit rate", () => {
  const summary = buildForecastAccuracySummary([
    { estimated: 95, actual: 100 },
    { estimated: 102, actual: 100 },
    { estimated: 110, actual: 100 },
    { estimated: null, actual: 100 },
  ], { tolerancePercent: 5 });

  assert.equal(summary.sampleSize, 3);
  assert.equal(summary.medianAbsoluteErrorPercent, 5);
  assert.ok(Math.abs(summary.meanBiasPercent - 2.3333333333333335) < 1e-9);
  assert.equal(summary.withinRangeCount, 2);
  assert.ok(Math.abs(summary.withinRangePercent - 66.66666666666666) < 1e-9);
  assert.equal(summary.tolerancePercent, 5);
});

test("buildForecastAccuracySummary handles empty and even-sized samples", () => {
  assert.deepEqual(buildForecastAccuracySummary([]), {
    sampleSize: 0,
    medianAbsoluteErrorPercent: null,
    meanBiasPercent: null,
    withinRangeCount: 0,
    withinRangePercent: null,
    tolerancePercent: 5,
  });

  const summary = buildForecastAccuracySummary([
    { estimated: 99, actual: 100 },
    { estimated: 105, actual: 100 },
  ]);
  assert.equal(summary.medianAbsoluteErrorPercent, 3);
});
