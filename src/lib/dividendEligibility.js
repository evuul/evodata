const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

export const normalizeYmd = (value) => {
  const s = String(value || "").trim().slice(0, 10);
  return YMD_RE.test(s) ? s : null;
};

const parseYmdUtc = (ymd) => {
  const n = normalizeYmd(ymd);
  if (!n) return null;
  const date = new Date(`${n}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toYmdUtc = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
};

const previousWeekday = (ymd) => {
  const base = parseYmdUtc(ymd);
  if (!base) return null;
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() - 1);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) {
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return toYmdUtc(d);
};

// Resolve X-day (ex-dividend date). If explicit ex-date is missing, infer from
// avstamningsdag/record date as the previous trading weekday.
export const resolveDividendExDate = (dividend) => {
  const explicitExDate =
    normalizeYmd(dividend?.exDate) ||
    normalizeYmd(dividend?.xDate) ||
    normalizeYmd(dividend?.ex_day) ||
    normalizeYmd(dividend?.exDateTime);
  if (explicitExDate) return explicitExDate;

  const recordDate =
    normalizeYmd(dividend?.recordDate) ||
    normalizeYmd(dividend?.avstamningsdag) ||
    normalizeYmd(dividend?.date);
  if (!recordDate) return null;

  return previousWeekday(recordDate);
};

export const isBuyEligibleForDividend = (buyDate, dividend) => {
  const buy = normalizeYmd(buyDate);
  const exDate = resolveDividendExDate(dividend);
  if (!buy || !exDate) return false;
  return buy < exDate;
};

