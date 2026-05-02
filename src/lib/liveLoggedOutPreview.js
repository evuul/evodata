// Pure data helpers for the logged-out live preview dashboard.
const quarterOrder = { Q1: 1, Q2: 2, Q3: 3, Q4: 4 };

const NUMBER_LOCALE_MAP = {
  sv: "sv-SE",
  en: "en-US",
};

export const resolveNumberLocale = (locale) => NUMBER_LOCALE_MAP[locale] ?? NUMBER_LOCALE_MAP.sv;

export const formatCurrency = (value, locale = NUMBER_LOCALE_MAP.sv) =>
  `${Number(value ?? 0).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} MEUR`;

export const formatPercent = (value, locale = NUMBER_LOCALE_MAP.sv) =>
  `${Number(value ?? 0).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

export const pickLatestReports = (reports) => {
  if (!Array.isArray(reports) || reports.length === 0) return { latest: null, previous: null };
  const sorted = [...reports].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    const aRank = quarterOrder[a.quarter] ?? 0;
    const bRank = quarterOrder[b.quarter] ?? 0;
    return aRank - bRank;
  });
  const latest = sorted[sorted.length - 1];
  const previous = sorted.length > 1 ? sorted[sorted.length - 2] : null;
  return { latest, previous };
};

export const computePlayersPreview = (rows) => {
  if (!Array.isArray(rows) || rows.length === 0) return { latestDay: null, weeklyAvg: null };
  const latestDay = rows[rows.length - 1];
  const window = rows.slice(-7);
  const weeklyAvg =
    window.reduce((acc, item) => (Number.isFinite(item?.Players) ? acc + item.Players : acc), 0) / window.length;
  return { latestDay, weeklyAvg };
};

export const pickLatestDividend = (data) => {
  const history = Array.isArray(data?.historicalDividends) ? data.historicalDividends : [];
  if (!history.length) return null;
  return [...history]
    .filter((row) => row?.date)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-1)[0] ?? null;
};

export const formatNumberCompact = (value, locale = NUMBER_LOCALE_MAP.sv, options = {}) =>
  Number(value ?? 0).toLocaleString(locale, { notation: "compact", maximumFractionDigits: 1, ...options });

export const formatCurrencySek = (value, locale = NUMBER_LOCALE_MAP.sv) =>
  typeof value === "number"
    ? new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "SEK",
        maximumFractionDigits: value >= 1_000_000 ? 0 : 2,
      }).format(value)
    : null;

const SEK_UNIT_LABELS = {
  sv: { billion: "Mdkr", million: "MSEK" },
  en: { billion: "B SEK", million: "M SEK" },
};

export const formatSekAbbrev = (value, locale = NUMBER_LOCALE_MAP.sv, language = "sv") => {
  if (!Number.isFinite(value)) return null;
  const labels = SEK_UNIT_LABELS[language] ?? SEK_UNIT_LABELS.sv;
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ${labels.billion}`;
  }
  return `${(value / 1_000_000).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ${labels.million}`;
};

export const formatSignedPercent = (value, locale = NUMBER_LOCALE_MAP.sv) => {
  if (!Number.isFinite(value)) return null;
  if (value === 0) return "±0%";
  const abs = Math.abs(value).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return `${value > 0 ? "+" : "-"}${abs}%`;
};

export const computeRevenueAth = (reports) => {
  const rows = Array.isArray(reports) ? reports : [];
  return rows.reduce((acc, report) => {
    const value = Number(report?.operatingRevenues);
    if (!Number.isFinite(value)) return acc;
    if (!acc || value > acc.value) {
      return {
        value,
        year: report.year,
        quarter: report.quarter,
        margin: Number(report?.adjustedOperatingMargin) ?? null,
      };
    }
    return acc;
  }, null);
};

export const computeLobbyTrend = (rows, windowSize = 7) => {
  if (!Array.isArray(rows) || rows.length < windowSize * 2) return null;
  const sorted = [...rows]
    .map((item) => ({
      date: new Date(item.Datum ?? item.date ?? item.Date ?? Date.now()),
      players: Number(item.Players ?? item.players),
    }))
    .filter((item) => Number.isFinite(item.players) && !Number.isNaN(item.date.valueOf()))
    .sort((a, b) => a.date - b.date);
  if (sorted.length < windowSize * 2) return null;
  const latestWindow = sorted.slice(-windowSize);
  const prevWindow = sorted.slice(-windowSize * 2, -windowSize);
  const latestAvg = latestWindow.reduce((sum, item) => sum + item.players, 0) / latestWindow.length;
  const prevAvg = prevWindow.reduce((sum, item) => sum + item.players, 0) / prevWindow.length;
  const diff = latestAvg - prevAvg;
  const pct = prevAvg !== 0 ? (diff / prevAvg) * 100 : null;
  return { latestAvg, prevAvg, diff, pct };
};

export const computeBuybackSummary = (rows, windowDays = 30) => {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const parsed = rows
    .map((item) => {
      const date = new Date(item.Datum ?? item.date ?? Date.now());
      const shares = Number(item.Antal_aktier ?? item.shares);
      const value = Number(item.Transaktionsvärde ?? item.value ?? item.valueSek);
      return { date, shares, value };
    })
    .filter((item) => Number.isFinite(item.shares) && Number.isFinite(item.value) && !Number.isNaN(item.date.valueOf()));
  if (!parsed.length) return null;
  const latestDate = parsed.reduce((latest, item) => (item.date > latest ? item.date : latest), parsed[0].date);
  const cutoff = new Date(latestDate.getTime() - windowDays * 24 * 60 * 60 * 1000);
  let shares = 0;
  let value = 0;
  parsed.forEach((item) => {
    if (item.date >= cutoff) {
      shares += item.shares;
      value += item.value;
    }
  });
  if (shares === 0 && value === 0) return null;
  const avgPrice = shares > 0 ? value / shares : null;
  return { shares, value, avgPrice, latestDate };
};

export const computeShareholderReturn = (dividendData, buybackData) => {
  const dividends = Array.isArray(dividendData?.historicalDividends) ? dividendData.historicalDividends : [];
  const totalDividendPerShare = dividends.reduce((sum, entry) => sum + Number(entry?.dividendPerShare ?? 0), 0);
  const buybacks = Array.isArray(buybackData) ? buybackData : [];
  const totalBuybackValue = buybacks.reduce((sum, entry) => sum + Number(entry?.Transaktionsvärde ?? 0), 0);
  if (totalDividendPerShare === 0 && totalBuybackValue === 0) return null;
  return {
    totalDividendPerShare,
    totalBuybackValue,
  };
};

export const computeTopGamesPreview = (gameShowsData) => {
  if (!Array.isArray(gameShowsData)) return [];
  const ranked = gameShowsData
    .map((item) => {
      const latest = Array.isArray(item.playerData) ? item.playerData[0] : null;
      const previous = Array.isArray(item.playerData) && item.playerData[1] ? item.playerData[1] : null;
      if (!latest) return null;
      const change = previous && Number.isFinite(previous.players) ? latest.players - previous.players : null;
      return {
        name: item.name,
        latestPlayers: latest.players,
        change,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (b.latestPlayers ?? 0) - (a.latestPlayers ?? 0));
  return ranked.slice(0, 3);
};

export const computeShortTrendPreview = (rows, windowSize = 7) => {
  if (!Array.isArray(rows) || rows.length === 0) return { latest: null, delta: null };
  const sorted = [...rows].sort((a, b) => new Date(a.date) - new Date(b.date));
  const latest = sorted[sorted.length - 1] ?? null;
  const window = sorted.slice(-windowSize);
  const base = window[0] ?? sorted[0];
  const delta = latest && base ? latest.percent - base.percent : null;
  return { latest, delta, window };
};

export const pickLatestInsiderBuy = (data) => {
  const items = Array.isArray(data?.items) ? data.items : [];
  return items.find((item) => item.direction === "buy") ?? null;
};

export const formatPlayers = (value, locale = NUMBER_LOCALE_MAP.sv) => Number(value ?? 0).toLocaleString(locale);

export const formatSignedNumber = (value, suffix = "", locale = NUMBER_LOCALE_MAP.sv) => {
  if (!Number.isFinite(value) || value === 0) return value === 0 ? `±0${suffix}` : null;
  const formatted = Math.abs(value).toLocaleString(locale);
  return `${value > 0 ? "+" : "-"}${formatted}${suffix}`;
};
