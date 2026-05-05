// Helpers for detecting game series that have stayed on the same value too long.

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_MIN_RUN = 8;
const DEFAULT_MIN_DAYS = 1;
const DEFAULT_ADJUSTMENT_LOOKBACK_DAYS = 14;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const ymdToTs = (ymd) => {
  if (!ymd) return null;
  const ts = Date.parse(`${String(ymd).slice(0, 10)}T00:00:00Z`);
  return Number.isFinite(ts) ? ts : null;
};

const normalizeDailyRows = (rows) =>
  Array.isArray(rows)
    ? rows
        .map((row) => ({
          date: String(row?.date || row?.Datum || "").slice(0, 10),
          avg: Number(row?.avg ?? row?.avgPlayers ?? row?.Players ?? row?.players),
        }))
        .filter((row) => row.date && Number.isFinite(row.avg))
        .sort((a, b) => a.date.localeCompare(b.date))
    : [];

const getValueOnOrBefore = (map, ymd) => {
  if (!(map instanceof Map) || !map.size || !ymd) return null;
  const target = String(ymd).slice(0, 10);
  const keys = Array.from(map.keys()).sort((a, b) => a.localeCompare(b));
  let value = null;
  for (const key of keys) {
    if (key > target) break;
    const next = Number(map.get(key));
    if (Number.isFinite(next)) value = next;
  }
  return value;
};

const computeGeometricDailyRate = (rows, key = "avg") => {
  const list = Array.isArray(rows)
    ? rows
        .map((row) => ({
          date: String(row?.date || row?.Datum || "").slice(0, 10),
          value: Number(row?.[key]),
        }))
        .filter((row) => row.date && Number.isFinite(row.value) && row.value > 0)
        .sort((a, b) => a.date.localeCompare(b.date))
    : [];
  if (list.length < 2) return null;
  const first = list[0].value;
  const last = list[list.length - 1].value;
  if (!(first > 0) || !(last > 0)) return null;
  const days = Math.max(1, list.length - 1);
  const ratio = last / first;
  if (!(ratio > 0)) return null;
  const rate = Math.pow(ratio, 1 / days) - 1;
  return Number.isFinite(rate) ? rate : null;
};

export function computeTrailingStuckMeta(series, options = {}) {
  if (!Array.isArray(series) || series.length < 2) return null;

  const now = Number.isFinite(Number(options.now)) ? Number(options.now) : Date.now();
  const minRun = Math.max(2, Number(options.minRun) || DEFAULT_MIN_RUN);
  const minDays = Math.max(1, Number(options.minDays) || DEFAULT_MIN_DAYS);

  const latest = series[series.length - 1];
  const latestValue = Number(latest?.value);
  const latestTs = Number(latest?.ts);
  if (!Number.isFinite(latestValue) || !Number.isFinite(latestTs)) return null;

  let startIndex = series.length - 1;
  while (startIndex > 0) {
    const prev = series[startIndex - 1];
    if (Number(prev?.value) !== latestValue) break;
    startIndex -= 1;
  }

  const runLength = series.length - startIndex;
  if (runLength < minRun) return null;

  const start = series[startIndex];
  const startTs = Number(start?.ts);
  if (!Number.isFinite(startTs)) return null;

  const stuckAgeDays = Math.max(0, Math.floor((now - startTs) / DAY_MS));
  if (stuckAgeDays < minDays) return null;

  return {
    stuck: true,
    stuckDays: Math.max(1, stuckAgeDays),
    stuckSince: new Date(startTs).toISOString(),
    stuckLatestAt: new Date(latestTs).toISOString(),
    stuckValue: Math.round(latestValue),
    stuckRunLength: runLength,
  };
}

export function buildStuckAdjustedDailyTotals(perSlugData, stuckBySlug, options = {}) {
  const normalized = Array.isArray(perSlugData)
    ? perSlugData.map((item) => ({
        slug: String(item?.slug || ""),
        daily: normalizeDailyRows(item?.daily),
      }))
    : [];
  const slugList = normalized.filter((item) => item.slug);
  if (!slugList.length) {
    return {
      adjustedPerSlugData: [],
      adjustedDailyTotals: [],
      rawDailyTotals: [],
      stuckAdjustment: [],
    };
  }

  const lookbackDays = Math.max(3, Number(options.lookbackDays) || DEFAULT_ADJUSTMENT_LOOKBACK_DAYS);
  const allDates = Array.from(
    new Set(slugList.flatMap((item) => item.daily.map((row) => row.date)))
  ).sort((a, b) => a.localeCompare(b));
  const rawDailyMap = new Map(allDates.map((date) => [date, 0]));
  const healthyDailyMap = new Map(allDates.map((date) => [date, 0]));
  for (const item of slugList) {
    const stuckMeta = stuckBySlug instanceof Map ? stuckBySlug.get(item.slug) : null;
    const isStuck = Boolean(stuckMeta?.stuck);
    for (const row of item.daily) {
      rawDailyMap.set(row.date, (rawDailyMap.get(row.date) ?? 0) + row.avg);
      if (!isStuck) {
        healthyDailyMap.set(row.date, (healthyDailyMap.get(row.date) ?? 0) + row.avg);
      }
    }
  }

  const healthyDates = Array.from(healthyDailyMap.keys()).sort((a, b) => a.localeCompare(b));
  const latestHealthyDate = healthyDates.length ? healthyDates[healthyDates.length - 1] : null;
  const latestHealthyValue = latestHealthyDate ? Number(healthyDailyMap.get(latestHealthyDate)) : null;
  const healthyRows = healthyDates.map((date) => ({
    date,
    avg: Number(healthyDailyMap.get(date)) || 0,
  }));

  const stuckAdjustment = [];
  const adjustedPerSlugData = slugList.map((item) => {
    const stuckMeta = stuckBySlug instanceof Map ? stuckBySlug.get(item.slug) : null;
    if (!stuckMeta?.stuck) {
      return { slug: item.slug, daily: item.daily };
    }

    const startYmd = String(stuckMeta.stuckSince || "").slice(0, 10);
    const startTs = ymdToTs(startYmd);
    const originalDaily = item.daily;
    if (!startTs || !originalDaily.length) {
      stuckAdjustment.push({
        slug: item.slug,
        baseValue: null,
        estimatedCurrent: null,
        multiplier: 1,
        lookedBackDays: 0,
      });
      return { slug: item.slug, daily: originalDaily };
    }

    const preStuckRows = originalDaily.filter((row) => row.date < startYmd);
    const baselineRows = preStuckRows.slice(-lookbackDays);
    const baseRow = baselineRows.length ? baselineRows[baselineRows.length - 1] : preStuckRows.slice(-1)[0] || originalDaily[0];
    const baseValue = Number(baseRow?.avg);
    const baselineDate = baseRow?.date || null;
    const healthyBaseValue = getValueOnOrBefore(healthyDailyMap, baselineDate);
    const healthyLatestValue = latestHealthyValue;
    const localDailyRate = computeGeometricDailyRate(baselineRows, "avg");
    const healthyWindowRows = healthyRows.filter((row) => row.date < startYmd).slice(-lookbackDays);
    const marketDailyRate = computeGeometricDailyRate(healthyWindowRows, "avg");
    const startAnchor =
      Number.isFinite(baseValue) && baseValue > 0
        ? baseValue
        : Number.isFinite(stuckMeta?.stuckValue) && stuckMeta.stuckValue > 0
          ? Number(stuckMeta.stuckValue)
          : null;
    const postRows = originalDaily.filter((row) => row.date >= startYmd);

    const estimatedDaily = [];
    let previousValue = startAnchor;
    for (const row of originalDaily) {
      if (row.date < startYmd) {
        estimatedDaily.push(row);
        previousValue = Number(row.avg);
        continue;
      }
      const postIndex = postRows.findIndex((entry) => entry.date === row.date);
      const progress = postRows.length > 1 && postIndex >= 0 ? postIndex / (postRows.length - 1) : 1;
      const easedProgress = 1 - Math.pow(1 - clamp(progress, 0, 1), 1.8);
      const transitionRate =
        Number.isFinite(localDailyRate) && Number.isFinite(marketDailyRate)
          ? localDailyRate * (1 - easedProgress) + marketDailyRate * easedProgress
          : Number.isFinite(localDailyRate)
            ? localDailyRate
            : Number.isFinite(marketDailyRate)
              ? marketDailyRate
              : 0;
      const curvature =
        Number.isFinite(localDailyRate) && Number.isFinite(marketDailyRate)
          ? (marketDailyRate - localDailyRate) * Math.sin(Math.min(Math.max(progress, 0), 1) * Math.PI) * 0.18
          : 0;
      const damp = 1 / (1 + Math.max(0, postIndex) * 0.08);
      const rate = clamp((transitionRate + curvature) * damp, -0.2, 0.2);
      const estimatedValue = Number.isFinite(previousValue) && previousValue > 0
        ? previousValue * (1 + rate)
        : Number(stuckMeta?.stuckValue) || row.avg;
      previousValue = estimatedValue;
      estimatedDaily.push({
        ...row,
        avg: Math.round(estimatedValue * 100) / 100,
        estimated: true,
        stuck: true,
      });
    }

    stuckAdjustment.push({
      slug: item.slug,
      baseValue: Number.isFinite(baseValue) ? Math.round(baseValue * 100) / 100 : null,
      estimatedCurrent: estimatedDaily.length ? estimatedDaily[estimatedDaily.length - 1].avg : null,
      multiplier:
        Number.isFinite(startAnchor) && Number.isFinite(estimatedDaily.length ? estimatedDaily[estimatedDaily.length - 1].avg : null) && startAnchor > 0
          ? Math.round(((estimatedDaily[estimatedDaily.length - 1].avg / startAnchor) * 10000)) / 10000
          : 1,
      lookedBackDays: baselineRows.length,
      stuckDays: Number.isFinite(Number(stuckMeta?.stuckDays)) ? Math.max(1, Math.round(Number(stuckMeta.stuckDays))) : null,
      localDailyRate: Number.isFinite(localDailyRate) ? Math.round(localDailyRate * 10000) / 10000 : null,
      marketDailyRate: Number.isFinite(marketDailyRate) ? Math.round(marketDailyRate * 10000) / 10000 : null,
    });

    return { slug: item.slug, daily: estimatedDaily };
  });

  const adjustedDailyTotals = allDates
    .map((date) => {
      let sum = 0;
      let hasValue = false;
      for (const item of adjustedPerSlugData) {
        const row = item.daily.find((entry) => entry.date === date);
        if (!row || !Number.isFinite(row.avg)) continue;
        sum += row.avg;
        hasValue = true;
      }
      return hasValue ? { date, avgPlayers: Math.round(sum * 100) / 100 } : null;
    })
    .filter(Boolean);

  const rawDailyTotals = allDates
    .map((date) => {
      const total = Number(rawDailyMap.get(date));
      return Number.isFinite(total) ? { date, avgPlayers: Math.round(total * 100) / 100 } : null;
    })
    .filter(Boolean);

  return {
    adjustedPerSlugData,
    adjustedDailyTotals,
    rawDailyTotals,
    stuckAdjustment,
  };
}
