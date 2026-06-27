// Computes daily buyback capacity against the 25% rolling volume rule.

const ROLLING_VOLUME_DAYS = 20;
const MAX_DAILY_VOLUME_SHARE = 0.25;

const toFiniteNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatDateKey = (value) => String(value || "").slice(0, 10);

const normalizeVolumeSource = (volumeByDate) => {
  if (volumeByDate instanceof Map) {
    return Array.from(volumeByDate.entries())
      .map(([date, volume]) => [formatDateKey(date), toFiniteNumber(volume)])
      .filter(([date, volume]) => date && Number.isFinite(volume) && volume > 0)
      .sort((a, b) => a[0].localeCompare(b[0]));
  }

  if (Array.isArray(volumeByDate)) {
    return volumeByDate
      .map((row) => [formatDateKey(row?.date ?? row?.Datum), toFiniteNumber(row?.volume ?? row?.Dagsvolym)])
      .filter(([date, volume]) => date && Number.isFinite(volume) && volume > 0)
      .sort((a, b) => a[0].localeCompare(b[0]));
  }

  if (volumeByDate && typeof volumeByDate === "object") {
    return Object.entries(volumeByDate)
      .map(([date, volume]) => [formatDateKey(date), toFiniteNumber(volume)])
      .filter(([date, volume]) => date && Number.isFinite(volume) && volume > 0)
      .sort((a, b) => a[0].localeCompare(b[0]));
  }

  return [];
};

const sumWindow = (values, rollingDays) => {
  if (!Array.isArray(values) || values.length < rollingDays) return null;
  const slice = values.slice(-rollingDays);
  return slice.reduce((sum, value) => sum + value, 0) / rollingDays;
};

const average = (values) => {
  if (!Array.isArray(values) || values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const isWeekend = (date) => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

const getEasterSunday = (year) => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
};

const getHolidayDateKeys = (year) => {
  const easterSunday = getEasterSunday(year);
  const addDays = (baseDate, offsetDays) => {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + offsetDays);
    return formatDateFromDate(date);
  };

  const midsummerEve = (() => {
    const date = new Date(year, 5, 19);
    while (date.getDay() !== 5) {
      date.setDate(date.getDate() + 1);
    }
    return formatDateFromDate(date);
  })();

  const allSaintsDay = (() => {
    const date = new Date(year, 9, 31);
    while (date.getDay() !== 6) {
      date.setDate(date.getDate() + 1);
    }
    return formatDateFromDate(date);
  })();

  return new Set([
    `${year}-01-01`,
    `${year}-01-06`,
    addDays(easterSunday, -2),
    addDays(easterSunday, 1),
    `${year}-05-01`,
    addDays(easterSunday, 39),
    `${year}-06-06`,
    midsummerEve,
    allSaintsDay,
    `${year}-12-24`,
    `${year}-12-25`,
    `${year}-12-26`,
    `${year}-12-31`,
  ]);
};

const isMarketClosedDay = (date) => {
  if (isWeekend(date)) return true;
  const holidayDateKeys = getHolidayDateKeys(date.getFullYear());
  return holidayDateKeys.has(formatDateFromDate(date));
};

const nextTradingDay = (date) => {
  const cursor = new Date(date);
  cursor.setHours(12, 0, 0, 0);

  do {
    cursor.setDate(cursor.getDate() + 1);
  } while (isMarketClosedDay(cursor));

  return cursor;
};

const formatDateFromDate = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const normalizeBuybackRows = (rows) => {
  const byDate = new Map();

  for (const row of Array.isArray(rows) ? rows : []) {
    const date = formatDateKey(row?.Datum ?? row?.date);
    const shares = toFiniteNumber(row?.Antal_aktier ?? row?.shares) ?? 0;
    const volume = toFiniteNumber(row?.Dagsvolym ?? row?.volume);
    if (!date) continue;

    const existing = byDate.get(date) || {
      date,
      shares: 0,
      volume: null,
    };

    if (shares > 0) {
      existing.shares = shares;
    }

    if (Number.isFinite(volume) && volume > 0 && !Number.isFinite(existing.volume)) {
      existing.volume = volume;
    }

    byDate.set(date, existing);
  }

  return byDate;
};

export const buildBuybackComplianceSeries = (
  rows,
  volumeByDate,
  { startDate = null, rollingDays = ROLLING_VOLUME_DAYS, maxShare = MAX_DAILY_VOLUME_SHARE } = {}
) => {
  const buybacksByDate = normalizeBuybackRows(rows);
  const volumeEntries = normalizeVolumeSource(volumeByDate);
  const result = [];
  const volumeWindow = [];

  for (const [date, dailyVolume] of volumeEntries) {
    const averageVolume20 = sumWindow(volumeWindow, rollingDays);
    const maxAllowedShares =
      averageVolume20 != null && Number.isFinite(maxShare) && maxShare > 0
        ? Math.floor(averageVolume20 * maxShare)
        : null;
    const actualShares = buybacksByDate.get(date)?.shares ?? 0;
    const utilizationPct =
      Number.isFinite(maxAllowedShares) && maxAllowedShares > 0 ? (actualShares / maxAllowedShares) * 100 : null;

    if (!startDate || date >= startDate) {
      result.push({
        date,
        label: date.slice(5),
        actualShares: Math.round(actualShares),
        dailyVolume,
        averageVolume20,
        maxAllowedShares,
        utilizationPct,
        remainingCapacity:
          Number.isFinite(maxAllowedShares) && maxAllowedShares != null
            ? Math.max(maxAllowedShares - actualShares, 0)
            : null,
        nearLimit: Number.isFinite(utilizationPct) ? utilizationPct >= 90 : false,
      });
    }

    volumeWindow.push(dailyVolume);
    if (volumeWindow.length > rollingDays) volumeWindow.shift();
  }

  return result;
};

export const buildBuybackComplianceForecast = (
  volumeByDate,
  {
    horizonTradingDays = 5,
    rollingDays = ROLLING_VOLUME_DAYS,
    maxShare = MAX_DAILY_VOLUME_SHARE,
    recentWindowDays = 5,
  } = {}
) => {
  const volumeEntries = normalizeVolumeSource(volumeByDate);
  if (volumeEntries.length < rollingDays || horizonTradingDays <= 0) {
    return null;
  }

  const historicalVolumes = volumeEntries.map(([, volume]) => volume);
  const rollingWindow = historicalVolumes.slice(-rollingDays);
  const currentAverageVolume20 = average(rollingWindow);
  if (!Number.isFinite(currentAverageVolume20) || currentAverageVolume20 <= 0) {
    return null;
  }

  const recentVolumes = historicalVolumes.slice(-Math.min(recentWindowDays, historicalVolumes.length));
  const recentAverageVolume = average(recentVolumes);
  const projectedVolume =
    Number.isFinite(recentAverageVolume) && recentAverageVolume > 0 ? recentAverageVolume : currentAverageVolume20;
  if (!Number.isFinite(projectedVolume) || projectedVolume <= 0) {
    return null;
  }

  const latestDate = volumeEntries[volumeEntries.length - 1]?.[0];
  if (!latestDate) return null;

  const forecastRows = [];
  let cursor = new Date(`${latestDate}T12:00:00`);
  if (!Number.isFinite(cursor.getTime())) {
    cursor = new Date(latestDate);
  }

  for (let index = 0; index < horizonTradingDays; index += 1) {
    cursor = nextTradingDay(cursor);
    const date = formatDateFromDate(cursor);
    const forecastAverageVolume20 = average(rollingWindow);
    const maxAllowedShares =
      Number.isFinite(forecastAverageVolume20) && Number.isFinite(maxShare) && maxShare > 0
        ? Math.floor(forecastAverageVolume20 * maxShare)
        : null;

    forecastRows.push({
      date,
      label: date.slice(5),
      projectedVolume: Math.round(projectedVolume),
      averageVolume20: forecastAverageVolume20,
      maxAllowedShares,
      projectedCapacityShares: maxAllowedShares,
    });

    rollingWindow.push(projectedVolume);
    if (rollingWindow.length > rollingDays) {
      rollingWindow.shift();
    }
  }

  const currentMaxAllowedShares = Math.floor(currentAverageVolume20 * maxShare);
  const projectedTotalMaxShares = forecastRows.reduce((sum, row) => sum + (Number(row?.maxAllowedShares) || 0), 0);

  return {
    rows: forecastRows,
    summary: {
      horizonTradingDays,
      currentAverageVolume20,
      currentMaxAllowedShares,
      projectedVolume,
      projectedDailyMaxShares: forecastRows[0]?.maxAllowedShares ?? null,
      projectedTotalMaxShares,
      projectedAverageDailyMaxShares: forecastRows.length > 0 ? projectedTotalMaxShares / forecastRows.length : null,
    },
  };
};

export const trimLeadingPlaceholderComplianceRows = (rows) => {
  const list = Array.isArray(rows) ? rows : [];
  const firstActualIndex = list.findIndex((row) => Number(row?.actualShares) > 0);
  if (firstActualIndex <= 0) {
    return list;
  }

  return list.slice(firstActualIndex);
};

export const buildBuybackWeeklyEstimate = (
  complianceRows,
  complianceForecast,
  { utilizationWindow = 5 } = {}
) => {
  const forecastRows = Array.isArray(complianceForecast?.rows) ? complianceForecast.rows : [];
  if (!forecastRows.length) {
    return null;
  }

  const rows = Array.isArray(complianceRows) ? complianceRows : [];
  const measured = rows
    .filter((row) => Number.isFinite(row?.actualShares) && Number.isFinite(row?.maxAllowedShares) && row.maxAllowedShares > 0)
    .filter((row) => Number(row.actualShares) > 0 && Number.isFinite(row.utilizationPct));
  const recentMeasured = measured.slice(-Math.max(utilizationWindow, 1));
  const utilizationRate =
    recentMeasured.length > 0
      ? Math.max(Math.min(average(recentMeasured.map((row) => Number(row.utilizationPct))) / 100, 1), 0)
      : 1;

  const weekRows = forecastRows.map((row) => {
    const estimatedShares =
      Number.isFinite(row?.maxAllowedShares) && row.maxAllowedShares > 0
        ? Math.round(row.maxAllowedShares * utilizationRate)
        : 0;
    return {
      date: row.date,
      label: row.label,
      maxAllowedShares: row.maxAllowedShares,
      estimatedShares,
      estimatedSource: "forecast",
    };
  });

  const estimatedShares = weekRows.reduce((sum, row) => sum + (Number(row.estimatedShares) || 0), 0);
  const periodStart = forecastRows[0]?.date ? new Date(`${forecastRows[0].date}T12:00:00`) : null;
  const periodEnd = forecastRows.at(-1)?.date ? new Date(`${forecastRows.at(-1).date}T12:00:00`) : null;

  return {
    periodStart,
    periodEnd,
    tradingDays: weekRows.length,
    utilizationRate,
    reportedShares: 0,
    forecastShares: estimatedShares,
    estimatedShares,
    projectedRemainingShares: estimatedShares,
    rows: weekRows,
  };
};

export const summarizeBuybackCompliance = (series) => {
  const rows = Array.isArray(series) ? series : [];
  const measured = rows.filter(
    (row) => Number.isFinite(row?.actualShares) && Number.isFinite(row?.maxAllowedShares) && row.maxAllowedShares > 0
  );
  if (!measured.length) {
    return {
      latest: null,
      averageUtilizationPct: null,
      maxUtilizationPct: null,
      nearLimitDays: 0,
    };
  }

  const latest = measured[measured.length - 1];
  const utilizationValues = measured
    .map((row) => Number(row.utilizationPct))
    .filter((value) => Number.isFinite(value));

  return {
    latest,
    averageUtilizationPct:
      utilizationValues.length > 0
        ? utilizationValues.reduce((sum, value) => sum + value, 0) / utilizationValues.length
        : null,
    maxUtilizationPct: utilizationValues.length > 0 ? Math.max(...utilizationValues) : null,
    nearLimitDays: measured.filter((row) => row.nearLimit).length,
  };
};
