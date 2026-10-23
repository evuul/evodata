// Compares documented forecasts with reported revenue without recalculating old estimates.

const positiveNumber = (value) => typeof value === "number" && Number.isFinite(value) && value > 0;

export function compareForecastMetric(estimated, actual) {
  if (!positiveNumber(estimated) || !positiveNumber(actual)) return null;
  const difference = estimated - actual;
  return {
    estimated,
    actual,
    difference,
    errorPercent: (difference / actual) * 100,
    outcomeVsEstimatePercent: ((actual - estimated) / estimated) * 100,
  };
}

export function buildRevenueForecastOutcomes(history, reports) {
  if (!Array.isArray(history) || !Array.isArray(reports)) return [];
  return history.flatMap((snapshot) => {
    const report = reports.find((row) => row && `${row.year} ${row.quarter}` === snapshot?.period);
    if (!report) return [];
    const total = compareForecastMetric(snapshot.total, report.operatingRevenues);
    const live = compareForecastMetric(snapshot.live, report.liveCasino);
    const rng = compareForecastMetric(snapshot.rng, report.rng);
    if (!total || !live || !rng) return [];
    const low = snapshot.range?.low;
    const high = snapshot.range?.high;
    const withinRange = positiveNumber(low) && positiveNumber(high) && low <= high
      ? total.actual >= low && total.actual <= high
      : null;
    return [{ ...snapshot, total, live, rng, withinRange }];
  });
}
