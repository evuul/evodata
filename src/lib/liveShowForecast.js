// Forecast helpers for the gameshow revenue panel.

const uniquePeriods = (periods) => {
  const seen = new Set();
  return periods.filter((period) => {
    if (!period || seen.has(period)) return false;
    seen.add(period);
    return true;
  });
};

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];

export function periodToIndex(period) {
  if (!period || typeof period !== "string") return null;
  const [yearValue, quarter] = period.split(" ");
  const year = Number(yearValue);
  const quarterIndex = QUARTERS.indexOf(quarter);
  if (!Number.isFinite(year) || quarterIndex < 0) return null;
  return year * 4 + quarterIndex;
}

export function formatPeriodFromIndex(index) {
  if (!Number.isFinite(index)) return null;
  const quarterIndex = ((index % 4) + 4) % 4;
  const year = Math.floor(index / 4);
  return `${year} ${QUARTERS[quarterIndex]}`;
}

export function getLatestReportedPeriod(reports) {
  const ordered = (Array.isArray(reports) ? reports : [])
    .map((report) => {
      const period = `${report?.year} ${report?.quarter}`;
      const index = periodToIndex(period);
      return Number.isFinite(index) ? { period, index } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.index - a.index);

  return ordered[0]?.period ?? null;
}

export function resolveForecastPeriod({ currentPeriod, latestReportedPeriod } = {}) {
  const currentIndex = periodToIndex(currentPeriod);
  const latestReportedIndex = periodToIndex(latestReportedPeriod);
  if (!Number.isFinite(currentIndex)) return null;
  if (!Number.isFinite(latestReportedIndex)) return currentPeriod;

  const nextUnreportedIndex = latestReportedIndex + 1;
  if (nextUnreportedIndex <= currentIndex) {
    return formatPeriodFromIndex(nextUnreportedIndex);
  }

  return currentPeriod;
}

export function buildAllowedPlayerPeriods({
  currentPeriod,
  previousPeriod,
  twoBeforePeriod,
  forecastTargetPeriod,
} = {}) {
  return new Set(uniquePeriods([
    currentPeriod,
    previousPeriod,
    twoBeforePeriod,
    forecastTargetPeriod,
  ]));
}

export function buildQuarterlyModelCheckPeriods({
  basePeriods = [],
  historicalYear,
} = {}) {
  const year = Number(historicalYear);
  const historicalPeriods = Number.isInteger(year)
    ? QUARTERS.map((quarter) => `${year} ${quarter}`)
    : [];

  return uniquePeriods([
    ...(Array.isArray(basePeriods) ? basePeriods : []),
    ...historicalPeriods,
  ])
    .filter((period) => Number.isFinite(periodToIndex(period)))
    .sort((a, b) => periodToIndex(b) - periodToIndex(a));
}

export function applyQuarterSnapshots(
  quarterMap,
  snapshots,
  playerAdjustmentFactor
) {
  const merged = { ...(quarterMap || {}) };
  Object.entries(snapshots || {}).forEach(([period, snapshot]) => {
    const adjustedPlayers = Number(snapshot?.adjustedPlayers);
    const rawPlayers = Number(snapshot?.rawPlayers);
    const basePlayers = Number.isFinite(rawPlayers)
      ? rawPlayers
      : Number.isFinite(adjustedPlayers) && Number.isFinite(playerAdjustmentFactor) && playerAdjustmentFactor > 0
        ? Math.round(adjustedPlayers / playerAdjustmentFactor)
        : null;

    if (!Number.isFinite(basePlayers) || basePlayers <= 0) return;

    merged[period] = {
      ...merged[period],
      avgPlayers: Math.round(basePlayers),
      adjustedAvgPlayers: Number.isFinite(adjustedPlayers)
        ? Math.round(adjustedPlayers)
        : Math.round(basePlayers * playerAdjustmentFactor),
      days: snapshot?.days ?? merged[period]?.days ?? null,
      snapshot: true,
    };
  });
  return merged;
}

export function resolvePlayersForEstimate(info, playerAdjustmentFactor, options = {}) {
  const useAdjusted = options?.useAdjusted === true;
  const basePlayers = Math.round(Number(info?.avgPlayers) || 0);
  const adjustedPlayers = Number.isFinite(Number(info?.adjustedAvgPlayers))
    ? Math.round(Number(info.adjustedAvgPlayers))
    : Math.round(basePlayers * playerAdjustmentFactor);

  return {
    basePlayers,
    adjustedPlayers,
    playersForEstimate: useAdjusted ? adjustedPlayers : basePlayers,
  };
}

export function pickMedianBaseline(candidates, targetPeriod, fallbackRevenuePerPlayer) {
  const targetIndex = periodToIndex(targetPeriod);
  const usable = (Array.isArray(candidates) ? candidates : [])
    .filter((candidate) => (
      Number.isFinite(candidate?.index) &&
      Number.isFinite(candidate?.revenuePerPlayer) &&
      (!Number.isFinite(targetIndex) || candidate.index < targetIndex)
    ))
    .sort((a, b) => a.revenuePerPlayer - b.revenuePerPlayer);

  if (!usable.length) {
    return {
      period: null,
      revenuePerPlayer: fallbackRevenuePerPlayer,
      source: "fallback",
      sampleSize: 0,
      samplePeriods: [],
    };
  }

  const medianIndex = Math.floor(usable.length / 2);
  const median = usable[medianIndex];
  return {
    period: median.period,
    revenuePerPlayer: median.revenuePerPlayer,
    source: "median",
    sampleSize: usable.length,
    samplePeriods: usable.map((candidate) => candidate.period),
  };
}

export function pickRecentAverageBaseline(
  candidates,
  targetPeriod,
  fallbackRevenuePerPlayer,
  options = {}
) {
  const targetIndex = periodToIndex(targetPeriod);
  const requestedSampleSize = Number(options?.sampleSize);
  const sampleSize = Number.isFinite(requestedSampleSize)
    ? Math.max(1, Math.floor(requestedSampleSize))
    : 2;
  const usable = (Array.isArray(candidates) ? candidates : [])
    .filter((candidate) => (
      Number.isFinite(candidate?.index) &&
      Number.isFinite(candidate?.revenuePerPlayer) &&
      candidate.revenuePerPlayer > 0 &&
      (!Number.isFinite(targetIndex) || candidate.index < targetIndex)
    ))
    .sort((a, b) => b.index - a.index);

  if (!usable.length) {
    return {
      period: null,
      revenuePerPlayer: fallbackRevenuePerPlayer,
      source: "fallback",
      sampleSize: 0,
      samplePeriods: [],
    };
  }

  const sample = usable.slice(0, sampleSize);
  const revenuePerPlayer =
    sample.reduce((sum, candidate) => sum + candidate.revenuePerPlayer, 0) /
    sample.length;

  return {
    period: sample[0]?.period ?? null,
    revenuePerPlayer,
    source: "recent-average",
    sampleSize: sample.length,
    samplePeriods: sample.map((candidate) => candidate.period),
  };
}

export function buildRobustGrowthProjection(values, options = {}) {
  const fallbackGrowth = Number.isFinite(options?.fallbackGrowth)
    ? options.fallbackGrowth
    : 0;
  const minGrowth = Number.isFinite(options?.minGrowth)
    ? options.minGrowth
    : -10;
  const maxGrowth = Number.isFinite(options?.maxGrowth)
    ? options.maxGrowth
    : 10;
  const requestedLookback = Number(options?.lookback);
  const lookback = Number.isFinite(requestedLookback)
    ? Math.max(1, Math.floor(requestedLookback))
    : 4;
  const normalized = Array.isArray(values) ? values.map(Number) : [];
  const latestValue = normalized.at(-1);

  if (!Number.isFinite(latestValue) || latestValue <= 0) return null;

  const growthRates = [];
  for (let index = 1; index < normalized.length; index += 1) {
    const previous = normalized[index - 1];
    const current = normalized[index];
    if (
      !Number.isFinite(previous) ||
      previous <= 0 ||
      !Number.isFinite(current) ||
      current <= 0
    ) {
      continue;
    }
    growthRates.push(((current - previous) / previous) * 100);
  }

  const recentGrowthRates = growthRates.slice(-lookback).sort((a, b) => a - b);
  let baselineGrowth = fallbackGrowth;
  if (recentGrowthRates.length) {
    const middle = Math.floor(recentGrowthRates.length / 2);
    baselineGrowth =
      recentGrowthRates.length % 2 === 0
        ? (recentGrowthRates[middle - 1] + recentGrowthRates[middle]) / 2
        : recentGrowthRates[middle];
  }
  const projectedGrowth = Math.min(
    maxGrowth,
    Math.max(minGrowth, baselineGrowth),
  );

  return {
    latestValue,
    baselineGrowth,
    projectedGrowth,
    projectedValue: latestValue * (1 + projectedGrowth / 100),
    sampleSize: recentGrowthRates.length,
  };
}

export function calculateMedianCalibrationFactor(entries, options = {}) {
  const fallback = Number.isFinite(options?.fallback) ? options.fallback : 1;
  const minFactor = Number.isFinite(options?.minFactor) ? options.minFactor : 0.85;
  const maxFactor = Number.isFinite(options?.maxFactor) ? options.maxFactor : 1.2;
  const ratios = (Array.isArray(entries) ? entries : [])
    .map((entry) => {
      const actual = Number(entry?.actual);
      const estimated = Number(entry?.estimated);
      if (!Number.isFinite(actual) || !Number.isFinite(estimated) || estimated <= 0) return null;
      return actual / estimated;
    })
    .filter((ratio) => Number.isFinite(ratio) && ratio > 0)
    .sort((a, b) => a - b);

  if (!ratios.length) {
    return {
      factor: fallback,
      source: "fallback",
      sampleSize: 0,
    };
  }

  const rawFactor = ratios[Math.floor(ratios.length / 2)];
  return {
    factor: Math.min(maxFactor, Math.max(minFactor, rawFactor)),
    source: "median-actuals",
    sampleSize: ratios.length,
  };
}
