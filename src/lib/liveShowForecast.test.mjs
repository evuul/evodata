import assert from "node:assert/strict";
import test from "node:test";

import {
  applyQuarterSnapshots,
  buildAllowedPlayerPeriods,
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

test("buildAllowedPlayerPeriods includes the two-quarters-back comparison period", () => {
  const periods = buildAllowedPlayerPeriods({
    currentPeriod: "2026 Q3",
    previousPeriod: "2026 Q2",
    twoBeforePeriod: "2026 Q1",
    forecastTargetPeriod: "2026 Q2",
  });

  assert.deepEqual([...periods], ["2026 Q3", "2026 Q2", "2026 Q1"]);
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
