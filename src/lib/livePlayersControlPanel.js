// Shared helpers for the live players control panel.

export const TZ = "Europe/Stockholm";

export const dateFormatter = new Intl.DateTimeFormat("sv-SE", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export const timeFormatter = new Intl.DateTimeFormat("sv-SE", {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
});

export const getStockholmTodayYmd = () => {
  try {
    const formatted = dateFormatter.format(new Date());
    return formatted.replace(/\//g, "-");
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
};

export const formatDateTime = (value) => {
  if (!value) return null;
  try {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return null;
    return `${dateFormatter.format(date)} ${timeFormatter.format(date)}`;
  } catch {
    return null;
  }
};

export const formatDateOnly = (value) => {
  if (!value) return null;
  try {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return null;
    return dateFormatter.format(date);
  } catch {
    return null;
  }
};

export const normalizeDailySeries = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      const date = row?.date ?? row?.Datum ?? null;
      const avgRaw = row?.avgPlayers ?? row?.avg ?? row?.Players ?? row?.players;
      const avg = Number(avgRaw);
      if (!date || !Number.isFinite(avg)) return null;
      return { date, players: Math.round(avg) };
    })
    .filter(Boolean)
    .sort((a, b) => a.date.localeCompare(b.date));
};

export const normalizeTrendDelta = (value) => {
  if (!value || typeof value !== "object") return null;
  const startValue = Number(value?.start?.value);
  const endValue = Number(value?.end?.value);
  if (!Number.isFinite(startValue) || !Number.isFinite(endValue)) return null;
  const startDate = value?.start?.date ?? null;
  const endDate = value?.end?.date ?? null;
  const absolute = Number(value?.absolute);
  const percent = Number(value?.percent);
  return {
    start: startDate ? { date: startDate, value: Math.round(startValue) } : null,
    end: endDate ? { date: endDate, value: Math.round(endValue) } : null,
    absolute: Number.isFinite(absolute) ? absolute : Math.round((endValue - startValue) * 100) / 100,
    percent: Number.isFinite(percent)
      ? percent
      : startValue !== 0
      ? Math.round(((endValue - startValue) / startValue) * 10000) / 100
      : null,
  };
};

export const normalizeTodayPeak = (value) => {
  if (!value || typeof value !== "object") return null;
  const num = Number(value?.value);
  if (!Number.isFinite(num)) return null;
  const at = typeof value?.at === "string" ? value.at : null;
  return { value: Math.round(num), at };
};

export const normalizeLobbyAth = (value) => {
  if (!value || typeof value !== "object") return null;
  const num = Number(value?.value);
  if (!Number.isFinite(num)) return null;
  const date = typeof value?.date === "string" ? value.date : null;
  return { value: Math.round(num), date };
};

export const computeTrendDiff = (series, key = "players") => {
  if (!Array.isArray(series) || series.length < 2) return null;
  const first = series[0];
  const last = series[series.length - 1];
  const startValue = Number(first?.[key]);
  const endValue = Number(last?.[key]);
  if (!Number.isFinite(startValue) || !Number.isFinite(endValue)) return null;
  const absolute = Math.round((endValue - startValue) * 100) / 100;
  const percent =
    startValue !== 0 ? Math.round(((endValue - startValue) / startValue) * 10000) / 100 : null;
  return {
    start: { date: first?.date ?? null, value: startValue },
    end: { date: last?.date ?? null, value: endValue },
    absolute,
    percent,
  };
};

export const applyMovingAverage = (series, windowSize, key = "players") => {
  if (!Array.isArray(series) || !series.length) return [];
  const size = Math.max(1, Math.floor(windowSize || 1));
  const result = [];
  const window = [];
  let sum = 0;

  for (const row of series) {
    const value = Number(row?.[key]);
    if (!Number.isFinite(value)) continue;
    window.push(value);
    sum += value;
    if (window.length > size) sum -= window.shift();
    const avg = Math.round((sum / window.length) * 100) / 100;
    result.push({ ...row, [key]: avg });
  }

  return result;
};
