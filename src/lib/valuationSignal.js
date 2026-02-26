import valuationConfig from "@/app/data/valuationConfig.json";

const QUARTER_ORDER = { Q1: 1, Q2: 2, Q3: 3, Q4: 4 };

const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

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
      signal: "unknown",
      penalties: [],
      positives: [],
    };
  }

  const priceSEK = toNumber(currentPriceSEK);
  const fx = toNumber(fxRate);
  const marketCap = toNumber(marketCapSEK);

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

  const weights = config?.scoreWeights || {};
  const weightPe = Number(weights.pe ?? 0.34);
  const weightFcf = Number(weights.fcfYield ?? 0.33);
  const weightEv = Number(weights.evEbitda ?? 0.33);
  const weightSum = Math.max(0.0001, weightPe + weightFcf + weightEv);

  const baseScoreRaw =
    ((Number(peScore ?? 0) * weightPe +
      Number(fcfScore ?? 0) * weightFcf +
      Number(evScore ?? 0) * weightEv) /
      weightSum) || 0;
  const baseScore = Math.round(clamp(baseScoreRaw, 0, 100));

  const penaltiesCfg = config?.penalties || {};
  const penaltyEvents = [
    resolveMarginPenalty(sorted, penaltiesCfg),
    resolveGrowthPenalty(sorted, latest, sameQuarterPrevYear, penaltiesCfg),
    resolveAsiaPenalty(sorted, penaltiesCfg),
  ].filter(Boolean);
  const penaltyPoints = penaltyEvents.reduce((acc, p) => acc + (Number(p.points) || 0), 0);
  const score = Math.round(clamp(baseScore - penaltyPoints, 0, 100));

  const positives = [];
  if (Number.isFinite(pe) && pe <= (peCfg.greenMax ?? 15)) positives.push("P/E is in green zone.");
  if (Number.isFinite(fcfYieldPct) && fcfYieldPct >= (fcfCfg.greenMin ?? 5)) positives.push("FCF yield is strong.");
  if (Number.isFinite(evEbitda) && evEbitda <= (evCfg.greenMax ?? 10)) positives.push("EV/EBITDA is attractive.");

  let signal = "watch";
  if (score >= 75) signal = "strong_buy";
  else if (score >= 60) signal = "accumulate";
  else if (score >= 45) signal = "hold";

  return {
    ok: true,
    score,
    baseScore,
    penaltyPoints,
    signal,
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
      epsLtmSek,
      forwardEpsLtmSek,
      fcfPsLtmSek,
      enterpriseValueEurM,
      ebitdaLtmEurM,
      marketCapEurM,
      netCashEurM,
      revenueGrowthPct: clampedGrowthPct,
      revLtmEurM,
    },
    meta: {
      latestQuarter: latest ? `${latest.year} ${latest.quarter}` : null,
      ltmQuarters: ltm.map((r) => `${r.year} ${r.quarter}`),
    },
  };
}
