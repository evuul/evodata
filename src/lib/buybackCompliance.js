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
