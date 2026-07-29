// Applies controlled historical lobby corrections and recalculates trend metadata.

const MANUAL_DAILY_TOTAL_OVERRIDES = Object.freeze({
  "2026-02-11": 61972,
});
const ENABLE_MANUAL_DAILY_OVERRIDES = process.env.CS_ENABLE_MANUAL_DAILY_OVERRIDES === "1";
const ENABLE_RECENT_DAILY_BACKFILL = process.env.CS_ENABLE_RECENT_DAILY_BACKFILL === "1";
const RECENT_DAILY_BACKFILL_MAX_DAYS = (() => {
  const raw = Number(process.env.CS_RECENT_BACKFILL_MAX_DAYS);
  if (Number.isFinite(raw) && raw > 0) return Math.min(Math.round(raw), 14);
  return 7;
})();
const TARGETED_GAP_BACKFILL = Object.freeze({
  start: "2026-02-21",
  end: "2026-02-24",
  lookbackDays: 20,
});

export function applyDailyTotalOverrides(rows) {
  if (!Array.isArray(rows) || !rows.length) return [];
  if (!ENABLE_MANUAL_DAILY_OVERRIDES) return rows;
  return rows.map((row) => {
    const date = String(row?.date || "");
    const override = Number(MANUAL_DAILY_TOTAL_OVERRIDES[date]);
    if (!Number.isFinite(override) || override <= 0) return row;
    return { ...row, avgPlayers: override };
  });
}

function shiftYmd(ymd, offsetDays) {
  if (!ymd || !Number.isFinite(offsetDays)) return null;
  const [year, month, day] = String(ymd).split("-").map((part) => Number(part));
  if (![year, month, day].every((part) => Number.isFinite(part))) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + offsetDays);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function mean(values) {
  if (!Array.isArray(values) || !values.length) return null;
  const valid = values.map((value) => Number(value)).filter((value) => Number.isFinite(value));
  if (!valid.length) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function stdDev(values, average) {
  if (!Array.isArray(values) || values.length < 2 || !Number.isFinite(average)) return 0;
  const valid = values.map((value) => Number(value)).filter((value) => Number.isFinite(value));
  if (valid.length < 2) return 0;
  const variance = valid.reduce(
    (sum, value) => sum + (value - average) * (value - average),
    0
  ) / (valid.length - 1);
  return Math.sqrt(Math.max(0, variance));
}

function dateHash01(value) {
  const stringValue = String(value || "");
  let hash = 0;
  for (let index = 0; index < stringValue.length; index += 1) {
    hash = (hash * 31 + stringValue.charCodeAt(index)) >>> 0;
  }
  return (hash % 10000) / 10000;
}

const dateHashWithSalt01 = (salt, ymd) => dateHash01(`${String(salt || "")}:${String(ymd || "")}`);

function applyRecentDailyBackfill(rows, todayYmd, maxMissingDays = RECENT_DAILY_BACKFILL_MAX_DAYS) {
  if (!Array.isArray(rows) || !rows.length || !todayYmd) return rows || [];
  if (!ENABLE_RECENT_DAILY_BACKFILL || !Number.isFinite(maxMissingDays) || maxMissingDays <= 0) return rows;

  const sorted = [...rows].sort((a, b) => String(a?.date || "").localeCompare(String(b?.date || "")));
  const lastTargetYmd = shiftYmd(todayYmd, -1);
  if (!lastTargetYmd) return sorted;

  const lastRow = sorted[sorted.length - 1];
  const lastDate = String(lastRow?.date || "");
  const lastValue = Number(lastRow?.avgPlayers);
  if (!lastDate || !Number.isFinite(lastValue) || lastValue <= 0 || lastDate >= lastTargetYmd) return sorted;

  const recent30 = sorted.slice(-30).map((row) => Number(row?.avgPlayers)).filter((value) => Number.isFinite(value) && value > 0);
  const recent7 = sorted.slice(-7).map((row) => Number(row?.avgPlayers)).filter((value) => Number.isFinite(value) && value > 0);
  const avg30 = mean(recent30);
  const avg7 = mean(recent7);
  if (!Number.isFinite(avg30) || avg30 <= 0) return sorted;

  const volPct = clamp(stdDev(recent30, avg30) / avg30, 0.002, 0.012);
  const trendBiasPct = Number.isFinite(avg7) ? clamp((avg7 - avg30) / avg30, -0.03, 0.03) : 0;
  const rangeMin = avg30 * 0.94;
  const rangeMax = avg30 * 1.06;
  const backfilled = [];
  let cursor = lastDate;
  let previousValue = lastValue;

  for (let index = 0; index < maxMissingDays; index += 1) {
    const next = shiftYmd(cursor, 1);
    if (!next || next > lastTargetYmd) break;
    const noise = (dateHash01(next) - 0.5) * 2 * volPct;
    const drift = trendBiasPct * ((index + 1) / Math.max(1, maxMissingDays));
    const targetFromAverage = avg30 * (1 + noise + drift);
    const bounded = clamp(previousValue * 0.35 + targetFromAverage * 0.65, rangeMin, rangeMax);
    backfilled.push({ date: next, avgPlayers: Math.round(bounded * 100) / 100 });
    previousValue = bounded;
    cursor = next;
  }

  return backfilled.length ? [...sorted, ...backfilled] : sorted;
}

function applyTargetedGapBackfill(rows, todayYmd, salt = "") {
  if (!Array.isArray(rows) || !rows.length) return [];
  const { start, end, lookbackDays } = TARGETED_GAP_BACKFILL;
  if (!start || !end || (todayYmd && start >= todayYmd)) return rows;

  const sorted = [...rows].sort((a, b) => String(a?.date || "").localeCompare(String(b?.date || "")));
  const byDate = new Map(sorted.map((row) => [String(row?.date || ""), row]));
  const baseRows = sorted.filter((row) => {
    const date = String(row?.date || "");
    const value = Number(row?.avg ?? row?.avgPlayers);
    return date && date < start && Number.isFinite(value);
  });
  if (!baseRows.length) return sorted;

  const recentValues = baseRows.slice(-Math.max(1, lookbackDays))
    .map((row) => Number(row?.avg ?? row?.avgPlayers))
    .filter((value) => Number.isFinite(value) && value > 0);
  const avg20 = mean(recentValues);
  if (!Number.isFinite(avg20) || avg20 <= 0) return sorted;

  const avg7 = mean(recentValues.slice(-7));
  const volPct = clamp(stdDev(recentValues, avg20) / avg20, 0.003, 0.015);
  const trendBiasPct = Number.isFinite(avg7) ? clamp((avg7 - avg20) / avg20, -0.025, 0.025) : 0;
  const rangeMin = avg20 * 0.94;
  const rangeMax = avg20 * 1.06;
  let cursor = shiftYmd(start, -1);
  let previousValue = Number(baseRows[baseRows.length - 1]?.avg ?? baseRows[baseRows.length - 1]?.avgPlayers);
  if (!Number.isFinite(previousValue) || previousValue <= 0) previousValue = avg20;
  const injected = [];

  while (cursor && cursor < end) {
    const next = shiftYmd(cursor, 1);
    if (!next || next > end) break;
    const existing = byDate.get(next);
    const existingValue = Number(existing?.avg ?? existing?.avgPlayers);
    if (existing && Number.isFinite(existingValue)) {
      previousValue = existingValue;
      cursor = next;
      continue;
    }

    const progress = Math.max(0, Math.min(1,
      (Date.parse(`${next}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) /
      (3 * 24 * 60 * 60 * 1000)
    ));
    const noise = (dateHashWithSalt01(salt, next) - 0.5) * 2 * volPct;
    const target = avg20 * (1 + noise + trendBiasPct * progress);
    const bounded = clamp(previousValue * 0.4 + target * 0.6, rangeMin, rangeMax);
    const row = { date: next, avg: Math.round(bounded * 100) / 100 };
    injected.push(row);
    byDate.set(next, row);
    previousValue = row.avg;
    cursor = next;
  }

  return injected.length
    ? [...sorted, ...injected].sort((a, b) => String(a?.date || "").localeCompare(String(b?.date || "")))
    : sorted;
}

function applyTargetedGapBackfillToSlugDaily(slugDaily, todayYmd) {
  if (!slugDaily || typeof slugDaily !== "object") return slugDaily;
  const next = {};
  for (const [slug, rows] of Object.entries(slugDaily)) {
    next[slug] = applyTargetedGapBackfill(Array.isArray(rows) ? rows : [], todayYmd, slug);
  }
  return next;
}

function rebuildDailyTotalsFromSlugDaily(slugDaily, todayYmd) {
  if (!slugDaily || typeof slugDaily !== "object") return [];
  const totals = new Map();
  for (const rows of Object.values(slugDaily)) {
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      const date = String(row?.date || "");
      const average = Number(row?.avg ?? row?.avgPlayers);
      if (!date || !Number.isFinite(average) || (todayYmd && date >= todayYmd)) continue;
      totals.set(date, (totals.get(date) ?? 0) + average);
    }
  }
  return Array.from(totals.entries())
    .map(([date, sum]) => ({ date, avgPlayers: Math.round(sum * 100) / 100 }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function recomputeTrendDelta(dailyTotals) {
  if (!Array.isArray(dailyTotals) || dailyTotals.length < 2) return null;
  const first = dailyTotals[0];
  const last = dailyTotals[dailyTotals.length - 1];
  const startValue = Number(first?.avgPlayers);
  const endValue = Number(last?.avgPlayers);
  if (!Number.isFinite(startValue) || !Number.isFinite(endValue)) return null;
  return {
    start: { date: first.date, value: startValue },
    end: { date: last.date, value: endValue },
    absolute: Math.round((endValue - startValue) * 100) / 100,
    percent: startValue !== 0
      ? Math.round(((endValue - startValue) / startValue) * 10000) / 100
      : null,
  };
}

export function withManualDailyOverrides(basePayload, todayYmd) {
  if (!basePayload || typeof basePayload !== "object") return basePayload;
  const baseSlugDaily = basePayload.slugDaily && typeof basePayload.slugDaily === "object"
    ? basePayload.slugDaily
    : {};
  const nextSlugDaily = applyTargetedGapBackfillToSlugDaily(baseSlugDaily, todayYmd);
  const rebuiltTotals = rebuildDailyTotalsFromSlugDaily(nextSlugDaily, todayYmd);
  const startingTotals = rebuiltTotals.length
    ? rebuiltTotals
    : (Array.isArray(basePayload.dailyTotals) ? basePayload.dailyTotals : []);
  const nextDailyTotals = applyRecentDailyBackfill(
    applyDailyTotalOverrides(startingTotals),
    todayYmd
  );

  return {
    ...basePayload,
    dailyTotals: nextDailyTotals,
    slugDaily: nextSlugDaily,
    averages: {
      ...(basePayload.averages || {}),
      days7: nextDailyTotals.slice(-7),
      days30: nextDailyTotals.slice(-30),
    },
    trendDelta: recomputeTrendDelta(nextDailyTotals),
  };
}
