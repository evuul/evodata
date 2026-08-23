// Completes known partial tracking days with a conservative per-game historical estimate.

const DAY_MS = 24 * 60 * 60 * 1000;

export const PARTIAL_DAY_ESTIMATE_DATES = new Set(["2026-08-22"]);

const round = (value) => Math.round(value * 100) / 100;

const average = (values) => {
  const valid = values.filter((value) => Number.isFinite(value) && value >= 0);
  if (!valid.length) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
};

function historicalAverage(dateMap, date, lookbackDays) {
  if (!dateMap || typeof dateMap.entries !== "function") return null;
  return average(
    Array.from(dateMap.entries())
      .filter(([candidate]) => String(candidate) < date)
      .sort(([left], [right]) => String(right).localeCompare(String(left)))
      .slice(0, lookbackDays)
      .map(([, entry]) => {
        const sum = Number(entry?.sum);
        const count = Number(entry?.count);
        return Number.isFinite(sum) && Number.isFinite(count) && count > 0 ? sum / count : null;
      })
  );
}

// Estimates only configured incident dates. Actual observations retain their proportional weight.
export function estimatePartialDayAverages({ perSlugData, dailyAggregates, weightedDailyBySlug, lookbackDays = 7 }) {
  const estimatedDates = new Set();
  const next = (Array.isArray(perSlugData) ? perSlugData : []).map((item) => {
    const slug = String(item?.slug || "");
    const daily = Array.isArray(item?.daily) ? item.daily : [];
    const weightedRows = weightedDailyBySlug instanceof Map ? weightedDailyBySlug.get(slug) ?? [] : [];
    const weightedByDate = new Map(weightedRows.map((row) => [row.date, row]));
    const historical = dailyAggregates instanceof Map ? dailyAggregates.get(slug) : null;

    const updatedDaily = daily.map((row) => {
      const date = String(row?.date || "");
      if (!PARTIAL_DAY_ESTIMATE_DATES.has(date)) return row;

      const observed = weightedByDate.get(date);
      const observedAverage = Number(observed?.avg);
      const coverageMs = Number(observed?.coverageMs);
      const coverageRatio = coverageMs / DAY_MS;
      const baseline = historicalAverage(historical, date, lookbackDays);
      if (
        !Number.isFinite(observedAverage) ||
        !Number.isFinite(baseline) ||
        coverageRatio < 0.25 ||
        coverageRatio >= 0.9
      ) {
        return row;
      }

      estimatedDates.add(date);
      return {
        ...row,
        avg: round(observedAverage * coverageRatio + baseline * (1 - coverageRatio)),
        estimated: true,
        observedCoveragePct: round(coverageRatio * 100),
        estimateMethod: "observed-plus-7-day-baseline",
      };
    });

    return { ...item, daily: updatedDaily };
  });

  return {
    perSlugData: next,
    estimatedDates: Array.from(estimatedDates).sort(),
  };
}
