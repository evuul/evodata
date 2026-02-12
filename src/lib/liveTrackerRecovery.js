const truthy = (value) => ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());

const ymdToDateUtc = (ymd) => {
  const s = String(ymd || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00.000Z`);
  return Number.isFinite(d.getTime()) ? d : null;
};

const previousYmd = (ymd) => {
  const d = ymdToDateUtc(ymd);
  if (!d) return null;
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};

const average = (arr) => {
  if (!Array.isArray(arr) || !arr.length) return null;
  const sum = arr.reduce((acc, v) => acc + v, 0);
  return Number.isFinite(sum) ? sum / arr.length : null;
};

export function shouldUseLiveTrackerRecovery(env = process.env) {
  return truthy(env.LIVE_TRACKER_FIX_YESTERDAY);
}

export function resolveRecoveryDate(todayYmd, env = process.env) {
  const explicit = String(env.LIVE_TRACKER_FIX_DATE || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(explicit)) return explicit;
  return previousYmd(todayYmd);
}

// Mutates dailyAggregates map in-place for one date by replacing that day with a rolling pre-window average.
export function applyRecoveryForDate(dailyAggregates, fixYmd, options = {}) {
  if (!dailyAggregates || typeof dailyAggregates.forEach !== "function" || !fixYmd) {
    return { applied: false, fixYmd, affectedSlugs: 0 };
  }

  const lookbackDays = Number.isFinite(options.lookbackDays) ? Math.max(3, Math.floor(options.lookbackDays)) : 7;
  const minHistoryPoints = Number.isFinite(options.minHistoryPoints) ? Math.max(2, Math.floor(options.minHistoryPoints)) : 3;

  let affectedSlugs = 0;

  dailyAggregates.forEach((dateMap) => {
    if (!dateMap || typeof dateMap.get !== "function" || typeof dateMap.set !== "function") return;
    const original = dateMap.get(fixYmd);
    if (!original) return;

    const sorted = Array.from(dateMap.keys())
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(String(d || "")))
      .sort((a, b) => a.localeCompare(b));
    const idx = sorted.lastIndexOf(fixYmd);
    if (idx <= 0) return;

    const historyKeys = sorted.slice(Math.max(0, idx - lookbackDays), idx);
    const historyAverages = [];
    const historyCounts = [];

    for (const key of historyKeys) {
      const row = dateMap.get(key);
      const sum = Number(row?.sum);
      const count = Number(row?.count);
      if (!Number.isFinite(sum) || !Number.isFinite(count) || count <= 0) continue;
      historyAverages.push(sum / count);
      historyCounts.push(count);
    }

    if (historyAverages.length < minHistoryPoints) return;

    const replacementAvg = average(historyAverages);
    if (!Number.isFinite(replacementAvg) || replacementAvg <= 0) return;

    const originalCount = Number(original?.count);
    const replacementCount =
      Number.isFinite(originalCount) && originalCount > 0
        ? originalCount
        : Math.max(1, Math.round(average(historyCounts) || 1));

    const next = {
      ...original,
      sum: replacementAvg * replacementCount,
      count: replacementCount,
      // Keep max/latest fields untouched since this patch is for daily average correction.
    };

    dateMap.set(fixYmd, next);
    affectedSlugs += 1;
  });

  return { applied: affectedSlugs > 0, fixYmd, affectedSlugs };
}
