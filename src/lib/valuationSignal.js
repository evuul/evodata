// Valuation signal scoring for Mina Sidor and related valuation surfaces.
import valuationConfig from "./valuationConfigData.js";

const QUARTER_ORDER = { Q1: 1, Q2: 2, Q3: 3, Q4: 4 };
const BUYBACK_MANDATE_CASH_EUR = 2_000_000_000;
const MAX_BUYBACK_YIELD = 0.25;

const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const latestOutstandingSharesM = (sharesData = []) => {
  if (!Array.isArray(sharesData) || sharesData.length === 0) return null;
  const latest = sharesData.at(-1);
  const sharesOutstanding = Number(latest?.sharesOutstanding);
  if (!Number.isFinite(sharesOutstanding) || sharesOutstanding <= 0) return null;
  return sharesOutstanding;
};

const sortReports = (reports = []) =>
  [...reports].sort((a, b) => {
    const ay = Number(a?.year) || 0;
    const by = Number(b?.year) || 0;
    if (ay !== by) return ay - by;
    return (QUARTER_ORDER[a?.quarter] || 0) - (QUARTER_ORDER[b?.quarter] || 0);
  });

const scoreLowerBetter = (value, greenMax, yellowMax, redMin) => {
  if (!Number.isFinite(value)) return null;
  if (value <= greenMax) return 100;
  if (value <= yellowMax) {
    const t = (value - greenMax) / Math.max(0.0001, yellowMax - greenMax);
    return Math.round(100 - t * 30);
  }
  if (value <= redMin) {
    const t = (value - yellowMax) / Math.max(0.0001, redMin - yellowMax);
    return Math.round(70 - t * 60);
  }
  return 10;
};

const scoreHigherBetter = (value, greenMin, yellowMin, redMax) => {
  if (!Number.isFinite(value)) return null;
  if (value >= greenMin) return 100;
  if (value >= yellowMin) {
    const t = (value - yellowMin) / Math.max(0.0001, greenMin - yellowMin);
    return Math.round(70 + t * 30);
  }
  if (value >= redMax) {
    const t = (value - redMax) / Math.max(0.0001, yellowMin - redMax);
    return Math.round(10 + t * 60);
  }
  return 10;
};

const averageScores = (...scores) => {
  const available = scores.filter(Number.isFinite);
  if (!available.length) return null;
  return Math.round(available.reduce((sum, value) => sum + value, 0) / available.length);
};

const weightedAverage = (dimensions) => {
  const available = dimensions.filter(({ score }) => Number.isFinite(score));
  const totalWeight = available.reduce((sum, item) => sum + item.weight, 0);
  if (!available.length || totalWeight <= 0) return null;
  return Math.round(
    available.reduce((sum, item) => sum + item.score * item.weight, 0) / totalWeight
  );
};

function resolveLtmReports(sorted) {
  if (!Array.isArray(sorted) || sorted.length < 4) return [];
  return sorted.slice(-4);
}

function resolveSameQuarterLastYear(sorted, latest) {
  if (!latest) return null;
  const targetYear = Number(latest.year) - 1;
  const targetQuarter = String(latest.quarter || "");
  return (
    sorted.find(
      (r) => Number(r?.year) === targetYear && String(r?.quarter || "") === targetQuarter
    ) || null
  );
}

function resolveMarginPenalty(sorted, penalties) {
  if (!Array.isArray(sorted) || sorted.length < 3) return null;
  const [a, b, c] = sorted.slice(-3);
  const m1 = toNumber(a?.adjustedEBITDAMargin);
  const m2 = toNumber(b?.adjustedEBITDAMargin);
  const m3 = toNumber(c?.adjustedEBITDAMargin);
  if (![m1, m2, m3].every(Number.isFinite)) return null;
  const drop1 = m1 - m2;
  const drop2 = m2 - m3;
  if (drop1 > 2 && drop2 > 2) {
    return {
      key: "marginTrendBreak",
      points: penalties.marginTrendBreak,
      message: "EBITDA margin has fallen >2pp two quarters in a row.",
    };
  }
  return null;
}

function resolveGrowthPenalty(sorted, latest, sameQuarterPrevYear, penalties) {
  const revNow = toNumber(latest?.operatingRevenues);
  const revPrev = toNumber(sameQuarterPrevYear?.operatingRevenues);
  if (!Number.isFinite(revNow) || !Number.isFinite(revPrev) || revPrev <= 0) return null;
  const yoy = ((revNow - revPrev) / revPrev) * 100;
  if (yoy < 5) {
    return {
      key: "lowRevenueGrowth",
      points: penalties.lowRevenueGrowth,
      message: "Revenue growth is below 5% YoY.",
    };
  }
  return null;
}

function resolveAsiaPenalty(sorted, penalties) {
  if (!Array.isArray(sorted) || sorted.length < 2) return null;
  const prev = sorted[sorted.length - 2];
  const latest = sorted[sorted.length - 1];
  const aPrev = toNumber(prev?.asia);
  const aNow = toNumber(latest?.asia);
  if (!Number.isFinite(aPrev) || !Number.isFinite(aNow)) return null;
  if (aNow < aPrev) {
    return {
      key: "asiaQoqNegative",
      points: penalties.asiaQoqNegative,
      message: "Asia revenue is down QoQ.",
    };
  }
  return null;
}

function sumLtm(sorted, field) {
  const ltm = resolveLtmReports(sorted);
  if (ltm.length < 4) return null;
  return ltm.reduce((acc, row) => acc + (toNumber(row?.[field]) || 0), 0);
}

export function computeValuationSignal({
  reports = [],
  currentPriceSEK,
  marketCapSEK,
  fxRate,
  buybackMandateCashEUR = BUYBACK_MANDATE_CASH_EUR,
  sharesData = [],
  config = valuationConfig,
}) {
  const sorted = sortReports(reports);
  const ltm = resolveLtmReports(sorted);
  if (ltm.length < 4) {
    return {
      ok: false,
      reason: "not_enough_reports",
      metrics: {},
      score: null,
      status: "unknown",
      dimensions: {},
      penalties: [],
      positives: [],
    };
  }

  const priceSEK = toNumber(currentPriceSEK);
  const fx = toNumber(fxRate);
  const marketCap = toNumber(marketCapSEK);
  const sharesOutstandingM = latestOutstandingSharesM(sharesData);

  const epsLtmEur = ltm.reduce((acc, r) => acc + (toNumber(r?.adjustedEarningsPerShare) || 0), 0);
  const ocfPsLtmEur = ltm.reduce((acc, r) => acc + (toNumber(r?.ocfPerShare) || 0), 0);
  const ebitdaLtmEurM = ltm.reduce((acc, r) => acc + (toNumber(r?.adjustedEBITDA) || 0), 0);

  const capexHaircutPct = Number(config?.capexHaircutPct ?? 0.12);
  const fcfPsLtmEur = ocfPsLtmEur * (1 - clamp(capexHaircutPct, 0, 0.4));

  const epsLtmSek = Number.isFinite(fx) && fx > 0 ? epsLtmEur * fx : null;
  const fcfPsLtmSek = Number.isFinite(fx) && fx > 0 ? fcfPsLtmEur * fx : null;
  const marketCapEurM = Number.isFinite(fx) && fx > 0 && Number.isFinite(marketCap) ? marketCap / fx / 1_000_000 : null;

  const latest = sorted[sorted.length - 1];
  const sameQuarterPrevYear = resolveSameQuarterLastYear(sorted, latest);
  const netCashEurM = toNumber(latest?.cashAndCashEquivalents);

  const pe =
    Number.isFinite(priceSEK) && priceSEK > 0 && Number.isFinite(epsLtmSek) && epsLtmSek > 0
      ? priceSEK / epsLtmSek
      : null;
  const revLtmEurM = sumLtm(sorted, "operatingRevenues");
  const latestEquityPerShareEur = toNumber(latest?.equityPerShare);
  const latestRevEurM = toNumber(latest?.operatingRevenues);
  const prevRevEurM = toNumber(sameQuarterPrevYear?.operatingRevenues);
  const revenueGrowthPct =
    Number.isFinite(latestRevEurM) && Number.isFinite(prevRevEurM) && prevRevEurM > 0
      ? ((latestRevEurM - prevRevEurM) / prevRevEurM) * 100
      : null;
  const clampedGrowthPct =
    Number.isFinite(revenueGrowthPct)
      ? clamp(revenueGrowthPct, -10, 30)
      : null;
  const forwardEpsLtmSek =
    Number.isFinite(epsLtmSek) &&
    Number.isFinite(clampedGrowthPct)
      ? epsLtmSek * (1 + clampedGrowthPct / 100)
      : null;
  const forwardPe =
    Number.isFinite(priceSEK) &&
    priceSEK > 0 &&
    Number.isFinite(forwardEpsLtmSek) &&
    forwardEpsLtmSek > 0
      ? priceSEK / forwardEpsLtmSek
      : null;
  const peg =
    Number.isFinite(pe) &&
    Number.isFinite(clampedGrowthPct) &&
    clampedGrowthPct !== 0
      ? pe / clampedGrowthPct
      : null;
  const pBook =
    Number.isFinite(priceSEK) &&
    priceSEK > 0 &&
    Number.isFinite(latestEquityPerShareEur) &&
    latestEquityPerShareEur > 0 &&
    Number.isFinite(fx) &&
    fx > 0
      ? priceSEK / (latestEquityPerShareEur * fx)
      : null;
  const pSales =
    Number.isFinite(marketCapEurM) &&
    marketCapEurM > 0 &&
    Number.isFinite(revLtmEurM) &&
    revLtmEurM > 0
      ? marketCapEurM / revLtmEurM
      : null;
  const fcfYieldPct =
    Number.isFinite(priceSEK) && priceSEK > 0 && Number.isFinite(fcfPsLtmSek)
      ? (fcfPsLtmSek / priceSEK) * 100
      : null;
  const enterpriseValueEurM =
    Number.isFinite(marketCapEurM) ? marketCapEurM - (Number.isFinite(netCashEurM) ? netCashEurM : 0) : null;
  const evEbitda =
    Number.isFinite(enterpriseValueEurM) &&
    Number.isFinite(ebitdaLtmEurM) &&
    ebitdaLtmEurM > 0
      ? enterpriseValueEurM / ebitdaLtmEurM
      : null;

  const buybackMandateEur = toNumber(buybackMandateCashEUR);
  const buybackMandateSek =
    Number.isFinite(buybackMandateEur) && Number.isFinite(fx) && fx > 0
      ? buybackMandateEur * fx
      : null;
  const buybackMandateYieldPct =
    Number.isFinite(buybackMandateSek) &&
    Number.isFinite(marketCap) &&
    marketCap > 0
      ? (buybackMandateSek / marketCap) * 100
      : null;
  const buybackYield = Number.isFinite(buybackMandateYieldPct)
    ? clamp(buybackMandateYieldPct / 100, 0, MAX_BUYBACK_YIELD)
    : null;
  const buybackBoostPct = Number.isFinite(buybackYield)
    ? ((1 / (1 - buybackYield)) - 1) * 100
    : null;

  const peCfg = config?.thresholds?.pe || {};
  const fcfCfg = config?.thresholds?.fcfYieldPct || {};
  const evCfg = config?.thresholds?.evEbitda || {};

  const peScore = scoreLowerBetter(pe, peCfg.greenMax ?? 15, peCfg.yellowMax ?? 20, peCfg.redMin ?? 25);
  const fcfScore = scoreHigherBetter(
    fcfYieldPct,
    fcfCfg.greenMin ?? 5,
    fcfCfg.yellowMin ?? 3,
    fcfCfg.redMax ?? 2
  );
  const evScore = scoreLowerBetter(
    evEbitda,
    evCfg.greenMax ?? 10,
    evCfg.yellowMax ?? 14,
    evCfg.redMin ?? 18
  );

  const penaltiesCfg = config?.penalties || {};
  const penaltyEvents = [
    resolveMarginPenalty(sorted, penaltiesCfg),
    resolveGrowthPenalty(sorted, latest, sameQuarterPrevYear, penaltiesCfg),
    resolveAsiaPenalty(sorted, penaltiesCfg),
  ].filter(Boolean);
  const penaltyPoints = penaltyEvents.reduce((acc, p) => acc + (Number(p.points) || 0), 0);

  const growthScore = scoreHigherBetter(revenueGrowthPct, 10, 5, 0);
  const marginScore = penaltyEvents.some((event) => event.key === "marginTrendBreak") ? 30 : 80;
  const asiaScore = penaltyEvents.some((event) => event.key === "asiaQoqNegative") ? 35 : 80;
  const trendScore = averageScores(growthScore, marginScore, asiaScore);
  const valuationScore = averageScores(peScore, evScore);
  const capitalAllocationScore = scoreHigherBetter(buybackMandateYieldPct, 12, 6, 2);
  const dimensions = {
    valuation: valuationScore,
    cashFlow: fcfScore,
    trend: trendScore,
    capitalAllocation: capitalAllocationScore,
  };
  const score = weightedAverage([
    { score: dimensions.valuation, weight: 0.35 },
    { score: dimensions.cashFlow, weight: 0.25 },
    { score: dimensions.trend, weight: 0.25 },
    { score: dimensions.capitalAllocation, weight: 0.15 },
  ]);

  const positives = [];
  if (Number.isFinite(pe) && pe <= (peCfg.greenMax ?? 15)) positives.push("P/E is in green zone.");
  if (Number.isFinite(fcfYieldPct) && fcfYieldPct >= (fcfCfg.greenMin ?? 5)) positives.push("FCF yield is strong.");
  if (Number.isFinite(evEbitda) && evEbitda <= (evCfg.greenMax ?? 10)) positives.push("EV/EBITDA is attractive.");

  let status = "weak";
  if (!Number.isFinite(score)) status = "unknown";
  else if (score >= 80) status = "very_strong";
  else if (score >= 65) status = "strong";
  else if (score >= 50) status = "balanced";

  return {
    ok: true,
    score,
    penaltyPoints,
    status,
    dimensions,
    penalties: penaltyEvents,
    positives,
    metrics: {
      pe,
      forwardPe,
      peg,
      pBook,
      pSales,
      fcfYieldPct,
      evEbitda,
      buybackMandateYieldPct,
      buybackBoostPct,
      epsLtmSek,
      forwardEpsLtmSek,
      fcfPsLtmSek,
      enterpriseValueEurM,
      ebitdaLtmEurM,
      marketCapEurM,
      netCashEurM,
      revenueGrowthPct: clampedGrowthPct,
      revLtmEurM,
      sharesOutstandingM,
    },
    meta: {
      latestQuarter: latest ? `${latest.year} ${latest.quarter}` : null,
      ltmQuarters: ltm.map((r) => `${r.year} ${r.quarter}`),
    },
  };
}
