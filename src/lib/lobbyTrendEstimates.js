// Fills explicitly approved trend gaps from adjacent measured days and preserves their provenance.

const APPROVED_ESTIMATE_DATES = ["2026-09-09", "2026-09-15", "2026-09-17"];

function adjacentDate(date, offset) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + offset);
  return value.toISOString().slice(0, 10);
}

export function applyApprovedLobbyTrendEstimates(overview, { days = 730 } = {}) {
  if (!overview) return overview;
  const rows = new Map((overview.dailyTotals ?? []).map(row => [row.date, row]));
  const quality = { ...overview.dailyQuality };
  const estimatedDates = new Set(overview.estimatedDates ?? []);
  let changed = false;
  for (const date of APPROVED_ESTIMATE_DATES) {
    if (quality[date]?.complete !== false) continue;
    if (rows.has(date)) continue;
    const sourceDates = [adjacentDate(date, -1), adjacentDate(date, 1)];
    const sources = sourceDates.map(sourceDate => rows.get(sourceDate));
    if (sources.some(row => !row || row.estimated || estimatedDates.has(row.date)
        || quality[row.date]?.complete !== true || !Number.isFinite(row.avgPlayers) || row.avgPlayers < 0)) continue;
    const avgPlayers = Math.round((sources[0].avgPlayers + sources[1].avgPlayers) * 50) / 100;
    rows.set(date, { date, avgPlayers, estimated: true });
    quality[date] = { ...quality[date], estimated: true, estimateMethod: "adjacent-day-average", sourceDates };
    estimatedDates.add(date);
    changed = true;
  }
  if (!changed) return overview;
  const dailyTotals = [...rows.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-days);
  return {
    ...overview, dailyTotals, dailyQuality: quality,
    estimatedDates: [...estimatedDates].sort(),
    averages: { ...overview.averages, days7: dailyTotals.slice(-7), days30: dailyTotals.slice(-30) },
  };
}

export function normalizeLobbyTrendRows(overview) {
  const estimates = new Set(overview?.estimatedDates ?? []);
  const partialDates = new Set(overview?.partialDates ?? []);
  return (Array.isArray(overview?.dailyTotals) ? overview.dailyTotals : [])
    .filter(row => row?.date && row.avgPlayers != null && Number.isFinite(Number(row.avgPlayers)))
    .map(row => {
      const estimated = row.estimated === true || estimates.has(row.date);
      const quality = overview?.dailyQuality?.[row.date];
      const observedCoveragePct = Number(row.observedCoveragePct ?? quality?.observedCoveragePct);
      return {
        date: row.date,
        avgPlayers: Number(row.avgPlayers),
        estimated,
        ...(!estimated && (row.partial === true || partialDates.has(row.date)) ? { partial: true } : null),
        ...(Number.isFinite(observedCoveragePct) ? { observedCoveragePct } : null),
      };
    });
}
