const WINDOW_SMOOTH = 8;
export const MAX_FWD_GROWTH = 0.25;
export const MIN_FWD_GROWTH = -0.1;
const MIN_PE = 10;
const MAX_PE = 35;
export const MIN_BBY = 0.0;
export const MAX_BBY = 0.08;

const DEFAULT_BUYBACK = { base: 0.03, bull: 0.04, bear: 0.02 };

export const quarterToNumber = (q) =>
  q === 'Q1' ? 1 : q === 'Q2' ? 2 : q === 'Q3' ? 3 : q === 'Q4' ? 4 : 0;

export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const basePeFromFundamentals = (growthYoY, avgOpMargin) => {
  const g = (growthYoY ?? 0) * 100;

  let pe =
    g <= 0
      ? 12
      : g <= 5
      ? 14
      : g <= 10
      ? 16
      : g <= 15
      ? 18
      : g <= 20
      ? 20
      : 22;

  if (avgOpMargin != null) {
    if (avgOpMargin >= 65) pe += 3;
    else if (avgOpMargin >= 55) pe += 2;
    else if (avgOpMargin >= 45) pe += 1;
    else if (avgOpMargin < 35) pe -= 1;
  }

  return clamp(pe, MIN_PE, 30);
};

const ttmEps = (sortedReports, offsetFromEnd = 0) => {
  const end = sortedReports.length - offsetFromEnd;
  const start = Math.max(0, end - 4);
  if (end - start < 4) return null;
  return sortedReports
    .slice(start, end)
    .reduce((acc, r) => acc + (Number(r.adjustedEarningsPerShare) || 0), 0);
};

const normalizedAnnualEps = (sortedReports, quarters = WINDOW_SMOOTH) => {
  const take = Math.min(quarters, sortedReports.length);
  if (take < 4) return null;
  const window = sortedReports.slice(-take);
  const sumEps = window.reduce(
    (acc, r) => acc + (Number(r.adjustedEarningsPerShare) || 0),
    0
  );
  return (sumEps * 4) / take;
};

const avgOpMargin4Q = (sortedReports) => {
  const last4 = sortedReports.slice(-4);
  if (last4.length < 4) return null;
  const sum = last4.reduce(
    (acc, r) => acc + (Number(r.adjustedOperatingMargin) || 0),
    0
  );
  return sum / 4;
};

const ttmRevenue = (sortedReports) => {
  const last4 = sortedReports.slice(-4);
  if (last4.length < 4) return null;
  return last4.reduce(
    (acc, r) => acc + (Number(r.operatingRevenues) || 0),
    0
  );
};

const epsBoostFromBuybacks = (yieldValue) => {
  const y = clamp(Number(yieldValue) || 0, MIN_BBY, MAX_BBY);
  return 1 / (1 - y) - 1;
};

const emptyResult = Object.freeze({
  latestLabel: '',
  annualEpsTTMSEK: null,
  annualEpsNormSEK: null,
  avgMargin: null,
  yoyGrowth: null,
  revTtmMEUR: null,
  scenarios: [],
  bbInfo: { base: 0, bull: 0, bear: 0, baseBoostPct: 0 },
  raw: {
    ttmEpsEUR: null,
    normalizedEpsEUR: null,
  },
  growthRates: { fair: null, bull: null, bear: null },
  fwdEpsEUR: { fair: null, bull: null, bear: null },
  multiples: { fair: null, bull: null, bear: null },
});

export const computeFairValueInsights = ({
  reports,
  buyback = DEFAULT_BUYBACK,
  fxRate,
  currentPriceSEK,
} = {}) => {
  if (!Array.isArray(reports) || reports.length === 0) {
    return emptyResult;
  }

  const fx = Number(fxRate);
  if (!Number.isFinite(fx) || fx <= 0) {
    return emptyResult;
  }

  const sorted = [...reports]
    .map((report) => ({
      ...report,
      year: Number(report?.year),
      quarter: report?.quarter,
    }))
    .filter((report) => Number.isFinite(report.year) && typeof report.quarter === 'string')
    .sort((a, b) =>
      a.year !== b.year
        ? a.year - b.year
        : quarterToNumber(a.quarter) - quarterToNumber(b.quarter)
    );

  if (sorted.length === 0) {
    return emptyResult;
  }

  const ttmNow = ttmEps(sorted, 0);
  const ttmPrev = ttmEps(sorted, 4);
  const epsNorm = normalizedAnnualEps(sorted, WINDOW_SMOOTH);
  if (ttmNow == null || epsNorm == null) {
    return emptyResult;
  }

  const last = sorted.at(-1);
  const latestLabel =
    last && last.year && last.quarter ? `${last.year} ${last.quarter}` : '';

  const yoy =
    ttmPrev && ttmPrev > 0 ? (ttmNow - ttmPrev) / ttmPrev : 0;
  const baseGrowth = clamp(yoy, MIN_FWD_GROWTH, MAX_FWD_GROWTH);

  const avgMargin = avgOpMargin4Q(sorted);
  const revTtm = ttmRevenue(sorted);

  const peBase = basePeFromFundamentals(baseGrowth, avgMargin);
  const peBull = clamp(Math.round(peBase * 1.2), MIN_PE, MAX_PE);
  const peBear = clamp(Math.round(peBase * 0.8), MIN_PE, MAX_PE);

  const bullGrowth = clamp(baseGrowth + 0.05, MIN_FWD_GROWTH, MAX_FWD_GROWTH);
  const bearGrowth = clamp(baseGrowth - 0.05, MIN_FWD_GROWTH, MAX_FWD_GROWTH);

  const bbBase = clamp(buyback?.base ?? DEFAULT_BUYBACK.base, MIN_BBY, MAX_BBY);
  const bbBull = clamp(
    buyback?.bull ?? bbBase + 0.01,
    MIN_BBY,
    MAX_BBY
  );
  const bbBear = clamp(
    buyback?.bear ?? Math.max(0, bbBase - 0.01),
    MIN_BBY,
    MAX_BBY
  );

  const fwdEpsBaseEUR = (epsNorm * (1 + baseGrowth)) / (1 - bbBase);
  const fwdEpsBullEUR = (epsNorm * (1 + bullGrowth)) / (1 - bbBull);
  const fwdEpsBearEUR = (epsNorm * (1 + bearGrowth)) / (1 - bbBear);

  const fairSEK = peBase * fwdEpsBaseEUR * fx;
  const bullSEK = peBull * fwdEpsBullEUR * fx;
  const bearSEK = peBear * fwdEpsBearEUR * fx;

  const price = Number(currentPriceSEK);
  const computeUpside = (target) =>
    Number.isFinite(price) && price > 0
      ? ((target - price) / price) * 100
      : null;

  const scenarios = [
    {
      id: 'fair',
      label: 'Fair Value',
      variant: 'base',
      description: `Normaliserad vinst + ${Math.round(bbBase * 100)}% nettoåterköp.`,
      pe: peBase,
      impliedPriceSEK: fairSEK,
      upsidePct: computeUpside(fairSEK),
      buybackRate: bbBase,
      growth: baseGrowth,
      fwdEpsEUR: fwdEpsBaseEUR,
      fwdEpsSEK: fwdEpsBaseEUR * fx,
    },
    {
      id: 'bull',
      label: 'Bull',
      variant: 'bull',
      description: `Starkare tillväxt + ${Math.round(bbBull * 100)}% nettoåterköp.`,
      pe: peBull,
      impliedPriceSEK: bullSEK,
      upsidePct: computeUpside(bullSEK),
      buybackRate: bbBull,
      growth: bullGrowth,
      fwdEpsEUR: fwdEpsBullEUR,
      fwdEpsSEK: fwdEpsBullEUR * fx,
    },
    {
      id: 'bear',
      label: 'Bear',
      variant: 'bear',
      description: `Dämpad tillväxt + ${Math.round(bbBear * 100)}% nettoåterköp.`,
      pe: peBear,
      impliedPriceSEK: bearSEK,
      upsidePct: computeUpside(bearSEK),
      buybackRate: bbBear,
      growth: bearGrowth,
      fwdEpsEUR: fwdEpsBearEUR,
      fwdEpsSEK: fwdEpsBearEUR * fx,
    },
  ];

  return {
    latestLabel,
    annualEpsTTMSEK: ttmNow * fx,
    annualEpsNormSEK: epsNorm * fx,
    avgMargin,
    yoyGrowth: yoy,
    revTtmMEUR: revTtm,
    scenarios,
    bbInfo: {
      base: bbBase,
      bull: bbBull,
      bear: bbBear,
      baseBoostPct: epsBoostFromBuybacks(bbBase) * 100,
    },
    raw: {
      ttmEpsEUR: ttmNow,
      normalizedEpsEUR: epsNorm,
    },
    growthRates: {
      fair: baseGrowth,
      bull: bullGrowth,
      bear: bearGrowth,
    },
    fwdEpsEUR: {
      fair: fwdEpsBaseEUR,
      bull: fwdEpsBullEUR,
      bear: fwdEpsBearEUR,
    },
    multiples: {
      fair: peBase,
      bull: peBull,
      bear: peBear,
    },
  };
};
